package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.mycompany.api.dto.DerivedTeamStatus;
import com.mycompany.api.dto.ProductionSummaryDailyResponse;
import com.mycompany.api.dto.TeamProductionSummary;
import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.OfficialProductionRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import com.mycompany.api.repository.TeamRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Derived Team Status Case A-G (Spec 2 §6, docs/specs/spec-2-san-luong-v2.md) — truth table thuần
 * Mockito, không cần DB (cùng tinh thần BatchStatusRecomputeServiceTest). Case A-G map 1-1 vào
 * BatchStatus đã có sẵn (audit Phase 4, docs/plans/0021...) nên test này chủ yếu là "đối chiếu bảng
 * mapping đúng", không phải phát hiện logic mới.
 */
@ExtendWith(MockitoExtension.class)
class ProductionSummaryServiceTest {

    @Mock private TeamRepository teamRepository;
    @Mock private LatexTypeRepository latexTypeRepository;
    @Mock private ProductionRecordItemRepository productionRecordItemRepository;
    @Mock private ProductionRecordRepository productionRecordRepository;
    @Mock private ScanBatchRepository scanBatchRepository;
    @Mock private ScanBatchCreationService scanBatchCreationService;
    @Mock private ScanImageRepository scanImageRepository;
    @Mock private com.mycompany.api.repository.EmployeeRepository employeeRepository;
    @Mock private SupabaseStorageService storageService;

    private ProductionSummaryService service;
    private Team team;
    private final LocalDate workDate = LocalDate.of(2026, 8, 22);

    @BeforeEach
    void setUp() {
        service = new ProductionSummaryService(teamRepository, latexTypeRepository, productionRecordItemRepository,
                productionRecordRepository, scanBatchRepository, scanBatchCreationService, scanImageRepository,
                employeeRepository, storageService);
        team = Team.builder().id(UUID.randomUUID()).name("Tổ 1").build();
        when(teamRepository.findAll()).thenReturn(List.of(team));
        // lenient — Case A (không có PRIMARY) short-circuit trước khi gọi tới 2 stub này; test riêng
        // (officialKg_*, pendingMoveImage_*) override lại nên không phải mọi test đều "dùng" default ở đây.
        lenient().when(productionRecordItemRepository.aggregateOfficialProduction(eq(workDate), any(), any()))
                .thenReturn(List.of());
        // Không có ảnh PENDING_MOVE ở các test case status cơ bản (test riêng cho pendingMoveInfo bên dưới).
        lenient().when(scanImageRepository.findByScanBatchIdAndStatus(any(), eq(ImageStatus.PENDING_MOVE)))
                .thenReturn(List.of());
    }

    @Test
    void noPrimary_caseA_noData() {
        when(scanBatchCreationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId()))
                .thenReturn(Optional.empty());

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.NO_DATA);
        assertThat(summary.primaryBatchId()).isNull();
    }

    @Test
    void noPrimary_butHasManualData_treatedAsApproved_notNoData() {
        // Bug thật phát hiện khi test trên thiết bị (2026-08-24): nhập tay (RecordSource.MANUAL,
        // ADR-0007) không đi qua Scan Session nên KHÔNG có ScanBatch — trước fix, Tổ chỉ có dữ liệu
        // nhập tay bị báo sai "Chưa có dữ liệu" dù officialKg > 0.
        when(scanBatchCreationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId()))
                .thenReturn(Optional.empty());
        UUID employeeId = UUID.randomUUID();
        when(productionRecordItemRepository.aggregateOfficialProduction(eq(workDate), any(), any())).thenReturn(List.of(
                new OfficialProductionRow(team.getId(), team.getName(), employeeId, "water", new BigDecimal("55.00"))));

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED);
        assertThat(summary.officialKg()).isEqualByComparingTo("55.00");
        assertThat(summary.primaryBatchId()).isNull();
        assertThat(summary.activeSupplementInfo()).isNull();
    }

    @Test
    void primaryUploading_caseB_processing() {
        givenPrimary(BatchStatus.UPLOADING);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.PROCESSING);
    }

    @Test
    void primaryProcessing_caseB_processing() {
        givenPrimary(BatchStatus.PROCESSING);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.PROCESSING);
    }

    @Test
    void primaryNeedReview_caseC_needsReview() {
        givenPrimary(BatchStatus.NEED_REVIEW);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.NEEDS_REVIEW);
    }

    @Test
    void primaryPartialFailed_caseC_needsReview() {
        givenPrimary(BatchStatus.PARTIAL_FAILED);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.NEEDS_REVIEW);
    }

    @Test
    void primaryReadyToApprove_caseD() {
        givenPrimary(BatchStatus.READY_TO_APPROVE);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.READY_TO_APPROVE);
    }

    @Test
    void primaryApproved_noActiveSupplement_caseE() {
        ScanBatch primary = givenPrimary(BatchStatus.APPROVED);
        when(scanBatchRepository.findByOriginalBatchIdAndBatchTypeAndStatusIn(eq(primary.getId()), eq(BatchType.SUPPLEMENT), anyList()))
                .thenReturn(Optional.empty());

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED);
        assertThat(summary.activeSupplementInfo()).isNull();
    }

    @Test
    void primaryApproved_withActiveSupplement_caseF() {
        ScanBatch primary = givenPrimary(BatchStatus.APPROVED);
        ScanBatch supplement = ScanBatch.builder().id(UUID.randomUUID()).status(BatchStatus.NEED_REVIEW).build();
        when(scanBatchRepository.findByOriginalBatchIdAndBatchTypeAndStatusIn(eq(primary.getId()), eq(BatchType.SUPPLEMENT), anyList()))
                .thenReturn(Optional.of(supplement));

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED_WITH_ACTIVE_SUPPLEMENT);
        assertThat(summary.activeSupplementInfo()).isNotNull();
        assertThat(summary.activeSupplementInfo().batchId()).isEqualTo(supplement.getId());
    }

    @Test
    void primaryFailed_caseG() {
        givenPrimary(BatchStatus.FAILED);
        assertThat(onlyTeamSummary().derivedStatus()).isEqualTo(DerivedTeamStatus.FAILED);
    }

    // ============================================================= hasPendingIssues (Spec 2 §46 vs §48)

    @Test
    void processingOnly_doesNotSetHasPendingIssues() {
        // Case B (đang tự động xử lý, không cần user act) — KHÔNG được coi là "pending issue" (đối
        // chiếu ví dụ Spec 2 §46: Tổ "Đang xử lý OCR" xuất hiện nhưng KHÔNG có banner cảnh báo).
        givenPrimary(BatchStatus.PROCESSING);
        assertThat(callDaily().hasPendingIssues()).isFalse();
    }

    @Test
    void needReview_setsHasPendingIssues() {
        // Case C — cần user act (đối chiếu ví dụ Spec 2 §48: có banner "⚠ Còn dữ liệu chưa hoàn tất").
        givenPrimary(BatchStatus.NEED_REVIEW);
        assertThat(callDaily().hasPendingIssues()).isTrue();
    }

    @Test
    void noData_doesNotSetHasPendingIssues() {
        when(scanBatchCreationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId()))
                .thenReturn(Optional.empty());
        assertThat(callDaily().hasPendingIssues()).isFalse();
    }

    // ============================================================= officialKg — không double-count

    @Test
    void officialKg_sumsAcrossLatexTypes_perTeam() {
        givenPrimary(BatchStatus.APPROVED);
        when(scanBatchRepository.findByOriginalBatchIdAndBatchTypeAndStatusIn(any(), eq(BatchType.SUPPLEMENT), anyList()))
                .thenReturn(Optional.empty());
        UUID employeeId = UUID.randomUUID();
        when(productionRecordItemRepository.aggregateOfficialProduction(eq(workDate), any(), any())).thenReturn(List.of(
                new OfficialProductionRow(team.getId(), team.getName(), employeeId, "water", new BigDecimal("82.5")),
                new OfficialProductionRow(team.getId(), team.getName(), employeeId, "cup", new BigDecimal("3.2"))));

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.officialKg()).isEqualByComparingTo("85.7");
        assertThat(summary.employeesWithProduction()).isEqualTo(1);
    }

    // ============================================================= pendingMoveInfo (Spec 2 §25)

    @Test
    void pendingMoveImage_reportedButNotCountedInOfficialKg() {
        ScanBatch primary = givenPrimary(BatchStatus.NEED_REVIEW);
        ScanBatch targetBatch = ScanBatch.builder().id(UUID.randomUUID())
                .workDate(LocalDate.of(2026, 8, 21)).build();
        ScanImage pendingImage = ScanImage.builder().id(UUID.randomUUID())
                .status(ImageStatus.PENDING_MOVE).pendingMoveTargetBatchId(targetBatch.getId()).build();
        when(scanImageRepository.findByScanBatchIdAndStatus(primary.getId(), ImageStatus.PENDING_MOVE))
                .thenReturn(List.of(pendingImage));
        when(scanBatchRepository.findById(targetBatch.getId())).thenReturn(Optional.of(targetBatch));

        TeamProductionSummary summary = onlyTeamSummary();
        assertThat(summary.pendingMoveInfo()).hasSize(1);
        assertThat(summary.pendingMoveInfo().get(0).targetWorkDate()).isEqualTo(LocalDate.of(2026, 8, 21));
        assertThat(summary.pendingMoveInfo().get(0).imageCount()).isEqualTo(1);
        // aggregateOfficialProduction mock trả về [] (setUp) — officialKg vẫn 0, ảnh PENDING_MOVE
        // không tự cộng thêm gì (record dưới ảnh này chưa APPROVED, xem javadoc service).
        assertThat(summary.officialKg()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ============================================================= helpers

    private ScanBatch givenPrimary(BatchStatus status) {
        ScanBatch batch = ScanBatch.builder().id(UUID.randomUUID())
                .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team)
                .batchType(BatchType.PRIMARY).status(status).build();
        when(scanBatchCreationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId()))
                .thenReturn(Optional.of(batch));
        return batch;
    }

    private ProductionSummaryDailyResponse callDaily() {
        return service.getDaily(workDate, null, null);
    }

    private TeamProductionSummary onlyTeamSummary() {
        List<TeamProductionSummary> teams = callDaily().teams();
        assertThat(teams).hasSize(1);
        return teams.get(0);
    }
}
