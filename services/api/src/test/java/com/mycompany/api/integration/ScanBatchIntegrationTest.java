package com.mycompany.api.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mycompany.api.dto.ProductionRecordResponse;
import com.mycompany.api.dto.ResolveDateRequest;
import com.mycompany.api.dto.ScanBatchAuditLogResponse;
import com.mycompany.api.dto.ScanBatchResponse;
import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.ConflictStatus;
import com.mycompany.api.entity.ConflictType;
import com.mycompany.api.entity.DateResolution;
import com.mycompany.api.entity.DateVerificationStatus;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.OcrCallLog;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanBatchConflict;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.OcrCallLogRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.ScanBatchAuditLogRepository;
import com.mycompany.api.repository.ScanBatchConflictRepository;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.service.BatchStatusRecomputeService;
import com.mycompany.api.service.ScanBatchConflictService;
import com.mycompany.api.service.ScanBatchCreationService;
import com.mycompany.api.service.ScanBatchService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Case 17-28 (Spec 1 mục 9, 0021-scan-batch-model addendum) — chạy thẳng lên Supabase dev thật, cùng
 * quy ước {@code @Transactional} rollback như {@link TeamIntegrationTest}.
 *
 * <p>Gọi thẳng {@link ScanBatchService}/{@link ScanBatchCreationService} (KHÔNG qua MockMvc/HTTP,
 * KHÔNG qua {@code captureImage()}) — tất cả Case 17-28 đều là logic state machine của
 * batch/image/conflict, không phụ thuộc kết quả OCR thật (không cần ANTHROPIC_API_KEY/gọi Claude
 * Vision/Supabase Storage). Trạng thái "như thể OCR đã chạy xong" (ScanImage.dateVerificationStatus,
 * ScanBatch.status, ScanBatchConflict...) được dựng trực tiếp qua repository — đúng tinh thần
 * {@code processOcr()} nhưng bỏ qua bước gọi mạng ngoài không cần thiết cho test này.
 *
 * <p>Case 19 và 28 (race 2 request đồng thời) KHÔNG nằm ở đây — cần transaction thật độc lập trên 2
 * thread, xem {@link ScanBatchConcurrencyIntegrationTest}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Transactional
class ScanBatchIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private ScanBatchService scanBatchService;
    @Autowired
    private ScanBatchCreationService creationService;
    @Autowired
    private ScanBatchConflictService conflictService;
    @Autowired
    private BatchStatusRecomputeService recomputeService;
    @Autowired
    private ScanBatchRepository scanBatchRepository;
    @Autowired
    private ScanImageRepository scanImageRepository;
    @Autowired
    private ScanBatchConflictRepository scanBatchConflictRepository;
    @Autowired
    private ScanBatchAuditLogRepository scanBatchAuditLogRepository;
    @Autowired
    private OcrCallLogRepository ocrCallLogRepository;
    @Autowired
    private ProductionRecordRepository productionRecordRepository;
    @Autowired
    private com.mycompany.api.service.ProductionRecordService productionRecordService;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private EmployeeRepository employeeRepository;

    private Team team;
    private Employee employee;
    private User admin;

    @BeforeEach
    void setUp() {
        admin = adminUser();
        team = teamRepository.saveAndFlush(Team.builder().name("Tổ ScanBatch Test " + UUID.randomUUID()).build());
        employee = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("NV ScanBatch Test").team(team).status(EmployeeStatus.ACTIVE).build());
    }

    // ============================================================= Case 17

    @Test
    void case17_failedBatch_blocksNewCapture_noAutoMerge() {
        ScanBatch failed = savedBatch(BatchStatus.FAILED, LocalDate.now());

        assertThatThrownBy(() -> creationService.resolveOrCreateBatchForImage(
                OcrTargetType.PRODUCTION_RECORD, failed.getWorkDate(), team.getId(), admin))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("FAILED");

        // Không có batch mới nào được tạo cho key này — vẫn đúng 1 batch (chính nó).
        assertThat(creationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, failed.getWorkDate(), team.getId()))
                .get().extracting(ScanBatch::getId).isEqualTo(failed.getId());
    }

    // ============================================================= Case 18

    @Test
    void case18_cancelFailedBatch_thenNewPrimaryAllowed() {
        ScanBatch failed = savedBatch(BatchStatus.FAILED, LocalDate.now());

        ScanBatchResponse cancelled = scanBatchService.cancelBatch(failed.getId(), admin);
        assertThat(cancelled.status()).isEqualTo("CANCELLED");

        ScanBatch created = creationService.resolveOrCreateBatchForImage(
                OcrTargetType.PRODUCTION_RECORD, failed.getWorkDate(), team.getId(), admin);
        assertThat(created.getId()).isNotEqualTo(failed.getId());
        assertThat(created.getStatus()).isEqualTo(BatchStatus.DRAFT);
    }

    // ============================================================= Case 20 / 21 / 22 / 25 — chung 1 scenario

    @Test
    void case20_changeDateToApprovedTarget_createsPendingMove_notApprovableWhileOutstanding() {
        PendingMoveScenario s = setUpPendingMoveScenario();

        ScanImage reloadedSource = scanImageRepository.findById(s.sourceImage.getId()).orElseThrow();
        assertThat(reloadedSource.getStatus()).isEqualTo(ImageStatus.PENDING_MOVE);
        assertThat(reloadedSource.getPendingMoveTargetBatchId()).isEqualTo(s.supplement.getId());

        // record gốc VẪN Ở LẠI source, còn DRAFT (chưa mất, chưa cancel) — chỉ ảnh đổi trạng thái.
        assertThat(productionRecordRepository.findById(s.sourceRecord.id()).orElseThrow().getStatus())
                .isEqualTo(RecordStatus.DRAFT);
        // đã copy sang supplement, cũng DRAFT (chưa tính official cho tới khi supplement APPROVED).
        assertThat(productionRecordRepository.findByScanBatchIdAndStatus(s.supplement.getId(), RecordStatus.DRAFT))
                .hasSize(1);

        // conflict PENDING_MOVE mở, blocking, đúng trên source batch.
        List<ScanBatchConflict> openConflicts = conflictService.openBlocking(s.sourceBatch.getId());
        assertThat(openConflicts).anySatisfy(c -> assertThat(c.getConflictType()).isEqualTo(ConflictType.PENDING_MOVE));

        assertThat(conflictService.canApprove(s.sourceBatch.getId())).isFalse();
    }

    @Test
    void case21_supplementApproved_completesMove_sourceBecomesApprovable() {
        PendingMoveScenario s = setUpPendingMoveScenario();

        ScanBatchResponse approvedSupplement = scanBatchService.approve(s.supplement.getId(), admin);
        assertThat(approvedSupplement.status()).isEqualTo("APPROVED");

        ScanImage sourceImageAfterMove = scanImageRepository.findById(s.sourceImage.getId()).orElseThrow();
        assertThat(sourceImageAfterMove.getStatus()).isEqualTo(ImageStatus.MOVED);
        assertThat(sourceImageAfterMove.getPendingMoveTargetBatchId()).isNull();

        // record gốc ở source bị hủy (tránh double-count vĩnh viễn) — record copy ở supplement thành APPROVED.
        assertThat(productionRecordRepository.findById(s.sourceRecord.id()).orElseThrow().getStatus())
                .isEqualTo(RecordStatus.CANCELLED);
        assertThat(productionRecordRepository.findByScanBatchIdAndStatus(s.supplement.getId(), RecordStatus.APPROVED))
                .hasSize(1);

        assertThat(conflictService.canApprove(s.sourceBatch.getId())).isTrue();
        ScanBatchResponse sourceApproved = scanBatchService.approve(s.sourceBatch.getId(), admin);
        assertThat(sourceApproved.status()).isEqualTo("APPROVED");
    }

    @Test
    void case22_supplementRejected_revertsToMismatchUnresolved_sourceStillBlocked() {
        PendingMoveScenario s = setUpPendingMoveScenario();

        ScanBatchResponse cancelledSupplement = scanBatchService.cancelBatch(s.supplement.getId(), admin);
        assertThat(cancelledSupplement.status()).isEqualTo("CANCELLED");

        ScanImage revertedImage = scanImageRepository.findById(s.sourceImage.getId()).orElseThrow();
        assertThat(revertedImage.getStatus()).isEqualTo(ImageStatus.ACTIVE);
        assertThat(revertedImage.getPendingMoveTargetBatchId()).isNull();
        // RULE 15 — khôi phục MISMATCH/UNRESOLVED, KHÔNG giữ CHANGE_DATE cũ.
        assertThat(revertedImage.getDateVerificationStatus()).isEqualTo(DateVerificationStatus.MISMATCH);
        assertThat(revertedImage.getDateResolution()).isEqualTo(DateResolution.UNRESOLVED);

        // record gốc tính lại vào source (không bị cancel oan) — nhưng batch vẫn bị block approve vì
        // MISMATCH mới mở lại chưa resolve.
        assertThat(productionRecordRepository.findById(s.sourceRecord.id()).orElseThrow().getStatus())
                .isEqualTo(RecordStatus.DRAFT);
        assertThatThrownBy(() -> scanBatchService.approve(s.sourceBatch.getId(), admin))
                .isInstanceOf(ConflictException.class);

        // Không tái dùng conflict PENDING_MOVE cũ (đã RESOLVED) — 1 DATE_MISMATCH MỚI phải đang OPEN.
        assertThat(scanBatchConflictRepository.findByScanImageIdAndStatus(s.sourceImage.getId(), ConflictStatus.OPEN))
                .anySatisfy(c -> assertThat(c.getConflictType()).isEqualTo(ConflictType.DATE_MISMATCH));
    }

    @Test
    void case25_sourceApprove_rejectedWhileSupplementStillOutstanding() {
        PendingMoveScenario s = setUpPendingMoveScenario();
        // Supplement vẫn NEED_REVIEW/READY_TO_APPROVE (chưa approve/cancel) — tương ứng "vẫn đang xử lý".

        assertThatThrownBy(() -> scanBatchService.approve(s.sourceBatch.getId(), admin))
                .isInstanceOf(ConflictException.class);
    }

    private record PendingMoveScenario(
            ScanBatch sourceBatch, ScanImage sourceImage, ScanBatch targetPrimary, ScanBatch supplement,
            ProductionRecordResponse sourceRecord) {
    }

    private PendingMoveScenario setUpPendingMoveScenario() {
        LocalDate targetDate = LocalDate.now().minusDays(1);
        ScanBatch targetPrimary = savedBatch(BatchStatus.APPROVED, targetDate);

        LocalDate sessionDate = LocalDate.now();
        ScanBatch sourceBatch = savedBatch(BatchStatus.NEED_REVIEW, sessionDate);
        OcrCallLog callLog = savedOcrCallLog();
        ScanImage sourceImage = savedImage(sourceBatch, ImageStatus.ACTIVE, DateVerificationStatus.MISMATCH,
                DateResolution.UNRESOLVED, targetDate, sessionDate, callLog);
        savedConflict(sourceBatch, sourceImage, ConflictType.DATE_MISMATCH, true);

        ProductionRecordResponse sourceRecord = productionRecordService.createDraftFromOcr(
                sessionDate, employee.getId(), null, List.of(), callLog, List.of(), sourceImage, admin);

        scanBatchService.resolveDate(sourceImage.getId(), new ResolveDateRequest(DateResolution.CHANGE_DATE), admin);

        ScanImage reloaded = scanImageRepository.findById(sourceImage.getId()).orElseThrow();
        ScanBatch supplement = scanBatchRepository.findById(reloaded.getPendingMoveTargetBatchId()).orElseThrow();
        return new PendingMoveScenario(sourceBatch, sourceImage, targetPrimary, supplement, sourceRecord);
    }

    // ============================================================= Case 23

    @Test
    void case23_notDetectedDate_doesNotBlockApprove_auditMarkedSystem() {
        ScanBatch batch = savedBatch(BatchStatus.NEED_REVIEW, LocalDate.now());
        OcrCallLog callLog = savedOcrCallLog();
        ScanImage image = savedImage(batch, ImageStatus.ACTIVE, DateVerificationStatus.NOT_DETECTED,
                DateResolution.FALLBACK_SESSION_DATE, null, batch.getWorkDate(), callLog);
        scanBatchAuditLogRepository.save(com.mycompany.api.entity.ScanBatchAuditLog.builder()
                .scanBatch(batch).scanImage(image).action("DATE_RESOLVED_FALLBACK_SESSION_DATE")
                .performedBySystem(true).build());

        // NOT_DETECTED không tự tạo conflict blocking nào — batch phải recompute được READY_TO_APPROVE.
        assertThat(recomputeService.recompute(batch.getId())).isEqualTo(BatchStatus.READY_TO_APPROVE);
        assertThat(conflictService.canApprove(batch.getId())).isTrue();

        ScanBatchResponse approved = scanBatchService.approve(batch.getId(), admin);
        assertThat(approved.status()).isEqualTo("APPROVED");

        List<ScanBatchAuditLogResponse> auditDtos = scanBatchService.auditLog(batch.getId());
        assertThat(auditDtos).anySatisfy(a -> {
            assertThat(a.action()).isEqualTo("DATE_RESOLVED_FALLBACK_SESSION_DATE");
            assertThat(a.performedBy()).isEqualTo("SYSTEM"); // literal — xem ScanBatchAuditLog javadoc
        });
    }

    // ============================================================= Case 24

    @Test
    void case24_addingImageToReadyBatch_recomputesImmediately_blocksApproveUntilProcessed() {
        ScanBatch batch = savedBatch(BatchStatus.DRAFT, LocalDate.now());
        savedImage(batch, ImageStatus.ACTIVE, DateVerificationStatus.MATCHED, null, batch.getWorkDate(), batch.getWorkDate(),
                savedOcrCallLog());
        assertThat(recomputeService.recompute(batch.getId())).isEqualTo(BatchStatus.READY_TO_APPROVE);

        // "Chụp bổ sung" — ảnh mới đang PROCESSING (mô phỏng captureImage() vừa tạo ScanImage, OCR
        // chưa xong).
        scanImageRepository.saveAndFlush(ScanImage.builder()
                .scanBatch(batch).storagePath("test/extra-" + UUID.randomUUID() + ".jpg")
                .clientImageId(UUID.randomUUID().toString()).status(ImageStatus.PROCESSING).uploadedBy(admin).build());

        assertThat(recomputeService.recompute(batch.getId())).isEqualTo(BatchStatus.PROCESSING);
        assertThatThrownBy(() -> scanBatchService.approve(batch.getId(), admin)).isInstanceOf(ConflictException.class);

        // canApprove ở response cũng phải false trong lúc PROCESSING — không chỉ approve() throw.
        assertThat(scanBatchService.get(batch.getId()).canApprove()).isFalse();
    }

    // ============================================================= Case 26 / 27

    @Test
    void case26_supplementStillActive_reusedNotDuplicated() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, LocalDate.now());

        ScanBatch first = creationService.resolveOrCreateSupplement(primary.getId(), admin);
        ScanBatch second = creationService.resolveOrCreateSupplement(primary.getId(), admin);

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(scanBatchRepository.findByOriginalBatchIdAndBatchType(primary.getId(), BatchType.SUPPLEMENT))
                .hasSize(1);
    }

    @Test
    void case27_supplementAlreadyTerminal_createsNewOne_notReused() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, LocalDate.now());
        ScanBatch first = creationService.resolveOrCreateSupplement(primary.getId(), admin);
        first.setStatus(BatchStatus.APPROVED); // giả lập supplement lần trước đã xong (terminal)
        scanBatchRepository.saveAndFlush(first);

        ScanBatch second = creationService.resolveOrCreateSupplement(primary.getId(), admin);

        assertThat(second.getId()).isNotEqualTo(first.getId());
        assertThat(scanBatchRepository.findByOriginalBatchIdAndBatchType(primary.getId(), BatchType.SUPPLEMENT))
                .hasSize(2);
    }

    // ============================================================= fixtures

    private ScanBatch savedBatch(BatchStatus status, LocalDate workDate) {
        return scanBatchRepository.saveAndFlush(ScanBatch.builder()
                .documentType(OcrTargetType.PRODUCTION_RECORD)
                .workDate(workDate)
                .team(team)
                .batchType(BatchType.PRIMARY)
                .status(status)
                .createdBy(admin)
                .build());
    }

    private ScanImage savedImage(ScanBatch batch, ImageStatus status, DateVerificationStatus dvs, DateResolution dr,
            LocalDate ocrDate, LocalDate effectiveDate, OcrCallLog callLog) {
        return scanImageRepository.saveAndFlush(ScanImage.builder()
                .scanBatch(batch)
                .storagePath("test/photo-" + UUID.randomUUID() + ".jpg")
                .clientImageId(UUID.randomUUID().toString())
                .status(status)
                .ocrCallLog(callLog)
                .dateVerificationStatus(dvs)
                .dateResolution(dr)
                .ocrDetectedDate(ocrDate)
                .effectiveWorkDate(effectiveDate)
                .uploadedBy(admin)
                .build());
    }

    private ScanBatchConflict savedConflict(ScanBatch batch, ScanImage image, ConflictType type, boolean blocking) {
        return scanBatchConflictRepository.saveAndFlush(ScanBatchConflict.builder()
                .scanBatch(batch).scanImage(image).conflictType(type).blocking(blocking)
                .status(ConflictStatus.OPEN).build());
    }

    private OcrCallLog savedOcrCallLog() {
        return ocrCallLogRepository.saveAndFlush(OcrCallLog.builder()
                .calledBy(admin)
                .targetType(OcrTargetType.PRODUCTION_RECORD)
                .photoUrl("test/photo-" + UUID.randomUUID() + ".jpg")
                .model("claude-sonnet-5")
                .durationMs(100)
                .success(true)
                .typeMismatch(false)
                .build());
    }
}
