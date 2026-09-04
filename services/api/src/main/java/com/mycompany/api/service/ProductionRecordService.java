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
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final SupabaseStorageService storageService;

    // Ảnh phiếu ký URL đọc hết hạn sau 1 giờ — đủ cho 1 phiên xem/review, không cần bền lâu
    // (`toResponse()` luôn ký lại URL mới mỗi lần gọi, không phụ thuộc URL cũ còn hạn hay không).
    private static final int PHOTO_READ_URL_TTL_SECONDS = 3600;

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
    // approve khi không lọc status. scanBatchId (0021-scan-batch-model) — màn review 1 phiên quét cụ
    // thể lọc theo batch, không phải teamId/date range thông thường.
    public Page<ProductionRecordResponse> list(UUID teamId, UUID employeeId, LocalDate fromDate,
            LocalDate toDate, RecordStatus status, UUID scanBatchId, Pageable pageable) {
        Specification<ProductionRecord> spec =
                ProductionRecordSpecifications.withFilters(teamId, employeeId, fromDate, toDate, status, scanBatchId);
        Page<ProductionRecord> page = productionRecordRepository.findAll(spec, pageable);
        // Cache signed URL theo objectPath TRONG PHẠM VI 1 lần gọi list() — phát hiện lúc điều tra Home
        // load chậm (2026-08-25): nhiều dòng CÙNG photoUrl (1 ảnh phiếu → nhiều nhân viên, CLAUDE.md §5)
        // trước đây mỗi dòng tự gọi createSignedReadUrl() RIÊNG (1 HTTP call ký URL tới Supabase Storage
        // mỗi lần) — 1 batch 23 dòng cùng ảnh = 23 lần ký TRÙNG NHAU, chính là nguyên nhân
        // GET /production-records?scanBatchId=... mất 1-3s dù dữ liệu rất ít. Không cache Ở NGOÀI method
        // này (vd field/bean-level) vì URL ký có TTL, cache lâu dài sẽ trả URL hết hạn.
        Map<String, String> signedUrlCache = new HashMap<>();
        return page.map(record -> toResponse(record, signedUrlCache));
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

    // Gọi từ ScanBatchService (0021-scan-batch-model) — tạo draft row từ 1 dòng OCR đã fuzzy-match
    // ra employeeId. Khác createOne(): source=OCR_IMPORT, status=DRAFT (ADR-0006), có photoUrl/
    // ocrCallLog/lowConfidenceFields/scanImage/scanBatch. Validate cùng logic (trùng active/
    // employee/ngày, trùng latexType trong items) — chồng lấn cũng phải chặn ở đây vì unique index
    // không phân biệt nguồn. scanImage nullable — null khi gọi từ code path cũ/test không qua Scan
    // Batch (không nên xảy ra ở luồng thật sau 0021, nhưng giữ linh hoạt).
    @Transactional
    public ProductionRecordResponse createDraftFromOcr(LocalDate recordDate, UUID employeeId, String notes,
            List<LatexItemRequest> items, OcrCallLog ocrCallLog, List<String> lowConfidenceFields,
            ScanImage scanImage, Integer rowIndex, User currentUser) {
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
                .scanImage(scanImage)
                .scanBatch(scanImage != null ? scanImage.getScanBatch() : null)
                .rowIndex(rowIndex)
                .createdBy(currentUser)
                .build();
        addItems(record, items);
        return toResponse(productionRecordRepository.saveAndFlush(record));
    }

    // ---- 0021-scan-batch-model: thao tác cấp batch, gọi từ ScanBatchService ----

    // Batch APPROVE (Spec 1 mục 6 "Điều kiện approve") — bulk-approve mọi DRAFT record thuộc batch.
    // KHÔNG ghi edit_history (cùng lý do approve() đơn lẻ — bước hoàn tất review, không phải "sửa").
    @Transactional
    public int bulkApproveByScanBatch(UUID scanBatchId) {
        List<ProductionRecord> drafts = productionRecordRepository.findByScanBatchIdAndStatus(scanBatchId, RecordStatus.DRAFT);
        drafts.forEach(r -> r.setStatus(RecordStatus.APPROVED));
        productionRecordRepository.saveAll(drafts);
        return drafts.size();
    }

    // RULE 8/CHANGE_DATE (không phải nhánh Supplement) — reparent draft record của 1 ScanImage sang
    // batch đích (merge thẳng), đổi luôn record_date theo effectiveDate mới.
    @Transactional
    public void reparentDraftsForImage(UUID scanImageId, ScanBatch targetBatch, LocalDate newRecordDate) {
        List<ProductionRecord> records = productionRecordRepository.findByScanImageId(scanImageId);
        for (ProductionRecord r : records) {
            if (r.getStatus() != RecordStatus.DRAFT) {
                continue;
            }
            r.setScanBatch(targetBatch);
            r.setTeam(targetBatch.getTeam());
            r.setRecordDate(newRecordDate);
        }
        productionRecordRepository.saveAll(records);
    }

    // RULE 9/PENDING_MOVE — COPY (không move) draft record của 1 ScanImage sang Supplement batch;
    // record GỐC giữ nguyên ở source (loại khỏi tính toán qua ImageStatus=PENDING_MOVE, không phải
    // qua RecordStatus — xem ScanBatchService).
    @Transactional
    public void copyDraftsForImage(UUID scanImageId, ScanImage targetImage, ScanBatch targetSupplement, LocalDate newRecordDate) {
        List<ProductionRecord> sourceRecords = productionRecordRepository.findByScanImageId(scanImageId);
        List<ProductionRecord> copies = new ArrayList<>();
        for (ProductionRecord src : sourceRecords) {
            if (src.getStatus() != RecordStatus.DRAFT) {
                continue;
            }
            ProductionRecord copy = ProductionRecord.builder()
                    .recordDate(newRecordDate)
                    .employee(src.getEmployee())
                    .team(targetSupplement.getTeam())
                    .notes(src.getNotes())
                    .source(src.getSource())
                    .status(RecordStatus.DRAFT)
                    .photoUrl(src.getPhotoUrl())
                    .ocrCallLog(src.getOcrCallLog())
                    .lowConfidenceFields(src.getLowConfidenceFields())
                    .scanImage(targetImage)
                    .scanBatch(targetSupplement)
                    .createdBy(src.getCreatedBy())
                    .build();
            src.getItems().forEach(item -> copy.addItem(ProductionRecordItem.builder()
                    .latexType(item.getLatexType())
                    .kg(item.getKg())
                    .drcPercent(item.getDrcPercent())
                    .build()));
            copies.add(copy);
        }
        productionRecordRepository.saveAll(copies);
    }

    // Khi Supplement approve xong (move hoàn tất) hoặc user discard 1 ảnh lỗi — hủy các DRAFT record
    // còn lại gắn với 1 ScanImage. Dùng cancel() để đi qua đúng guard/edit_history hiện có.
    @Transactional
    public void cancelDraftsForImage(UUID scanImageId, User currentUser) {
        List<ProductionRecord> records = productionRecordRepository.findByScanImageId(scanImageId);
        for (ProductionRecord r : records) {
            if (r.getStatus() == RecordStatus.DRAFT) {
                cancel(r.getId(), currentUser);
            }
        }
    }

    // draft → approved (ADR-0006, đổi tên từ "confirm" ở 0021-scan-batch-model để nhất quán thuật ngữ
    // với ScanBatch.APPROVED: Admin đã xem/sửa xong, bấm "Lưu"). KHÔNG ghi edit_history — đây là bước
    // hoàn tất review đầu tiên, không phải "sửa" 1 record đã approved từ trước (cùng logic shouldLog
    // ở update()/cancel()).
    @Transactional
    public ProductionRecordResponse approve(UUID id, User currentUser) {
        ProductionRecord record = findOrThrow(id);
        if (record.getStatus() != RecordStatus.DRAFT) {
            throw new ConflictException("Chỉ có thể xác nhận bản ghi đang ở trạng thái draft (hiện tại: "
                    + record.getStatus() + ")");
        }
        record.setStatus(RecordStatus.APPROVED);
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
                .status(RecordStatus.APPROVED)
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
        return toResponse(record, new HashMap<>());
    }

    // signedUrlCache: dùng chung giữa nhiều record trong CÙNG 1 lần gọi list() — nhiều dòng có thể trỏ
    // cùng 1 photoUrl (1 ảnh phiếu → nhiều nhân viên, CLAUDE.md §5), tránh ký URL trùng lặp nhiều lần
    // (xem ghi chú ở list()). Không cache ngoài phạm vi 1 request vì URL ký có TTL.
    private ProductionRecordResponse toResponse(ProductionRecord record, Map<String, String> signedUrlCache) {
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
                signedUrlCache.computeIfAbsent(
                        record.getPhotoUrl(), path -> storageService.createSignedReadUrl(path, PHOTO_READ_URL_TTL_SECONDS)),
                record.getOcrCallLog() == null ? null : record.getOcrCallLog().getId(),
                record.getLowConfidenceFields(),
                record.getCreatedBy().getId(),
                record.getCreatedAt(),
                record.getStatus().name(),
                items,
                record.getScanImage() == null ? null : record.getScanImage().getId(),
                record.getRowIndex(),
                record.getScanBatch() == null ? null : record.getScanBatch().getId());
    }
}
