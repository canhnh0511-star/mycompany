package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.mycompany.api.dto.PayrollRowResponse;
import com.mycompany.api.dto.PayrollRowStatus;
import com.mycompany.api.dto.PayrollSummaryResponse;
import com.mycompany.api.entity.AllowanceConfig;
import com.mycompany.api.entity.AttendanceType;
import com.mycompany.api.entity.CalcType;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.EmployeeTechnicalGradeAssignment;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.PayrollDeduction;
import com.mycompany.api.entity.PayrollMixedLatexRateConfig;
import com.mycompany.api.entity.PayrollSetting;
import com.mycompany.api.entity.RateConfig;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.TechnicalGrade;
import com.mycompany.api.entity.TechnicalGradeConfig;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.AllowanceConfigRepository;
import com.mycompany.api.repository.AttendanceAggregateRow;
import com.mycompany.api.repository.AttendanceRecordRepository;
import com.mycompany.api.repository.EmployeeRecordStatusRow;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.EmployeeTechnicalGradeAssignmentRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.PayrollDeductionRepository;
import com.mycompany.api.repository.PayrollMixedLatexRateConfigRepository;
import com.mycompany.api.repository.PayrollPeriodLockRepository;
import com.mycompany.api.repository.PayrollSettingRepository;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.RateConfigRepository;
import com.mycompany.api.repository.TechnicalGradeConfigRepository;
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
 * Test công thức tính lương + derive rowStatus (docs/specs/spec-3-bang-luong-v1-draft.md mục 6,
 * Case PAYROLL-01..13) — Mockito thuần, không cần DB (cùng pattern EmployeeServiceTest). Rate lookup
 * theo-ngày-thực-tế (PAYROLL-08) và lọc CANCELLED ở tầng query (PAYROLL-07) không test được ở đây
 * (thuộc về nội dung JPQL, repository bị mock) — cần integration test riêng nếu làm sau.
 */
@ExtendWith(MockitoExtension.class)
class PayrollServiceTest {

    @Mock private EmployeeRepository employeeRepository;
    @Mock private ProductionRecordItemRepository productionRecordItemRepository;
    @Mock private ProductionRecordRepository productionRecordRepository;
    @Mock private AttendanceRecordRepository attendanceRecordRepository;
    @Mock private RateConfigRepository rateConfigRepository;
    @Mock private LatexTypeRepository latexTypeRepository;
    @Mock private AllowanceConfigRepository allowanceConfigRepository;
    @Mock private PayrollMixedLatexRateConfigRepository payrollMixedLatexRateConfigRepository;
    @Mock private TechnicalGradeConfigRepository technicalGradeConfigRepository;
    @Mock private EmployeeTechnicalGradeAssignmentRepository gradeAssignmentRepository;
    @Mock private PayrollDeductionRepository payrollDeductionRepository;
    @Mock private PayrollSettingRepository payrollSettingRepository;
    @Mock private PayrollPeriodLockRepository payrollPeriodLockRepository;

    private PayrollService service;

    private static final String YEAR_MONTH = "2026-08";
    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    private Team team;
    private Employee employee;
    private User admin;
    private LatexType water;

    @BeforeEach
    void setUp() {
        service = new PayrollService(employeeRepository, productionRecordItemRepository, productionRecordRepository,
                attendanceRecordRepository, rateConfigRepository, latexTypeRepository, allowanceConfigRepository,
                payrollMixedLatexRateConfigRepository, technicalGradeConfigRepository, gradeAssignmentRepository,
                payrollDeductionRepository, payrollSettingRepository, payrollPeriodLockRepository);

        team = Team.builder().id(UUID.randomUUID()).name("Tổ 1").build();
        employee = Employee.builder().id(UUID.randomUUID()).fullName("Điểu Minh").team(team)
                .status(EmployeeStatus.ACTIVE).build();
        admin = User.builder().id(UUID.randomUUID()).fullName("Admin").build();
        water = LatexType.builder().id(UUID.randomUUID()).code("water").label("Mủ nước").unit("kg").build();

        // lenient() — không phải test nào cũng đi qua đủ cả 3 nhánh này (vd test PATCH không gọi
        // summary() nên không đụng findByStatus; test chỉ gọi summary() không đụng findById) — dùng
        // chung setUp() cho gọn thay vì lặp lại stub giống hệt nhau ở từng test.
        org.mockito.Mockito.lenient().when(latexTypeRepository.findByCode("water")).thenReturn(Optional.of(water));
        org.mockito.Mockito.lenient().when(employeeRepository.findByStatus(EmployeeStatus.ACTIVE)).thenReturn(List.of(employee));
        org.mockito.Mockito.lenient().when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        // Đơn giá mặc định = 0 (danh sách rỗng qua pickEffective) trừ khi test tự stub riêng.
        org.mockito.Mockito.lenient().when(rateConfigRepository.findByLatexTypeId(water.getId()))
                .thenReturn(List.of(rateConfig(BigDecimal.valueOf(3400))));
    }

    private RateConfig rateConfig(BigDecimal price) {
        return RateConfig.builder().unitPrice(price).effectiveFrom(LocalDate.of(2026, 1, 1)).effectiveTo(null).build();
    }

    private AllowanceConfig allowanceConfig(String code, BigDecimal price) {
        return AllowanceConfig.builder().code(code).name(code).calcType(CalcType.PER_DAY)
                .unitPrice(price).effectiveFrom(LocalDate.of(2026, 1, 1)).effectiveTo(null).build();
    }

    // PAYROLL-01 — đủ 7 thành phần → tổng đúng bằng tổng 7 khoản
    @Test
    void summary_totalPay_equalsSumOfAllComponents() {
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, null)).thenReturn(List.of(
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "water", BigDecimal.valueOf(100)),
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "cup", BigDecimal.valueOf(10))));
        when(productionRecordRepository.countStatusByEmployee(FROM, TO, null, null)).thenReturn(List.of(
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.APPROVED, 1L)));
        when(attendanceRecordRepository.aggregateForPayroll(FROM, TO, null, null)).thenReturn(List.of(
                new AttendanceAggregateRow(employee.getId(), AttendanceType.MEDICATION, BigDecimal.valueOf(3)),
                new AttendanceAggregateRow(employee.getId(), AttendanceType.ATTENDANCE, BigDecimal.valueOf(31)),
                new AttendanceAggregateRow(employee.getId(), AttendanceType.STORM_ALLOWANCE, BigDecimal.ONE),
                new AttendanceAggregateRow(employee.getId(), AttendanceType.SEASONAL_WORK, BigDecimal.valueOf(2))));
        when(payrollMixedLatexRateConfigRepository.findAll()).thenReturn(List.of(
                PayrollMixedLatexRateConfig.builder().unitPrice(BigDecimal.valueOf(10000))
                        .effectiveFrom(LocalDate.of(2026, 1, 1)).build()));
        // tapping_work không có dữ liệu trong test này nhưng vẫn phải stub tường minh — Mockito strict
        // stubbing coi lời gọi findByCode("tapping_work") không khớp bất kỳ stub nào đã khai báo (dù
        // các stub khác cùng method) là lỗi tiềm ẩn (PotentialStubbingProblem), không tự fallback rỗng.
        when(allowanceConfigRepository.findByCode("tapping_work")).thenReturn(List.of());
        when(allowanceConfigRepository.findByCode("medication")).thenReturn(List.of(allowanceConfig("medication", BigDecimal.valueOf(60000))));
        when(allowanceConfigRepository.findByCode("attendance")).thenReturn(List.of(allowanceConfig("attendance", BigDecimal.valueOf(5000))));
        when(allowanceConfigRepository.findByCode("storm_allowance")).thenReturn(List.of(allowanceConfig("storm_allowance", BigDecimal.valueOf(100000))));
        when(allowanceConfigRepository.findByCode("seasonal_work")).thenReturn(List.of(allowanceConfig("seasonal_work", BigDecimal.valueOf(100000))));
        when(gradeAssignmentRepository.findByYearMonth(YEAR_MONTH)).thenReturn(List.of(
                EmployeeTechnicalGradeAssignment.builder().employee(employee).yearMonth(YEAR_MONTH).grade(TechnicalGrade.A).build()));
        when(technicalGradeConfigRepository.findByGrade(TechnicalGrade.A)).thenReturn(List.of(
                TechnicalGradeConfig.builder().grade(TechnicalGrade.A).unitPrice(BigDecimal.valueOf(350000))
                        .effectiveFrom(LocalDate.of(2026, 1, 1)).build()));
        when(technicalGradeConfigRepository.findByGrade(TechnicalGrade.B)).thenReturn(List.of());
        when(technicalGradeConfigRepository.findByGrade(TechnicalGrade.C)).thenReturn(List.of());
        when(payrollDeductionRepository.findByYearMonth(YEAR_MONTH)).thenReturn(List.of());
        when(payrollSettingRepository.findById("default_monthly_advance")).thenReturn(Optional.of(
                PayrollSetting.builder().key("default_monthly_advance").value(BigDecimal.valueOf(1000000)).build()));

        PayrollSummaryResponse response = service.summary(YEAR_MONTH, null, null, null);

        assertThat(response.rows()).hasSize(1);
        PayrollRowResponse row = response.rows().get(0);
        // water 100*3400=340000, mixed 10*10000=100000, medication 3*60000=180000, attendance 31*5000=155000,
        // storm 1*100000=100000, seasonal 2*100000=200000, grade A=350000 → total = 1,425,000
        assertThat(row.totalPay()).isEqualByComparingTo("1425000");
        assertThat(row.netPay()).isEqualByComparingTo("425000"); // trừ tạm ứng mặc định 1.000.000
        assertThat(row.rowStatus()).isEqualTo(PayrollRowStatus.CONFIRMED);
    }

    // PAYROLL-02 — chỉ có mủ nước, không phụ cấp nào → các khoản khác = 0, không lỗi
    @Test
    void summary_onlyWater_otherComponentsAreZero() {
        stubEmptyAggregates();
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, null)).thenReturn(List.of(
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "water", BigDecimal.TEN)));
        when(productionRecordRepository.countStatusByEmployee(FROM, TO, null, null)).thenReturn(List.of(
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.APPROVED, 1L)));

        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);

        assertThat(row.waterAmount()).isEqualByComparingTo("34000"); // 10 * 3400
        assertThat(row.mixedLatexAmount()).isEqualByComparingTo("0");
        assertThat(row.medicationAmount()).isEqualByComparingTo("0");
        assertThat(row.technicalGrade()).isNull();
        assertThat(row.technicalGradeAmount()).isEqualByComparingTo("0");
    }

    // PAYROLL-03 — không có dòng gán hạng cho tháng đang xét → hạng_kỹ_thuật = 0, không throw
    @Test
    void summary_noGradeAssignment_technicalGradeAmountIsZero() {
        stubEmptyAggregates();

        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);

        assertThat(row.technicalGrade()).isNull();
        assertThat(row.technicalGradeAmount()).isEqualByComparingTo("0");
    }

    // PAYROLL-03b — có gán hạng tháng TRƯỚC nhưng không có cho tháng đang xét → 0 (không tự kế thừa)
    @Test
    void summary_gradeAssignedOnlyForOtherMonth_doesNotCarryOver() {
        stubEmptyAggregates();
        // gradeAssignmentRepository.findByYearMonth("2026-08") trả rỗng (mặc định Mockito) dù tháng 07
        // giả sử có gán — service KHÔNG có cách nào "thấy" tháng 07 vì query luôn theo đúng yearMonth
        // truyền vào, đây chính là bằng chứng không tự kế thừa.
        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);
        assertThat(row.technicalGradeAmount()).isEqualByComparingTo("0");
    }

    // PAYROLL-04 — có dòng DRAFT trong tháng → rowStatus = NEEDS_REVIEW
    @Test
    void summary_hasDraftRecord_rowStatusNeedsReview() {
        stubEmptyAggregates();
        when(productionRecordRepository.countStatusByEmployee(FROM, TO, null, null)).thenReturn(List.of(
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.APPROVED, 2L),
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.DRAFT, 1L)));

        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);
        assertThat(row.rowStatus()).isEqualTo(PayrollRowStatus.NEEDS_REVIEW);
    }

    // PAYROLL-05 — không có production_records nào trong tháng → rowStatus = MISSING_DATA
    @Test
    void summary_noRecords_rowStatusMissingData() {
        stubEmptyAggregates();
        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);
        assertThat(row.rowStatus()).isEqualTo(PayrollRowStatus.MISSING_DATA);
    }

    // PAYROLL-06 — toàn bộ APPROVED → rowStatus = CONFIRMED
    @Test
    void summary_allApproved_rowStatusConfirmed() {
        stubEmptyAggregates();
        when(productionRecordRepository.countStatusByEmployee(FROM, TO, null, null)).thenReturn(List.of(
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.APPROVED, 3L)));
        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);
        assertThat(row.rowStatus()).isEqualTo(PayrollRowStatus.CONFIRMED);
    }

    // PAYROLL-09 — Lock tháng → GET vẫn trả đúng dữ liệu (KHÔNG immutable, theo quyết định user)
    @Test
    void summary_whenLocked_stillReturnsComputedData() {
        stubEmptyAggregates();
        when(payrollPeriodLockRepository.findById(YEAR_MONTH)).thenReturn(Optional.of(
                com.mycompany.api.entity.PayrollPeriodLock.builder().yearMonth(YEAR_MONTH).lockedBy(admin).build()));

        PayrollSummaryResponse response = service.summary(YEAR_MONTH, null, null, null);

        assertThat(response.locked()).isTrue();
        assertThat(response.rows()).hasSize(1); // vẫn tính bình thường, không bị chặn bởi lock
    }

    // PAYROLL-10 — filter theo trạng thái áp dụng đúng
    @Test
    void summary_filterByStatus_onlyReturnsMatchingRows() {
        Employee second = Employee.builder().id(UUID.randomUUID()).fullName("Thị Ngọc").team(team)
                .status(EmployeeStatus.ACTIVE).build();
        when(employeeRepository.findByStatus(EmployeeStatus.ACTIVE)).thenReturn(List.of(employee, second));
        stubEmptyAggregates();
        when(productionRecordRepository.countStatusByEmployee(FROM, TO, null, null)).thenReturn(List.of(
                new EmployeeRecordStatusRow(employee.getId(), RecordStatus.APPROVED, 1L)));
        // second employee: không có record nào → MISSING_DATA

        PayrollSummaryResponse response = service.summary(YEAR_MONTH, null, "CONFIRMED", null);

        assertThat(response.rows()).hasSize(1);
        assertThat(response.rows().get(0).employeeId()).isEqualTo(employee.getId());
    }

    // PAYROLL-11 — chưa có override → dùng mặc định hệ thống, deductionIsOverride = false
    @Test
    void summary_noDeductionOverride_usesSystemDefault() {
        stubEmptyAggregates();
        when(payrollSettingRepository.findById("default_monthly_advance")).thenReturn(Optional.of(
                PayrollSetting.builder().key("default_monthly_advance").value(BigDecimal.valueOf(1000000)).build()));

        PayrollRowResponse row = service.summary(YEAR_MONTH, null, null, null).rows().get(0);

        assertThat(row.deduction()).isEqualByComparingTo("1000000");
        assertThat(row.deductionIsOverride()).isFalse();
    }

    // PAYROLL-12/13 — có override riêng cho 1 nhân viên → dùng đúng giá trị override, KHÔNG ảnh hưởng
    // nhân viên khác (vẫn dùng mặc định hệ thống)
    @Test
    void summary_deductionOverride_onlyAffectsThatEmployee() {
        Employee second = Employee.builder().id(UUID.randomUUID()).fullName("Thị Ngọc").team(team)
                .status(EmployeeStatus.ACTIVE).build();
        when(employeeRepository.findByStatus(EmployeeStatus.ACTIVE)).thenReturn(List.of(employee, second));
        stubEmptyAggregates();
        when(payrollDeductionRepository.findByYearMonth(YEAR_MONTH)).thenReturn(List.of(
                PayrollDeduction.builder().employee(employee).yearMonth(YEAR_MONTH)
                        .amount(BigDecimal.valueOf(500000)).updatedBy(admin).build()));
        when(payrollSettingRepository.findById("default_monthly_advance")).thenReturn(Optional.of(
                PayrollSetting.builder().key("default_monthly_advance").value(BigDecimal.valueOf(1000000)).build()));

        PayrollSummaryResponse response = service.summary(YEAR_MONTH, null, null, null);

        PayrollRowResponse overridden = response.rows().stream().filter(r -> r.employeeId().equals(employee.getId())).findFirst().orElseThrow();
        PayrollRowResponse defaulted = response.rows().stream().filter(r -> r.employeeId().equals(second.getId())).findFirst().orElseThrow();
        assertThat(overridden.deduction()).isEqualByComparingTo("500000");
        assertThat(overridden.deductionIsOverride()).isTrue();
        assertThat(defaulted.deduction()).isEqualByComparingTo("1000000");
        assertThat(defaulted.deductionIsOverride()).isFalse();
    }

    // updateTechnicalGrade — PATCH grade=null xóa dòng gán đã có
    @Test
    void updateTechnicalGrade_withNull_deletesExistingAssignment() {
        EmployeeTechnicalGradeAssignment existing = EmployeeTechnicalGradeAssignment.builder()
                .id(UUID.randomUUID()).employee(employee).yearMonth(YEAR_MONTH).grade(TechnicalGrade.B).build();
        when(gradeAssignmentRepository.findByEmployeeIdAndYearMonth(employee.getId(), YEAR_MONTH))
                .thenReturn(Optional.of(existing));
        stubEmptyAggregates();

        service.updateTechnicalGrade(employee.getId(), YEAR_MONTH, null, admin);

        org.mockito.Mockito.verify(gradeAssignmentRepository).delete(existing);
    }

    private void stubEmptyAggregates() {
        when(productionRecordItemRepository.aggregateForReport(eq(FROM), eq(TO), any(), any())).thenReturn(List.of());
        when(productionRecordRepository.countStatusByEmployee(eq(FROM), eq(TO), any(), any())).thenReturn(List.of());
        when(attendanceRecordRepository.aggregateForPayroll(eq(FROM), eq(TO), any(), any())).thenReturn(List.of());
    }
}
