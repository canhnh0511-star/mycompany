package com.mycompany.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.BatchResult.BatchItemResult;
import com.mycompany.api.dto.CreateLatexSaleRequest;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.dto.LatexItemResponse;
import com.mycompany.api.dto.LatexSaleResponse;
import com.mycompany.api.dto.UpdateLatexSaleRequest;
import com.mycompany.api.entity.LatexSale;
import com.mycompany.api.entity.LatexSaleItem;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.LatexSaleRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.TeamRepository;
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
 * Bán mủ theo TỔ cho người mua ngoài — khác luồng sản lượng cá nhân, không có employee_id (CLAUDE.md
 * §4). Không có ràng buộc unique theo (team, ngày) — 1 Tổ có thể bán mủ nhiều lần/ngày. Nhập tay
 * (batch, ADR-0007) ghi thẳng status=confirmed — draft chỉ dành cho luồng OCR (ADR-0006, Phase 3).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class LatexSaleService {

    private final LatexSaleRepository latexSaleRepository;
    private final TeamRepository teamRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final EditHistoryService editHistoryService;
    private final BatchRowValidator batchRowValidator;
    private final RequiresNewTransactionRunner transactionRunner;
    private final ObjectMapper objectMapper;
    private final SupabaseStorageService storageService;

    private static final String TABLE_NAME = "latex_sales";
    // Ảnh phiếu ký URL đọc hết hạn sau 1 giờ — xem ghi chú tương ứng ở ProductionRecordService.
    private static final int PHOTO_READ_URL_TTL_SECONDS = 3600;

    // Không @Transactional ở mức method này — xem ghi chú tương ứng trong ProductionRecordService.
    public BatchResult<LatexSaleResponse> createBatch(List<CreateLatexSaleRequest> requests, User currentUser) {
        List<BatchItemResult<LatexSaleResponse>> results = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            int index = i;
            CreateLatexSaleRequest request = requests.get(i);
            try {
                LatexSaleResponse created = transactionRunner.run(() -> createOne(request, currentUser));
                results.add(BatchItemResult.ok(index, created));
            } catch (RuntimeException ex) {
                results.add(BatchItemResult.failed(index, resolveErrorMessage(ex)));
            }
        }
        return new BatchResult<>(results);
    }

    public LatexSaleResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // GET list + filter (docs/TASKS.md Phase 4) — bao gồm cả draft chưa confirm khi không lọc status.
    // scanBatchId (0021-scan-batch-model) — màn review 1 phiên quét cụ thể (ScanBatchController).
    public Page<LatexSaleResponse> list(UUID teamId, LocalDate fromDate, LocalDate toDate,
            RecordStatus status, UUID scanBatchId, Pageable pageable) {
        Specification<LatexSale> spec =
                LatexSaleSpecifications.withFilters(teamId, fromDate, toDate, status, scanBatchId);
        Page<LatexSale> page = latexSaleRepository.findAll(spec, pageable);
        // Cache signed URL theo objectPath trong phạm vi 1 lần gọi list() — cùng lý do đã sửa ở
        // ProductionRecordService.list() (2026-08-25, điều tra Home load chậm): nhiều dòng cùng photoUrl
        // trước đây ký URL trùng lặp N lần, gây chậm GET /latex-sales?scanBatchId=...
        Map<String, String> signedUrlCache = new HashMap<>();
        return page.map(sale -> toResponse(sale, signedUrlCache));
    }

    @Transactional
    public LatexSaleResponse update(UUID id, UpdateLatexSaleRequest request, User currentUser) {
        LatexSale sale = findOrThrow(id);
        if (sale.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy — không thể sửa");
        }
        boolean shouldLog = sale.getStatus() != RecordStatus.DRAFT;
        LatexSaleResponse before = shouldLog ? toResponse(sale) : null;

        Team team = findTeamOrThrow(request.teamId());
        sale.setRecordDate(request.recordDate());
        sale.setTeam(team);
        sale.setBuyerName(request.buyerName());
        sale.setSellerSignedBy(request.sellerSignedBy());
        sale.setNotes(request.notes());
        replaceItems(sale, request.items());

        LatexSaleResponse after = toResponse(latexSaleRepository.save(sale));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    @Transactional
    public LatexSaleResponse cancel(UUID id, User currentUser) {
        LatexSale sale = findOrThrow(id);
        if (sale.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy trước đó");
        }
        boolean shouldLog = sale.getStatus() != RecordStatus.DRAFT;
        LatexSaleResponse before = shouldLog ? toResponse(sale) : null;

        sale.setStatus(RecordStatus.CANCELLED);
        LatexSaleResponse after = toResponse(latexSaleRepository.save(sale));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    // Gọi từ ScanBatchService (0021-scan-batch-model) — tạo draft từ dữ liệu OCR đọc được (không
    // cần fuzzy-match vì latex_sales không có employee_id, chỉ ghi seller_signed_by dạng text).
    @Transactional
    public LatexSaleResponse createDraftFromOcr(LocalDate recordDate, Team team, String buyerName,
            String sellerSignedBy, String notes, List<LatexItemRequest> items, OcrCallLog ocrCallLog,
            List<String> lowConfidenceFields, ScanImage scanImage, User currentUser) {
        LatexSale sale = LatexSale.builder()
                .recordDate(recordDate)
                .team(team)
                .buyerName(buyerName)
                .sellerSignedBy(sellerSignedBy)
                .notes(notes)
                .status(RecordStatus.DRAFT)
                .photoUrl(ocrCallLog.getPhotoUrl())
                .ocrCallLog(ocrCallLog)
                .lowConfidenceFields(writeLowConfidenceFieldsOrNull(lowConfidenceFields))
                .scanImage(scanImage)
                .scanBatch(scanImage != null ? scanImage.getScanBatch() : null)
                .createdBy(currentUser)
                .build();
        addItems(sale, items);
        return toResponse(latexSaleRepository.saveAndFlush(sale));
    }

    // ---- 0021-scan-batch-model: thao tác cấp batch, gọi từ ScanBatchService — xem ghi chú tương
    // ứng trong ProductionRecordService ----

    @Transactional
    public int bulkApproveByScanBatch(UUID scanBatchId) {
        List<LatexSale> drafts = latexSaleRepository.findByScanBatchIdAndStatus(scanBatchId, RecordStatus.DRAFT);
        drafts.forEach(s -> s.setStatus(RecordStatus.APPROVED));
        latexSaleRepository.saveAll(drafts);
        return drafts.size();
    }

    @Transactional
    public void reparentDraftsForImage(UUID scanImageId, ScanBatch targetBatch, LocalDate newRecordDate) {
        List<LatexSale> sales = latexSaleRepository.findByScanImageId(scanImageId);
        for (LatexSale s : sales) {
            if (s.getStatus() != RecordStatus.DRAFT) {
                continue;
            }
            s.setScanBatch(targetBatch);
            s.setTeam(targetBatch.getTeam());
            s.setRecordDate(newRecordDate);
        }
        latexSaleRepository.saveAll(sales);
    }

    @Transactional
    public void copyDraftsForImage(UUID scanImageId, ScanImage targetImage, ScanBatch targetSupplement, LocalDate newRecordDate) {
        List<LatexSale> sourceSales = latexSaleRepository.findByScanImageId(scanImageId);
        List<LatexSale> copies = new ArrayList<>();
        for (LatexSale src : sourceSales) {
            if (src.getStatus() != RecordStatus.DRAFT) {
                continue;
            }
            LatexSale copy = LatexSale.builder()
                    .recordDate(newRecordDate)
                    .team(targetSupplement.getTeam())
                    .buyerName(src.getBuyerName())
                    .sellerSignedBy(src.getSellerSignedBy())
                    .notes(src.getNotes())
                    .status(RecordStatus.DRAFT)
                    .photoUrl(src.getPhotoUrl())
                    .ocrCallLog(src.getOcrCallLog())
                    .lowConfidenceFields(src.getLowConfidenceFields())
                    .scanImage(targetImage)
                    .scanBatch(targetSupplement)
                    .createdBy(src.getCreatedBy())
                    .build();
            src.getItems().forEach(item -> copy.addItem(LatexSaleItem.builder()
                    .latexType(item.getLatexType())
                    .kg(item.getKg())
                    .drcPercent(item.getDrcPercent())
                    .build()));
            copies.add(copy);
        }
        latexSaleRepository.saveAll(copies);
    }

    @Transactional
    public void cancelDraftsForImage(UUID scanImageId, User currentUser) {
        List<LatexSale> sales = latexSaleRepository.findByScanImageId(scanImageId);
        for (LatexSale s : sales) {
            if (s.getStatus() == RecordStatus.DRAFT) {
                cancel(s.getId(), currentUser);
            }
        }
    }

    // draft → approved — xem ghi chú tương ứng trong ProductionRecordService.approve().
    @Transactional
    public LatexSaleResponse approve(UUID id, User currentUser) {
        LatexSale sale = findOrThrow(id);
        if (sale.getStatus() != RecordStatus.DRAFT) {
            throw new ConflictException("Chỉ có thể xác nhận bản ghi đang ở trạng thái draft (hiện tại: "
                    + sale.getStatus() + ")");
        }
        sale.setStatus(RecordStatus.APPROVED);
        return toResponse(latexSaleRepository.save(sale));
    }

    private String writeLowConfidenceFieldsOrNull(List<String> fields) {
        if (fields == null || fields.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(Map.of("fields", fields));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không serialize được low_confidence_fields", e);
        }
    }

    private LatexSaleResponse createOne(CreateLatexSaleRequest request, User currentUser) {
        batchRowValidator.validate(request);
        Team team = findTeamOrThrow(request.teamId());

        LatexSale sale = LatexSale.builder()
                .recordDate(request.recordDate())
                .team(team)
                .buyerName(request.buyerName())
                .sellerSignedBy(request.sellerSignedBy())
                .notes(request.notes())
                .status(RecordStatus.APPROVED)
                .createdBy(currentUser)
                .build();
        addItems(sale, request.items());
        // saveAndFlush — xem ghi chú trong TeamService.create() về @CreationTimestamp + id sinh client-side.
        return toResponse(latexSaleRepository.saveAndFlush(sale));
    }

    private void addItems(LatexSale sale, List<LatexItemRequest> items) {
        checkNoDuplicateLatexType(items);
        for (LatexItemRequest itemRequest : items) {
            LatexType latexType = findLatexTypeOrThrow(itemRequest.latexTypeId());
            sale.addItem(LatexSaleItem.builder()
                    .latexType(latexType)
                    .kg(itemRequest.kg())
                    .drcPercent(itemRequest.drcPercent())
                    .build());
        }
    }

    private void replaceItems(LatexSale sale, List<LatexItemRequest> items) {
        // flush ngay sau clear() — xem ghi chú tương ứng trong ProductionRecordService.replaceItems.
        sale.getItems().clear();
        latexSaleRepository.saveAndFlush(sale);
        addItems(sale, items);
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
        log.warn("Lỗi không mong đợi khi xử lý 1 dòng batch latex-sales: {}", ex.getMessage(), ex);
        return "Lỗi xử lý dòng này — vui lòng thử lại hoặc liên hệ hỗ trợ";
    }

    private Team findTeamOrThrow(UUID teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId));
    }

    private LatexType findLatexTypeOrThrow(UUID latexTypeId) {
        return latexTypeRepository.findById(latexTypeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy loại mủ với id=" + latexTypeId));
    }

    private LatexSale findOrThrow(UUID id) {
        return latexSaleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy latex_sale với id=" + id));
    }

    private LatexSaleResponse toResponse(LatexSale sale) {
        return toResponse(sale, new HashMap<>());
    }

    // signedUrlCache: dùng chung giữa nhiều sale trong CÙNG 1 lần gọi list() — xem ghi chú ở list().
    private LatexSaleResponse toResponse(LatexSale sale, Map<String, String> signedUrlCache) {
        List<LatexItemResponse> items = sale.getItems().stream()
                .map(item -> new LatexItemResponse(
                        item.getLatexType().getId(), item.getLatexType().getCode(), item.getKg(), item.getDrcPercent()))
                .toList();
        return new LatexSaleResponse(
                sale.getId(),
                sale.getRecordDate(),
                sale.getTeam().getId(),
                sale.getTeam().getName(),
                sale.getBuyerName(),
                sale.getSellerSignedBy(),
                sale.getNotes(),
                signedUrlCache.computeIfAbsent(
                        sale.getPhotoUrl(), path -> storageService.createSignedReadUrl(path, PHOTO_READ_URL_TTL_SECONDS)),
                sale.getOcrCallLog() == null ? null : sale.getOcrCallLog().getId(),
                sale.getLowConfidenceFields(),
                sale.getCreatedBy().getId(),
                sale.getCreatedAt(),
                sale.getStatus().name(),
                items);
    }
}
