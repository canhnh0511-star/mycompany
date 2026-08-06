package com.mycompany.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.BatchResult.BatchItemResult;
import com.mycompany.api.dto.CreateProductionRecordRequest;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.dto.LatexItemResponse;
import com.mycompany.api.dto.ProductionRecordResponse;
import com.mycompany.api.dto.UpdateProductionRecordRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.ProductionRecordItem;
import com.mycompany.api.entity.RecordSource;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sản lượng CÁ NHÂN theo ngày. Nhập tay (batch, ADR-0007) ghi thẳng source=manual, status=confirmed
 * — draft chỉ dành cho luồng OCR (ADR-0006, Phase 3). "Xóa" = chuyển status → cancelled, không hard
 * delete (CLAUDE.md §4); cancel giải phóng lại slot (record_date, employee_id) cho lần nhập lại sau.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ProductionRecordService {

    private final ProductionRecordRepository productionRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final EditHistoryService editHistoryService;
    private final BatchRowValidator batchRowValidator;
    private final RequiresNewTransactionRunner transactionRunner;
    private final ObjectMapper objectMapper;

    private static final String TABLE_NAME = "production_records";

    // Không @Transactional ở mức method này — mỗi dòng chạy trong transaction RIÊNG (REQUIRES_NEW,
    // xem RequiresNewTransactionRunner) để đúng tinh thần best-effort: 1 dòng lỗi không rollback các
    // dòng khác đã lưu thành công trong cùng request.
    public BatchResult<ProductionRecordResponse> createBatch(List<CreateProductionRecordRequest> requests, User currentUser) {
        List<BatchItemResult<ProductionRecordResponse>> results = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            int index = i;
            CreateProductionRecordRequest request = requests.get(i);
            try {
                ProductionRecordResponse created = transactionRunner.run(() -> createOne(request, currentUser));
                results.add(BatchItemResult.ok(index, created));
            } catch (RuntimeException ex) {
                results.add(BatchItemResult.failed(index, resolveErrorMessage(ex)));
            }
        }
        return new BatchResult<>(results);
    }

    public ProductionRecordResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // GET list + filter (docs/TASKS.md Phase 4, tab "Tra cứu" — CLAUDE.md §5) — bao gồm cả draft chưa
    // confirm khi không lọc status.
    public Page<ProductionRecordResponse> list(UUID teamId, UUID employeeId, LocalDate fromDate,
            LocalDate toDate, RecordStatus status, Pageable pageable) {
        Specification<ProductionRecord> spec =
                ProductionRecordSpecifications.withFilters(teamId, employeeId, fromDate, toDate, status);
        return productionRecordRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public ProductionRecordResponse update(UUID id, UpdateProductionRecordRequest request, User currentUser) {
        ProductionRecord record = findOrThrow(id);
        if (record.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy — không thể sửa");
        }
        boolean shouldLog = record.getStatus() != RecordStatus.DRAFT;
        ProductionRecordResponse before = shouldLog ? toResponse(record) : null;

        Employee employee = findEmployeeOrThrow(request.employeeId());
        if (!employee.getId().equals(record.getEmployee().getId()) || !request.recordDate().equals(record.getRecordDate())) {
            checkNoActiveDuplicate(employee.getId(), request.recordDate(), id);
        }
        record.setRecordDate(request.recordDate());
        record.setEmployee(employee);
        record.setTeam(employee.getTeam());
        record.setNotes(request.notes());
        replaceItems(record, request.items());

        ProductionRecordResponse after = toResponse(productionRecordRepository.save(record));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    @Transactional
    public ProductionRecordResponse cancel(UUID id, User currentUser) {
        ProductionRecord record = findOrThrow(id);
        if (record.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy trước đó");
        }
        boolean shouldLog = record.getStatus() != RecordStatus.DRAFT;
        ProductionRecordResponse before = shouldLog ? toResponse(record) : null;

        record.setStatus(RecordStatus.CANCELLED);
        ProductionRecordResponse after = toResponse(productionRecordRepository.save(record));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    // Gọi từ OcrCaptureService (Phase 3, cùng package) — tạo draft row từ 1 dòng OCR đã fuzzy-match
    // ra employeeId. Khác createOne(): source=OCR_IMPORT, status=DRAFT (ADR-0006), có photoUrl/
    // ocrCallLog/lowConfidenceFields. Validate cùng logic (trùng active/employee/ngày, trùng
    // latexType trong items) — chồng lấn cũng phải chặn ở đây vì unique index không phân biệt nguồn.
    @Transactional
    public ProductionRecordResponse createDraftFromOcr(LocalDate recordDate, UUID employeeId, String notes,
            List<LatexItemRequest> items, OcrCallLog ocrCallLog, List<String> lowConfidenceFields, User currentUser) {
        Employee employee = findEmployeeOrThrow(employeeId);
        checkNoActiveDuplicate(employee.getId(), recordDate, null);

        ProductionRecord record = ProductionRecord.builder()
                .recordDate(recordDate)
                .employee(employee)
                .team(employee.getTeam())
                .notes(notes)
                .source(RecordSource.OCR_IMPORT)
                .status(RecordStatus.DRAFT)
                .photoUrl(ocrCallLog.getPhotoUrl())
                .ocrCallLog(ocrCallLog)
                .lowConfidenceFields(writeLowConfidenceFieldsOrNull(lowConfidenceFields))
                .createdBy(currentUser)
                .build();
        addItems(record, items);
        return toResponse(productionRecordRepository.saveAndFlush(record));
    }

    // draft → confirmed (ADR-0006: Admin đã xem/sửa xong, bấm "Lưu"). KHÔNG ghi edit_history —
    // đây là bước hoàn tất review đầu tiên, không phải "sửa" 1 record đã confirmed từ trước
    // (docs/TASKS.md Phase 2, cùng logic shouldLog ở update()/cancel()).
    @Transactional
    public ProductionRecordResponse confirm(UUID id, User currentUser) {
        ProductionRecord record = findOrThrow(id);
        if (record.getStatus() != RecordStatus.DRAFT) {
            throw new ConflictException("Chỉ có thể xác nhận bản ghi đang ở trạng thái draft (hiện tại: "
                    + record.getStatus() + ")");
        }
        record.setStatus(RecordStatus.CONFIRMED);
        return toResponse(productionRecordRepository.save(record));
    }

    private String writeLowConfidenceFieldsOrNull(List<String> fields) {
        if (fields == null || fields.isEmpty()) {
            return null;
        }
        try {
            // Dạng đơn giản {"fields": [...]} — khác ví dụ minh họa chi tiết hơn ở CLAUDE.md §4
            // (có latexTypeId/reason theo từng item) vì tool schema OCR chỉ trả tên trường không
            // chắc chắn ở mức DÒNG, không map tới từng item cụ thể. Vẫn phục vụ đúng mục đích:
            // frontend đọc thẳng từ draft row để highlight (CLAUDE.md §5).
            return objectMapper.writeValueAsString(Map.of("fields", fields));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không serialize được low_confidence_fields", e);
        }
    }

    private ProductionRecordResponse createOne(CreateProductionRecordRequest request, User currentUser) {
        batchRowValidator.validate(request);
        Employee employee = findEmployeeOrThrow(request.employeeId());
        checkNoActiveDuplicate(employee.getId(), request.recordDate(), null);

        ProductionRecord record = ProductionRecord.builder()
                .recordDate(request.recordDate())
                .employee(employee)
                .team(employee.getTeam())
                .notes(request.notes())
                .source(RecordSource.MANUAL)
                .status(RecordStatus.CONFIRMED)
                .createdBy(currentUser)
                .build();
        addItems(record, request.items());
        // saveAndFlush — xem ghi chú trong TeamService.create() về @CreationTimestamp + id sinh client-side.
        return toResponse(productionRecordRepository.saveAndFlush(record));
    }

    private void checkNoActiveDuplicate(UUID employeeId, java.time.LocalDate recordDate, UUID excludeId) {
        boolean duplicate = excludeId == null
                ? productionRecordRepository.existsByEmployeeIdAndRecordDateAndStatusNot(
                        employeeId, recordDate, RecordStatus.CANCELLED)
                : productionRecordRepository.existsByEmployeeIdAndRecordDateAndStatusNotAndIdNot(
                        employeeId, recordDate, RecordStatus.CANCELLED, excludeId);
        if (duplicate) {
            throw new ConflictException("Nhân viên id=" + employeeId + " đã có bản ghi sản lượng active ngày " + recordDate);
        }
    }

    private void addItems(ProductionRecord record, List<LatexItemRequest> items) {
        checkNoDuplicateLatexType(items);
        for (LatexItemRequest itemRequest : items) {
            LatexType latexType = findLatexTypeOrThrow(itemRequest.latexTypeId());
            record.addItem(ProductionRecordItem.builder()
                    .latexType(latexType)
                    .kg(itemRequest.kg())
                    .drcPercent(itemRequest.drcPercent())
                    .build());
        }
    }

    private void replaceItems(ProductionRecord record, List<LatexItemRequest> items) {
        // flush ngay sau clear() — nếu không, Hibernate có thể INSERT item mới (vd cùng latex_type_id
        // với 1 item cũ) TRƯỚC KHI DELETE item cũ trong cùng lần flush cuối transaction, vi phạm tạm
        // thời UNIQUE(production_record_id, latex_type_id) dù kết quả cuối cùng không trùng lặp gì.
        record.getItems().clear();
        productionRecordRepository.saveAndFlush(record);
        addItems(record, items);
    }

    private void checkNoDuplicateLatexType(List<LatexItemRequest> items) {
        long distinctCount = items.stream().map(LatexItemRequest::latexTypeId).distinct().count();
        if (distinctCount != items.size()) {
            throw new InvalidRequestException("items có 2 dòng trùng latexTypeId — mỗi loại mủ chỉ được xuất hiện 1 lần/bản ghi");
        }
    }

    private String resolveErrorMessage(RuntimeException ex) {
        if (ex instanceof ConflictException || ex instanceof InvalidRequestException || ex instanceof NoSuchElementException) {
            return ex.getMessage();
        }
        if (ex instanceof DataIntegrityViolationException) {
            return "Dữ liệu vi phạm ràng buộc (trùng lặp hoặc tham chiếu không hợp lệ)";
        }
        log.warn("Lỗi không mong đợi khi xử lý 1 dòng batch production-records: {}", ex.getMessage(), ex);
        return "Lỗi xử lý dòng này — vui lòng thử lại hoặc liên hệ hỗ trợ";
    }

    private Employee findEmployeeOrThrow(UUID employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với id=" + employeeId));
    }

    private LatexType findLatexTypeOrThrow(UUID latexTypeId) {
        return latexTypeRepository.findById(latexTypeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy loại mủ với id=" + latexTypeId));
    }

    private ProductionRecord findOrThrow(UUID id) {
        return productionRecordRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy production_record với id=" + id));
    }

    private ProductionRecordResponse toResponse(ProductionRecord record) {
        List<LatexItemResponse> items = record.getItems().stream()
                .map(item -> new LatexItemResponse(
                        item.getLatexType().getId(), item.getLatexType().getCode(), item.getKg(), item.getDrcPercent()))
                .toList();
        return new ProductionRecordResponse(
                record.getId(),
                record.getRecordDate(),
                record.getEmployee().getId(),
                record.getEmployee().getFullName(),
                record.getTeam().getId(),
                record.getTeam().getName(),
                record.getNotes(),
                record.getSource().name(),
                record.getPhotoUrl(),
                record.getOcrCallLog() == null ? null : record.getOcrCallLog().getId(),
                record.getLowConfidenceFields(),
                record.getCreatedBy().getId(),
                record.getCreatedAt(),
                record.getStatus().name(),
                items);
    }
}
