package com.mycompany.api.service;

import com.mycompany.api.dto.DailyTotalPoint;
import com.mycompany.api.dto.LatexSaleReportResponse;
import com.mycompany.api.dto.LatexSaleReportRow;
import com.mycompany.api.dto.ProductionDailyTrendResponse;
import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.dto.ProductionReportRow;
import com.mycompany.api.dto.ProductionReportTeamSubtotal;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.DailyTotalRow;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexSaleAggregateRow;
import com.mycompany.api.repository.LatexSaleItemRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Báo cáo tổng hợp sản lượng cá nhân / bán mủ theo Tổ (docs/TASKS.md Phase 4). CHỈ tính bản ghi
 * CONFIRMED (xem 2 aggregate query ở repository) — dữ liệu draft/cancelled không lọt vào báo cáo.
 * Pivot list phẳng từ query group-by thành ma trận (Map theo latex_type code) bằng Java thuần —
 * dataset nhỏ (1 công ty, theo tháng), không cần thêm query riêng cho subtotal/grand total.
 *
 * <p>Vợ/chồng cùng cạo mủ (ADR-0024, mở rộng 2026-09-06): áp dụng chia đôi kg CÙNG công thức với
 * {@link PayrollService} (xem {@link SpouseKgSplitter}) — dữ liệu thô production_records không tự
 * chia (ScanBatchService), report tự gộp+chia đôi ở đây trước khi trả ra, khớp đúng cách Bảng lương
 * đang tính, tránh 2 màn hình cho ra 2 con số kg khác nhau cho cùng 1 cặp vợ/chồng.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final LatexSaleItemRepository latexSaleItemRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final EmployeeRepository employeeRepository;

    public ProductionReportResponse productionReport(LocalDate fromDate, LocalDate toDate, UUID teamId, UUID employeeId) {
        validateDateRange(fromDate, toDate);
        List<LatexType> latexTypes = sortedLatexTypes();
        List<ProductionAggregateRow> raw =
                productionRecordItemRepository.aggregateForReport(fromDate, toDate, teamId, employeeId);

        List<ProductionReportRow> rows = raw.stream()
                .collect(Collectors.groupingBy(ProductionAggregateRow::employeeId, LinkedHashMap::new, Collectors.toList()))
                .values().stream()
                .map(group -> {
                    ProductionAggregateRow first = group.get(0);
                    Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
                    BigDecimal total = BigDecimal.ZERO;
                    for (ProductionAggregateRow r : group) {
                        kgByType.put(r.latexTypeCode(), r.totalKg());
                        total = total.add(r.totalKg());
                    }
                    return new ProductionReportRow(
                            first.teamId(), first.teamName(), first.employeeId(), first.employeeName(), kgByType, total);
                })
                .sorted(Comparator.comparing(ProductionReportRow::teamName).thenComparing(ProductionReportRow::employeeName))
                .toList();

        rows = applySpouseSplit(rows, fromDate, toDate, employeeId).stream()
                .sorted(Comparator.comparing(ProductionReportRow::teamName).thenComparing(ProductionReportRow::employeeName))
                .toList();

        List<ProductionReportTeamSubtotal> teamSubtotals = rows.stream()
                .collect(Collectors.groupingBy(ProductionReportRow::teamId, LinkedHashMap::new, Collectors.toList()))
                .values().stream()
                .map(group -> {
                    ProductionReportRow first = group.get(0);
                    Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
                    BigDecimal total = BigDecimal.ZERO;
                    for (ProductionReportRow r : group) {
                        r.kgByLatexType().forEach((code, kg) -> kgByType.merge(code, kg, BigDecimal::add));
                        total = total.add(r.totalKg());
                    }
                    return new ProductionReportTeamSubtotal(first.teamId(), first.teamName(), kgByType, total);
                })
                .sorted(Comparator.comparing(ProductionReportTeamSubtotal::teamName))
                .toList();

        Map<String, BigDecimal> grandTotalByType = new LinkedHashMap<>();
        BigDecimal grandTotalKg = BigDecimal.ZERO;
        for (ProductionReportRow r : rows) {
            r.kgByLatexType().forEach((code, kg) -> grandTotalByType.merge(code, kg, BigDecimal::add));
            grandTotalKg = grandTotalKg.add(r.totalKg());
        }

        return new ProductionReportResponse(fromDate, toDate, codesOf(latexTypes), labelsOf(latexTypes),
                rows, teamSubtotals, grandTotalByType, grandTotalKg);
    }

    public ProductionDailyTrendResponse productionDailyTrend(
            LocalDate fromDate, LocalDate toDate, UUID teamId, String latexTypeCode) {
        validateDateRange(fromDate, toDate);
        List<DailyTotalRow> raw =
                productionRecordItemRepository.aggregateDailyTotals(fromDate, toDate, teamId, latexTypeCode);
        Map<LocalDate, BigDecimal> totalByDate =
                raw.stream().collect(Collectors.toMap(DailyTotalRow::recordDate, DailyTotalRow::totalKg));

        List<DailyTotalPoint> days = new ArrayList<>();
        for (LocalDate d = fromDate; !d.isAfter(toDate); d = d.plusDays(1)) {
            days.add(new DailyTotalPoint(d, totalByDate.getOrDefault(d, BigDecimal.ZERO)));
        }
        return new ProductionDailyTrendResponse(fromDate, toDate, days);
    }

    public LatexSaleReportResponse latexSaleReport(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        validateDateRange(fromDate, toDate);
        List<LatexType> latexTypes = sortedLatexTypes();
        List<LatexSaleAggregateRow> raw = latexSaleItemRepository.aggregateForReport(fromDate, toDate, teamId);

        List<LatexSaleReportRow> rows = raw.stream()
                .collect(Collectors.groupingBy(LatexSaleAggregateRow::teamId, LinkedHashMap::new, Collectors.toList()))
                .values().stream()
                .map(group -> {
                    LatexSaleAggregateRow first = group.get(0);
                    Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
                    BigDecimal total = BigDecimal.ZERO;
                    for (LatexSaleAggregateRow r : group) {
                        kgByType.put(r.latexTypeCode(), r.totalKg());
                        total = total.add(r.totalKg());
                    }
                    return new LatexSaleReportRow(first.teamId(), first.teamName(), kgByType, total);
                })
                .sorted(Comparator.comparing(LatexSaleReportRow::teamName))
                .toList();

        Map<String, BigDecimal> grandTotalByType = new LinkedHashMap<>();
        BigDecimal grandTotalKg = BigDecimal.ZERO;
        for (LatexSaleReportRow r : rows) {
            r.kgByLatexType().forEach((code, kg) -> grandTotalByType.merge(code, kg, BigDecimal::add));
            grandTotalKg = grandTotalKg.add(r.totalKg());
        }

        return new LatexSaleReportResponse(
                fromDate, toDate, codesOf(latexTypes), labelsOf(latexTypes), rows, grandTotalByType, grandTotalKg);
    }

    /**
     * Gộp+chia đôi kg cho cặp vợ/chồng đang active (ADR-0024) — ghi đè dòng của cả 2 người bằng số
     * đã chia đôi, và THÊM dòng mới nếu 1 người chưa có dòng nào (vd cả tháng phiếu chỉ ghi tên
     * người kia, CLAUDE.md §5) vì trước đây họ không xuất hiện trong `rows` (không có raw aggregate
     * nào). Khi `employeeIdFilter` khác null (đang xem báo cáo drill-down đúng 1 người) — CHỈ cập
     * nhật dòng của đúng người được yêu cầu, không tự thêm dòng cho vợ/chồng (giữ đúng hợp đồng lọc
     * theo 1 nhân viên, khác view toàn Tổ).
     */
    private List<ProductionReportRow> applySpouseSplit(
            List<ProductionReportRow> rows, LocalDate fromDate, LocalDate toDate, UUID employeeIdFilter) {
        Map<UUID, ProductionReportRow> rowByEmployee = new LinkedHashMap<>();
        for (ProductionReportRow row : rows) {
            rowByEmployee.put(row.employeeId(), row);
        }

        Set<UUID> processedPairs = new HashSet<>();
        for (ProductionReportRow row : List.copyOf(rowByEmployee.values())) {
            Employee employee = employeeRepository.findById(row.employeeId()).orElse(null);
            Employee spouse = employee == null ? null : employee.getSpouseEmployee();
            if (spouse == null || spouse.getStatus() != EmployeeStatus.ACTIVE) {
                continue;
            }
            UUID pairKey = employee.getId().compareTo(spouse.getId()) <= 0 ? employee.getId() : spouse.getId();
            if (!processedPairs.add(pairKey)) {
                continue;
            }

            // KHÔNG dùng lại kgByLatexType đã có trong `rows` — có thể đã bị lọc theo teamId/employeeId
            // của filter đang xem (vd Admin lọc đúng 1 Tổ nhưng vợ/chồng lại thuộc Tổ khác) — tính lại
            // KHÔNG lọc gì để tổng luôn đúng bất kể đang xem theo bộ lọc nào (giống PayrollService).
            Map<String, BigDecimal> kgA = rawKgByType(employee.getId(), fromDate, toDate);
            Map<String, BigDecimal> kgB = rawKgByType(spouse.getId(), fromDate, toDate);
            if (kgA.isEmpty() && kgB.isEmpty()) {
                continue;
            }
            boolean employeeGetsFloor = employee.getId().compareTo(spouse.getId()) <= 0;

            rowByEmployee.put(employee.getId(), toRow(employee, SpouseKgSplitter.combinedHalf(kgA, kgB, employeeGetsFloor)));
            if (employeeIdFilter == null) {
                rowByEmployee.put(spouse.getId(), toRow(spouse, SpouseKgSplitter.combinedHalf(kgA, kgB, !employeeGetsFloor)));
            }
        }
        return new ArrayList<>(rowByEmployee.values());
    }

    private Map<String, BigDecimal> rawKgByType(UUID employeeId, LocalDate fromDate, LocalDate toDate) {
        return productionRecordItemRepository.aggregateForReport(fromDate, toDate, null, employeeId).stream()
                .collect(Collectors.toMap(ProductionAggregateRow::latexTypeCode, ProductionAggregateRow::totalKg));
    }

    private ProductionReportRow toRow(Employee employee, Map<String, BigDecimal> kgByType) {
        BigDecimal total = kgByType.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ProductionReportRow(employee.getTeam().getId(), employee.getTeam().getName(),
                employee.getId(), employee.getFullName(), kgByType, total);
    }

    private List<LatexType> sortedLatexTypes() {
        return latexTypeRepository.findAll().stream().sorted(Comparator.comparing(LatexType::getCode)).toList();
    }

    private List<String> codesOf(List<LatexType> latexTypes) {
        return latexTypes.stream().map(LatexType::getCode).toList();
    }

    private Map<String, String> labelsOf(List<LatexType> latexTypes) {
        return latexTypes.stream()
                .collect(Collectors.toMap(LatexType::getCode, LatexType::getLabel, (a, b) -> a, LinkedHashMap::new));
    }

    private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null) {
            throw new InvalidRequestException("fromDate và toDate là bắt buộc");
        }
        if (fromDate.isAfter(toDate)) {
            throw new InvalidRequestException("fromDate phải <= toDate");
        }
    }
}
