package com.mycompany.api.service;

import com.mycompany.api.dto.PayrollDetailResponse;
import com.mycompany.api.dto.PayrollLineItem;
import com.mycompany.api.dto.PayrollRowResponse;
import com.mycompany.api.dto.PayrollRowStatus;
import com.mycompany.api.dto.PayrollSummaryResponse;
import com.mycompany.api.entity.AllowanceConfig;
import com.mycompany.api.entity.AttendanceType;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.EmployeeTechnicalGradeAssignment;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.PayrollDeduction;
import com.mycompany.api.entity.PayrollMixedLatexRateConfig;
import com.mycompany.api.entity.PayrollPeriodLock;
import com.mycompany.api.entity.PayrollSetting;
import com.mycompany.api.entity.RateConfig;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.TechnicalGrade;
import com.mycompany.api.entity.TechnicalGradeConfig;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Module 3 — Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md). Số liệu LUÔN suy ra từ
 * production_records/attendance_records đã APPROVED/confirmed + bảng đơn giá hiện hành — không lưu
 * 1 con số lương độc lập có thể chỉnh tay (mục 0/2 spec), tính runtime mỗi lần gọi, không cache.
 *
 * Đơn giá "hiện hành" cho CẢ THÁNG được chọn theo 1 mốc THAM CHIẾU DUY NHẤT (ngày cuối tháng) —
 * đơn giản hóa có chủ đích cho v1 vì audit xác nhận KHÔNG có sẵn cơ chế rate-lookup-theo-ngày nào
 * trong codebase để tái dùng (ReportService chỉ pivot kg, không có phép nhân tiền nào). Nếu giá đổi
 * GIỮA tháng, kết quả có thể lệch nhẹ so với tính đúng-theo-từng-ngày — trường hợp hiếm, đã ghi rõ
 * là câu hỏi mở CHƯA chặn MVP (spec mục 8).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PayrollService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final String DEFAULT_ADVANCE_KEY = "default_monthly_advance";
    private static final String WATER_LATEX_TYPE_CODE = "water";

    private final EmployeeRepository employeeRepository;
    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final RateConfigRepository rateConfigRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final AllowanceConfigRepository allowanceConfigRepository;
    private final PayrollMixedLatexRateConfigRepository payrollMixedLatexRateConfigRepository;
    private final TechnicalGradeConfigRepository technicalGradeConfigRepository;
    private final EmployeeTechnicalGradeAssignmentRepository gradeAssignmentRepository;
    private final PayrollDeductionRepository payrollDeductionRepository;
    private final PayrollSettingRepository payrollSettingRepository;
    private final PayrollPeriodLockRepository payrollPeriodLockRepository;

    // ============================================================= GET summary (toàn bộ nhân viên/Tổ)

    public PayrollSummaryResponse summary(String yearMonth, UUID teamId, String status, String query) {
        YearMonth ym = parseYearMonth(yearMonth);
        LocalDate fromDate = ym.atDay(1);
        LocalDate toDate = ym.atEndOfMonth();

        List<Employee> employees = teamId != null
                ? employeeRepository.findByTeamIdAndStatus(teamId, EmployeeStatus.ACTIVE)
                : employeeRepository.findByStatus(EmployeeStatus.ACTIVE);

        RateContext rates = loadRateContext(toDate);

        Map<UUID, Map<String, BigDecimal>> kgByEmployee = productionRecordItemRepository
                .aggregateForReport(fromDate, toDate, teamId, null).stream()
                .collect(Collectors.groupingBy(ProductionAggregateRow::employeeId,
                        Collectors.toMap(ProductionAggregateRow::latexTypeCode, ProductionAggregateRow::totalKg)));

        Map<UUID, Map<RecordStatus, Long>> statusByEmployee = productionRecordRepository
                .countStatusByEmployee(fromDate, toDate, teamId, null).stream()
                .collect(Collectors.groupingBy(EmployeeRecordStatusRow::employeeId,
                        Collectors.toMap(EmployeeRecordStatusRow::status, EmployeeRecordStatusRow::count)));

        Map<UUID, Map<AttendanceType, BigDecimal>> attendanceByEmployee = attendanceRecordRepository
                .aggregateForPayroll(fromDate, toDate, teamId, null).stream()
                .collect(Collectors.groupingBy(AttendanceAggregateRow::employeeId,
                        Collectors.toMap(AttendanceAggregateRow::attendanceType, AttendanceAggregateRow::totalQuantity)));

        Map<UUID, EmployeeTechnicalGradeAssignment> gradeByEmployee = gradeAssignmentRepository
                .findByYearMonth(yearMonth).stream()
                .collect(Collectors.toMap(a -> a.getEmployee().getId(), a -> a));

        Map<UUID, PayrollDeduction> deductionByEmployee = payrollDeductionRepository
                .findByYearMonth(yearMonth).stream()
                .collect(Collectors.toMap(d -> d.getEmployee().getId(), d -> d));

        BigDecimal defaultAdvance = defaultAdvance();

        List<PayrollRowResponse> rows = employees.stream()
                .map(employee -> toRowResponse(employee, computeAmounts(
                        kgByEmployee.getOrDefault(employee.getId(), Map.of()),
                        statusByEmployee.getOrDefault(employee.getId(), Map.of()),
                        attendanceByEmployee.getOrDefault(employee.getId(), Map.of()),
                        gradeByEmployee.get(employee.getId()),
                        deductionByEmployee.get(employee.getId()),
                        defaultAdvance, rates)))
                .filter(row -> matchesQuery(row, query))
                .filter(row -> matchesStatus(row, status))
                .sorted(Comparator.comparing(PayrollRowResponse::teamName).thenComparing(PayrollRowResponse::employeeName))
                .toList();

        BigDecimal totalNetPay = rows.stream().map(PayrollRowResponse::netPay).reduce(ZERO, BigDecimal::add);
        long needsReview = rows.stream().filter(r -> r.rowStatus() == PayrollRowStatus.NEEDS_REVIEW).count();
        long missingData = rows.stream().filter(r -> r.rowStatus() == PayrollRowStatus.MISSING_DATA).count();

        Optional<PayrollPeriodLock> lock = payrollPeriodLockRepository.findById(yearMonth);
        return new PayrollSummaryResponse(yearMonth, totalNetPay, rows.size(), (int) needsReview, (int) missingData,
                lock.isPresent(), lock.map(l -> l.getLockedBy().getId()).orElse(null),
                lock.map(PayrollPeriodLock::getLockedAt).orElse(null), rows);
    }

    // ============================================================= GET detail (1 nhân viên, drill-down)

    public PayrollDetailResponse detail(UUID employeeId, String yearMonth) {
        YearMonth ym = parseYearMonth(yearMonth);
        LocalDate fromDate = ym.atDay(1);
        LocalDate toDate = ym.atEndOfMonth();
        Employee employee = findEmployeeOrThrow(employeeId);

        RateContext rates = loadRateContext(toDate);
        PayrollAmounts amounts = computeAmountsForEmployee(employeeId, fromDate, toDate, yearMonth, rates);

        List<PayrollLineItem> lines = new java.util.ArrayList<>();
        addLine(lines, "Mủ nước", amounts.waterKg(), "kg", amounts.waterRate(), amounts.waterAmount());
        addLine(lines, "Mủ tạp", amounts.mixedLatexKg(), "kg", amounts.mixedLatexRate(), amounts.mixedLatexAmount());
        addLine(lines, "Bồi thuốc", amounts.medicationCount(), "phần cây", amounts.medicationRate(), amounts.medicationAmount());
        addLine(lines, "Chuyên cần", amounts.attendanceDays(), "ngày", amounts.attendanceRate(), amounts.attendanceAmount());
        addLine(lines, "Công mưa bão", amounts.stormDays(), "ngày", amounts.stormRate(), amounts.stormAmount());
        addLine(lines, "Công thời vụ", amounts.seasonalDays(), "ngày", amounts.seasonalRate(), amounts.seasonalAmount());
        if (amounts.grade() != null) {
            lines.add(new PayrollLineItem("Hạng kỹ thuật (" + amounts.grade().name() + ")",
                    BigDecimal.ONE, "tháng", amounts.gradeRate(), amounts.gradeAmount()));
        }

        return new PayrollDetailResponse(employee.getId(), employee.getFullName(),
                employee.getTeam().getId(), employee.getTeam().getName(), yearMonth,
                lines, amounts.grade() == null ? null : amounts.grade().name(),
                amounts.totalPay(), amounts.deduction(), amounts.deductionIsOverride(),
                amounts.netPay(), amounts.rowStatus());
    }

    private void addLine(List<PayrollLineItem> lines, String label, BigDecimal quantity, String unit,
            BigDecimal unitPrice, BigDecimal amount) {
        if (quantity.signum() > 0) {
            lines.add(new PayrollLineItem(label, quantity, unit, unitPrice, amount));
        }
    }

    // ============================================================= PATCH deduction / technical-grade

    @Transactional
    public PayrollRowResponse updateDeduction(UUID employeeId, String yearMonth, BigDecimal amount, User currentUser) {
        parseYearMonth(yearMonth);
        Employee employee = findEmployeeOrThrow(employeeId);
        PayrollDeduction deduction = payrollDeductionRepository.findByEmployeeIdAndYearMonth(employeeId, yearMonth)
                .orElseGet(() -> PayrollDeduction.builder().employee(employee).yearMonth(yearMonth).build());
        deduction.setAmount(amount);
        deduction.setUpdatedBy(currentUser);
        deduction.setUpdatedAt(Instant.now());
        payrollDeductionRepository.save(deduction);
        return rowFor(employeeId, yearMonth);
    }

    @Transactional
    public PayrollRowResponse updateTechnicalGrade(UUID employeeId, String yearMonth, TechnicalGrade grade, User currentUser) {
        parseYearMonth(yearMonth);
        Employee employee = findEmployeeOrThrow(employeeId);
        Optional<EmployeeTechnicalGradeAssignment> existing =
                gradeAssignmentRepository.findByEmployeeIdAndYearMonth(employeeId, yearMonth);

        if (grade == null) {
            existing.ifPresent(gradeAssignmentRepository::delete);
        } else {
            EmployeeTechnicalGradeAssignment assignment = existing.orElseGet(() ->
                    EmployeeTechnicalGradeAssignment.builder().employee(employee).yearMonth(yearMonth).build());
            assignment.setGrade(grade);
            assignment.setUpdatedBy(currentUser);
            assignment.setUpdatedAt(Instant.now());
            gradeAssignmentRepository.save(assignment);
        }
        return rowFor(employeeId, yearMonth);
    }

    private PayrollRowResponse rowFor(UUID employeeId, String yearMonth) {
        YearMonth ym = parseYearMonth(yearMonth);
        LocalDate fromDate = ym.atDay(1);
        LocalDate toDate = ym.atEndOfMonth();
        Employee employee = findEmployeeOrThrow(employeeId);
        RateContext rates = loadRateContext(toDate);
        return toRowResponse(employee, computeAmountsForEmployee(employeeId, fromDate, toDate, yearMonth, rates));
    }

    // ============================================================= Chốt lương (cờ đơn giản theo THÁNG)

    @Transactional
    public PayrollSummaryResponse lock(String yearMonth, User currentUser) {
        parseYearMonth(yearMonth);
        if (payrollPeriodLockRepository.existsById(yearMonth)) {
            throw new ConflictException("Tháng " + yearMonth + " đã được chốt trước đó");
        }
        payrollPeriodLockRepository.save(PayrollPeriodLock.builder().yearMonth(yearMonth).lockedBy(currentUser).build());
        return summary(yearMonth, null, null, null);
    }

    @Transactional
    public PayrollSummaryResponse unlock(String yearMonth) {
        parseYearMonth(yearMonth);
        if (!payrollPeriodLockRepository.existsById(yearMonth)) {
            throw new NoSuchElementException("Tháng " + yearMonth + " chưa được chốt");
        }
        payrollPeriodLockRepository.deleteById(yearMonth);
        return summary(yearMonth, null, null, null);
    }

    // ============================================================= Tính toán cốt lõi (dùng chung bulk/single)

    /** Truy vấn riêng cho 1 nhân viên (dùng ở detail/PATCH) — kém hiệu quả hơn đường bulk của
     * summary() (query riêng thay vì map đã gom sẵn) nhưng chỉ 1 nhân viên nên chấp nhận được. */
    private PayrollAmounts computeAmountsForEmployee(
            UUID employeeId, LocalDate fromDate, LocalDate toDate, String yearMonth, RateContext rates) {
        Map<String, BigDecimal> kgByType = productionRecordItemRepository
                .aggregateForReport(fromDate, toDate, null, employeeId).stream()
                .collect(Collectors.toMap(ProductionAggregateRow::latexTypeCode, ProductionAggregateRow::totalKg));
        Map<RecordStatus, Long> statusCounts = productionRecordRepository
                .countStatusByEmployee(fromDate, toDate, null, employeeId).stream()
                .collect(Collectors.toMap(EmployeeRecordStatusRow::status, EmployeeRecordStatusRow::count));
        Map<AttendanceType, BigDecimal> attendance = attendanceRecordRepository
                .aggregateForPayroll(fromDate, toDate, null, employeeId).stream()
                .collect(Collectors.toMap(AttendanceAggregateRow::attendanceType, AttendanceAggregateRow::totalQuantity));
        EmployeeTechnicalGradeAssignment grade =
                gradeAssignmentRepository.findByEmployeeIdAndYearMonth(employeeId, yearMonth).orElse(null);
        PayrollDeduction deduction =
                payrollDeductionRepository.findByEmployeeIdAndYearMonth(employeeId, yearMonth).orElse(null);
        return computeAmounts(kgByType, statusCounts, attendance, grade, deduction, defaultAdvance(), rates);
    }

    private PayrollAmounts computeAmounts(
            Map<String, BigDecimal> kgByType, Map<RecordStatus, Long> statusCounts,
            Map<AttendanceType, BigDecimal> attendance, EmployeeTechnicalGradeAssignment gradeAssignment,
            PayrollDeduction deductionOverride, BigDecimal defaultAdvance, RateContext rates) {

        BigDecimal waterKg = kgByType.getOrDefault(WATER_LATEX_TYPE_CODE, ZERO);
        // Danh mục loại mủ MỞ (ADR-0002) — "Mủ tạp" = mọi loại KHÁC water, KHÔNG hardcode
        // cup/strip/coagulated, để tự động bao gồm loại mủ mới nếu danh mục mở rộng sau này.
        BigDecimal mixedLatexKg = kgByType.entrySet().stream()
                .filter(e -> !WATER_LATEX_TYPE_CODE.equals(e.getKey()))
                .map(Map.Entry::getValue)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal waterAmount = waterKg.multiply(rates.waterRate());
        BigDecimal mixedLatexAmount = mixedLatexKg.multiply(rates.mixedLatexRate());

        BigDecimal medicationCount = attendance.getOrDefault(AttendanceType.MEDICATION, ZERO);
        BigDecimal medicationRate = rates.allowanceRates().getOrDefault(AttendanceType.MEDICATION, ZERO);
        BigDecimal medicationAmount = medicationCount.multiply(medicationRate);

        BigDecimal attendanceDays = attendance.getOrDefault(AttendanceType.ATTENDANCE, ZERO);
        BigDecimal attendanceRate = rates.allowanceRates().getOrDefault(AttendanceType.ATTENDANCE, ZERO);
        BigDecimal attendanceAmount = attendanceDays.multiply(attendanceRate);

        BigDecimal stormDays = attendance.getOrDefault(AttendanceType.STORM_ALLOWANCE, ZERO);
        BigDecimal stormRate = rates.allowanceRates().getOrDefault(AttendanceType.STORM_ALLOWANCE, ZERO);
        BigDecimal stormAmount = stormDays.multiply(stormRate);

        BigDecimal seasonalDays = attendance.getOrDefault(AttendanceType.SEASONAL_WORK, ZERO);
        BigDecimal seasonalRate = rates.allowanceRates().getOrDefault(AttendanceType.SEASONAL_WORK, ZERO);
        BigDecimal seasonalAmount = seasonalDays.multiply(seasonalRate);

        TechnicalGrade grade = gradeAssignment != null ? gradeAssignment.getGrade() : null;
        BigDecimal gradeRate = grade != null ? rates.gradeRates().getOrDefault(grade, ZERO) : ZERO;
        BigDecimal gradeAmount = grade != null ? gradeRate : ZERO;

        BigDecimal totalPay = waterAmount.add(mixedLatexAmount).add(medicationAmount).add(attendanceAmount)
                .add(stormAmount).add(seasonalAmount).add(gradeAmount);

        boolean deductionIsOverride = deductionOverride != null;
        BigDecimal deduction = deductionIsOverride ? deductionOverride.getAmount() : defaultAdvance;
        BigDecimal netPay = totalPay.subtract(deduction);

        PayrollRowStatus rowStatus = deriveRowStatus(statusCounts);

        return new PayrollAmounts(
                waterKg, waterAmount, rates.waterRate(),
                mixedLatexKg, mixedLatexAmount, rates.mixedLatexRate(),
                medicationCount, medicationAmount, medicationRate,
                attendanceDays, attendanceAmount, attendanceRate,
                stormDays, stormAmount, stormRate,
                seasonalDays, seasonalAmount, seasonalRate,
                grade, gradeAmount, gradeRate,
                totalPay, deduction, deductionIsOverride, netPay, rowStatus);
    }

    private PayrollRowStatus deriveRowStatus(Map<RecordStatus, Long> statusCounts) {
        if (statusCounts.isEmpty()) {
            return PayrollRowStatus.MISSING_DATA;
        }
        if (statusCounts.getOrDefault(RecordStatus.DRAFT, 0L) > 0) {
            return PayrollRowStatus.NEEDS_REVIEW;
        }
        return PayrollRowStatus.CONFIRMED;
    }

    private PayrollRowResponse toRowResponse(Employee employee, PayrollAmounts a) {
        return new PayrollRowResponse(
                employee.getId(), employee.getFullName(), employee.getTeam().getId(), employee.getTeam().getName(),
                a.waterKg(), a.waterAmount(), a.mixedLatexKg(), a.mixedLatexAmount(),
                a.medicationCount(), a.medicationAmount(), a.attendanceDays(), a.attendanceAmount(),
                a.stormDays(), a.stormAmount(), a.seasonalDays(), a.seasonalAmount(),
                a.grade() == null ? null : a.grade().name(), a.gradeAmount(),
                a.totalPay(), a.deduction(), a.deductionIsOverride(), a.netPay(), a.rowStatus());
    }

    /** Kết quả tính toán đầy đủ 1 nhân viên/1 tháng — giữ cả *Rate để detail() dựng breakdown
     * "số lượng × đơn giá" (mục 4 spec), toRowResponse() chỉ lấy phần amount. */
    private record PayrollAmounts(
            BigDecimal waterKg, BigDecimal waterAmount, BigDecimal waterRate,
            BigDecimal mixedLatexKg, BigDecimal mixedLatexAmount, BigDecimal mixedLatexRate,
            BigDecimal medicationCount, BigDecimal medicationAmount, BigDecimal medicationRate,
            BigDecimal attendanceDays, BigDecimal attendanceAmount, BigDecimal attendanceRate,
            BigDecimal stormDays, BigDecimal stormAmount, BigDecimal stormRate,
            BigDecimal seasonalDays, BigDecimal seasonalAmount, BigDecimal seasonalRate,
            TechnicalGrade grade, BigDecimal gradeAmount, BigDecimal gradeRate,
            BigDecimal totalPay, BigDecimal deduction, boolean deductionIsOverride, BigDecimal netPay,
            PayrollRowStatus rowStatus) {
    }

    // ============================================================= Rate lookup (mốc tham chiếu = cuối tháng)

    private record RateContext(
            BigDecimal waterRate, BigDecimal mixedLatexRate,
            Map<AttendanceType, BigDecimal> allowanceRates, Map<TechnicalGrade, BigDecimal> gradeRates) {
    }

    private record Versioned(LocalDate from, LocalDate to, BigDecimal price) {
    }

    private RateContext loadRateContext(LocalDate refDate) {
        LatexType water = latexTypeRepository.findByCode(WATER_LATEX_TYPE_CODE)
                .orElseThrow(() -> new IllegalStateException("Thiếu loại mủ '" + WATER_LATEX_TYPE_CODE + "' trong danh mục"));
        BigDecimal waterRate = pickEffective(refDate, rateConfigRepository.findByLatexTypeId(water.getId()).stream()
                .map(c -> new Versioned(c.getEffectiveFrom(), c.getEffectiveTo(), c.getUnitPrice())).toList());
        BigDecimal mixedLatexRate = pickEffective(refDate, payrollMixedLatexRateConfigRepository.findAll().stream()
                .map(c -> new Versioned(c.getEffectiveFrom(), c.getEffectiveTo(), c.getUnitPrice())).toList());

        Map<AttendanceType, BigDecimal> allowanceRates = new EnumMap<>(AttendanceType.class);
        for (AttendanceType type : AttendanceType.values()) {
            List<AllowanceConfig> configs = allowanceConfigRepository.findByCode(type.name().toLowerCase());
            allowanceRates.put(type, pickEffective(refDate, configs.stream()
                    .map(c -> new Versioned(c.getEffectiveFrom(), c.getEffectiveTo(), c.getUnitPrice())).toList()));
        }

        Map<TechnicalGrade, BigDecimal> gradeRates = new EnumMap<>(TechnicalGrade.class);
        for (TechnicalGrade grade : TechnicalGrade.values()) {
            List<TechnicalGradeConfig> configs = technicalGradeConfigRepository.findByGrade(grade);
            gradeRates.put(grade, pickEffective(refDate, configs.stream()
                    .map(c -> new Versioned(c.getEffectiveFrom(), c.getEffectiveTo(), c.getUnitPrice())).toList()));
        }

        return new RateContext(waterRate, mixedLatexRate, allowanceRates, gradeRates);
    }

    /** EXCLUDE constraint (DB) đảm bảo không có 2 dòng chồng lấn hiệu lực cho cùng key — an toàn lấy
     * dòng đầu tiên khớp refDate. Không có dòng nào khớp → 0 (chưa cấu hình giá cho mốc này). */
    private static BigDecimal pickEffective(LocalDate refDate, List<Versioned> versions) {
        return versions.stream()
                .filter(v -> !refDate.isBefore(v.from()) && (v.to() == null || !refDate.isAfter(v.to())))
                .map(Versioned::price)
                .findFirst()
                .orElse(ZERO);
    }

    private BigDecimal defaultAdvance() {
        return payrollSettingRepository.findById(DEFAULT_ADVANCE_KEY).map(PayrollSetting::getValue).orElse(ZERO);
    }

    // ============================================================= filter + helpers

    private boolean matchesQuery(PayrollRowResponse row, String query) {
        return query == null || query.isBlank()
                || row.employeeName().toLowerCase().contains(query.trim().toLowerCase());
    }

    private boolean matchesStatus(PayrollRowResponse row, String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        try {
            return row.rowStatus() == PayrollRowStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("status không hợp lệ: " + status
                    + " — chấp nhận MISSING_DATA | NEEDS_REVIEW | CONFIRMED");
        }
    }

    private Employee findEmployeeOrThrow(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với id=" + id));
    }

    private YearMonth parseYearMonth(String yearMonth) {
        if (yearMonth == null || yearMonth.isBlank()) {
            throw new InvalidRequestException("yearMonth là bắt buộc (định dạng yyyy-MM)");
        }
        try {
            return YearMonth.parse(yearMonth);
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("yearMonth không hợp lệ: " + yearMonth + " (định dạng yyyy-MM)");
        }
    }
}
