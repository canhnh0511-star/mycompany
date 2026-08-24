package com.mycompany.api.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.mycompany.api.dto.DerivedTeamStatus;
import com.mycompany.api.dto.ProductionSummaryDailyResponse;
import com.mycompany.api.dto.TeamBreakdownResponse;
import com.mycompany.api.dto.TeamProductionSummary;
import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.ProductionRecordItem;
import com.mycompany.api.entity.RecordSource;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.service.ProductionSummaryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * PROD-01..17 (Spec 2 mục 51, docs/specs/spec-2-san-luong-v2.md) — chạy lên Supabase dev thật, cùng
 * quy ước {@code @Transactional} rollback như {@link ScanBatchIntegrationTest}. Dựng state trực tiếp
 * qua repository (KHÔNG qua OCR/service action) — chỉ {@link ProductionSummaryService} là code dưới
 * test, phần state machine batch/record đã có test riêng (ScanBatchIntegrationTest Case 17-28).
 * PROD-18 không áp dụng nữa — audit Phase 4 xác nhận business ĐÃ cho phép cộng trực tiếp kg (xem
 * javadoc ProductionSummaryService).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Transactional
class ProductionSummaryIntegrationTest extends IntegrationTestSupport {

    @Autowired private ProductionSummaryService productionSummaryService;
    @Autowired private TeamRepository teamRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private LatexTypeRepository latexTypeRepository;
    @Autowired private ProductionRecordRepository productionRecordRepository;
    @Autowired private ScanBatchRepository scanBatchRepository;
    @Autowired private ScanImageRepository scanImageRepository;

    private Team team;
    private Employee employee;
    private User admin;
    private LatexType water;
    // Ngày xa trong tương lai — tránh đụng dữ liệu thật đã có trên Supabase dev (DB dùng chung giữa
    // nhiều phiên test/thao tác thủ công, KHÔNG phải DB cô lập riêng cho test — transaction rollback
    // của test này không xóa dữ liệu ĐÃ COMMIT từ trước, nên cần chọn ngày chắc chắn trống).
    private final LocalDate workDate = LocalDate.of(2099, 1, 1);

    @BeforeEach
    void setUp() {
        admin = adminUser();
        team = teamRepository.saveAndFlush(Team.builder().name("Tổ ProdSummary Test " + UUID.randomUUID()).build());
        employee = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("NV ProdSummary Test").team(team).status(EmployeeStatus.ACTIVE).build());
        water = latexTypeRepository.findByCode("water")
                .orElseThrow(() -> new NoSuchElementException("Seed latex_types thiếu 'water'"));
    }

    // ============================================================= PROD-01/02

    @Test
    void prod01_primaryApproved_countsOfficial() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        savedApprovedRecord(employee, primary, new BigDecimal("1000.00"));

        TeamProductionSummary summary = teamSummary(daily(null, null));
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED);
        assertThat(summary.officialKg()).isEqualByComparingTo("1000.00");
    }

    @Test
    void prod02_primaryNeedReview_recordStaysDraft_officialZero() {
        ScanBatch primary = savedBatch(BatchStatus.NEED_REVIEW, BatchType.PRIMARY, null);
        savedDraftRecord(employee, primary, new BigDecimal("1000.00"));

        TeamProductionSummary summary = teamSummary(daily(null, null));
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.NEEDS_REVIEW);
        assertThat(summary.officialKg()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ============================================================= PROD-03/04/13

    @Test
    void prod03_approvedSupplement_addsToOfficial() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        savedApprovedRecord(employee, primary, new BigDecimal("1000.00"));
        ScanBatch supplement = savedBatch(BatchStatus.APPROVED, BatchType.SUPPLEMENT, primary);
        Employee employee2 = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("NV2 ProdSummary Test").team(team).status(EmployeeStatus.ACTIVE).build());
        savedApprovedRecord(employee2, supplement, new BigDecimal("200.00"));

        TeamProductionSummary summary = teamSummary(daily(null, null));
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED);
        assertThat(summary.officialKg()).isEqualByComparingTo("1200.00");
    }

    @Test
    void prod04and13_activeSupplement_notCounted_teamShowsBothSignals() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        savedApprovedRecord(employee, primary, new BigDecimal("1000.00"));
        ScanBatch supplement = savedBatch(BatchStatus.NEED_REVIEW, BatchType.SUPPLEMENT, primary);
        Employee employee2 = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("NV2 ProdSummary Test").team(team).status(EmployeeStatus.ACTIVE).build());
        savedDraftRecord(employee2, supplement, new BigDecimal("200.00"));

        TeamProductionSummary summary = teamSummary(daily(null, null));
        // PROD-13 — không được chỉ show "Đã xác nhận" đơn thuần, phải kèm tín hiệu supplement active.
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED_WITH_ACTIVE_SUPPLEMENT);
        assertThat(summary.officialKg()).isEqualByComparingTo("1000.00");
        assertThat(summary.activeSupplementInfo()).isNotNull();
        assertThat(summary.activeSupplementInfo().batchId()).isEqualTo(supplement.getId());
    }

    // ============================================================= PROD-08/09

    @Test
    void prod08_cancelledBatch_noOfficialProduction_treatedAsNoData() {
        ScanBatch cancelled = savedBatch(BatchStatus.CANCELLED, BatchType.PRIMARY, null);
        // Record dưới batch CANCELLED thực tế đã bị service cancel theo (ScanBatchService.cancelBatch)
        // — ở đây dựng trực tiếp CANCELLED record để mô phỏng đúng trạng thái cuối cùng, không phải
        // gọi lại service đó (đã có test riêng ở ScanBatchIntegrationTest).
        savedRecord(employee, cancelled, new BigDecimal("500.00"), RecordStatus.CANCELLED);

        TeamProductionSummary summary = teamSummary(daily(null, null));
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.NO_DATA);
        assertThat(summary.officialKg()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void prod09_partialFailed_noOfficial_derivedStatusNeedsReview() {
        ScanBatch primary = savedBatch(BatchStatus.PARTIAL_FAILED, BatchType.PRIMARY, null);
        savedDraftRecord(employee, primary, new BigDecimal("500.00"));

        TeamProductionSummary summary = teamSummary(daily(null, null));
        assertThat(summary.derivedStatus()).isEqualTo(DerivedTeamStatus.NEEDS_REVIEW);
        assertThat(summary.officialKg()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ============================================================= PROD-11

    @Test
    void prod11_multipleTeams_eachComputedIndependently() {
        Team team2 = teamRepository.saveAndFlush(Team.builder().name("Tổ 2 ProdSummary " + UUID.randomUUID()).build());
        Employee employee2 = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("NV Tổ2 ProdSummary").team(team2).status(EmployeeStatus.ACTIVE).build());

        ScanBatch primary1 = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        savedApprovedRecord(employee, primary1, new BigDecimal("600.00"));

        ScanBatch primary2 = scanBatchRepository.saveAndFlush(ScanBatch.builder()
                .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team2)
                .batchType(BatchType.PRIMARY).status(BatchStatus.NEED_REVIEW).createdBy(admin).build());
        savedDraftRecord(employee2, primary2, new BigDecimal("300.00"));

        ProductionSummaryDailyResponse response = daily(null, null);
        TeamProductionSummary t1 = response.teams().stream().filter(t -> t.teamId().equals(team.getId())).findFirst().orElseThrow();
        TeamProductionSummary t2 = response.teams().stream().filter(t -> t.teamId().equals(team2.getId())).findFirst().orElseThrow();

        assertThat(t1.derivedStatus()).isEqualTo(DerivedTeamStatus.APPROVED);
        assertThat(t1.officialKg()).isEqualByComparingTo("600.00");
        assertThat(t2.derivedStatus()).isEqualTo(DerivedTeamStatus.NEEDS_REVIEW);
        assertThat(t2.officialKg()).isEqualByComparingTo(BigDecimal.ZERO);
        // Tổng toàn hệ thống chỉ cộng phần APPROVED (Tổ 1) — không cộng Tổ 2 đang NEED_REVIEW.
        assertThat(response.totalKg()).isEqualByComparingTo("600.00");
    }

    // ============================================================= PROD-12 — traceability

    @Test
    void prod12_breakdown_returnsFullTraceability() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        ScanImage image = scanImageRepository.saveAndFlush(ScanImage.builder()
                .scanBatch(primary).storagePath("test/photo-" + UUID.randomUUID() + ".jpg")
                .clientImageId(UUID.randomUUID().toString()).status(ImageStatus.ACTIVE).uploadedBy(admin).build());
        ProductionRecord record = ProductionRecord.builder()
                .recordDate(workDate).employee(employee).team(team).source(RecordSource.OCR_IMPORT)
                .scanBatch(primary).scanImage(image).createdBy(admin).status(RecordStatus.APPROVED).build();
        record.addItem(ProductionRecordItem.builder().latexType(water).kg(new BigDecimal("82.5")).build());
        productionRecordRepository.saveAndFlush(record);

        TeamBreakdownResponse breakdown = productionSummaryService.getTeamBreakdown(team.getId(), workDate, null);
        assertThat(breakdown.employees()).hasSize(1);
        var row = breakdown.employees().get(0);
        assertThat(row.scanImageId()).isEqualTo(image.getId());
        assertThat(row.captureMethod()).isEqualTo("OCR");
        assertThat(row.originContext()).isEqualTo("PRIMARY");
        assertThat(row.totalKg()).isEqualByComparingTo("82.5");
    }

    @Test
    void prod12_breakdown_supplementRecord_originContextIsSupplement() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        ScanBatch supplement = savedBatch(BatchStatus.APPROVED, BatchType.SUPPLEMENT, primary);
        savedApprovedRecord(employee, supplement, new BigDecimal("50.00"));

        TeamBreakdownResponse breakdown = productionSummaryService.getTeamBreakdown(team.getId(), workDate, null);
        assertThat(breakdown.employees()).hasSize(1);
        assertThat(breakdown.employees().get(0).originContext()).isEqualTo("SUPPLEMENT");
    }

    @Test
    void manualRecord_captureMethodManual_originContextNull() {
        ProductionRecord record = ProductionRecord.builder()
                .recordDate(workDate).employee(employee).team(team).source(RecordSource.MANUAL)
                .createdBy(admin).status(RecordStatus.APPROVED).build();
        record.addItem(ProductionRecordItem.builder().latexType(water).kg(new BigDecimal("40.00")).build());
        productionRecordRepository.saveAndFlush(record);

        TeamBreakdownResponse breakdown = productionSummaryService.getTeamBreakdown(team.getId(), workDate, null);
        assertThat(breakdown.employees()).hasSize(1);
        assertThat(breakdown.employees().get(0).captureMethod()).isEqualTo("MANUAL");
        assertThat(breakdown.employees().get(0).originContext()).isNull();
    }

    // ============================================================= PROD-16 — filter loại mủ

    @Test
    void prod16_latexTypeFilter_appliesConsistently() {
        LatexType cup = latexTypeRepository.findByCode("cup")
                .orElseThrow(() -> new NoSuchElementException("Seed latex_types thiếu 'cup'"));
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        ProductionRecord record = ProductionRecord.builder()
                .recordDate(workDate).employee(employee).team(team).source(RecordSource.OCR_IMPORT)
                .scanBatch(primary).createdBy(admin).status(RecordStatus.APPROVED).build();
        record.addItem(ProductionRecordItem.builder().latexType(water).kg(new BigDecimal("80.00")).build());
        record.addItem(ProductionRecordItem.builder().latexType(cup).kg(new BigDecimal("20.00")).build());
        productionRecordRepository.saveAndFlush(record);

        ProductionSummaryDailyResponse filtered = daily(null, "water");
        TeamProductionSummary summary = teamSummary(filtered);
        assertThat(summary.officialKg()).isEqualByComparingTo("80.00");
        assertThat(filtered.byLatexType()).extracting("code").containsExactly("water");

        TeamBreakdownResponse breakdown = productionSummaryService.getTeamBreakdown(team.getId(), workDate, "water");
        assertThat(breakdown.employees()).hasSize(1);
        assertThat(breakdown.employees().get(0).byLatexType()).extracting("code").containsExactly("water");
        assertThat(breakdown.employees().get(0).totalKg()).isEqualByComparingTo("80.00");
    }

    // ============================================================= /monthly, /employee-search (SHOULD)

    @Test
    void monthly_sumsAcrossWholeMonth_scopedByTeam() {
        ScanBatch primary = savedBatch(BatchStatus.APPROVED, BatchType.PRIMARY, null);
        savedApprovedRecord(employee, primary, new BigDecimal("300.00"));

        var response = productionSummaryService.getMonthly(java.time.YearMonth.from(workDate), team.getId());
        assertThat(response.totalKg()).isEqualByComparingTo("300.00");
        assertThat(response.byLatexType()).extracting("code").containsExactly("water");
    }

    @Test
    void employeeSearch_findsByPartialName_scopedByTeam() {
        var results = productionSummaryService.searchEmployees(
                employee.getFullName().substring(0, 6), team.getId());
        assertThat(results).extracting("employeeId").contains(employee.getId());
    }

    @Test
    void employeeSearch_noMatch_returnsEmpty() {
        var results = productionSummaryService.searchEmployees("Không tồn tại XYZ123", team.getId());
        assertThat(results).isEmpty();
    }

    // ============================================================= helpers

    private ProductionSummaryDailyResponse daily(UUID teamId, String latexTypeCode) {
        return productionSummaryService.getDaily(workDate, teamId, latexTypeCode);
    }

    private TeamProductionSummary teamSummary(ProductionSummaryDailyResponse response) {
        return response.teams().stream().filter(t -> t.teamId().equals(team.getId())).findFirst()
                .orElseThrow(() -> new AssertionError("Không tìm thấy Tổ trong response"));
    }

    private ScanBatch savedBatch(BatchStatus status, BatchType batchType, ScanBatch originalBatch) {
        return scanBatchRepository.saveAndFlush(ScanBatch.builder()
                .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team)
                .batchType(batchType).originalBatch(originalBatch).status(status).createdBy(admin).build());
    }

    private void savedApprovedRecord(Employee emp, ScanBatch batch, BigDecimal kg) {
        savedRecord(emp, batch, kg, RecordStatus.APPROVED);
    }

    private void savedDraftRecord(Employee emp, ScanBatch batch, BigDecimal kg) {
        savedRecord(emp, batch, kg, RecordStatus.DRAFT);
    }

    private void savedRecord(Employee emp, ScanBatch batch, BigDecimal kg, RecordStatus status) {
        ProductionRecord record = ProductionRecord.builder()
                .recordDate(workDate).employee(emp).team(emp.getTeam()).source(RecordSource.OCR_IMPORT)
                .scanBatch(batch).createdBy(admin).status(status).build();
        record.addItem(ProductionRecordItem.builder().latexType(water).kg(kg).build());
        productionRecordRepository.saveAndFlush(record);
    }
}
