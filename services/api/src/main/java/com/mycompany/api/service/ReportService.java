package com.mycompany.api.service;

import com.mycompany.api.dto.DailyTotalPoint;
import com.mycompany.api.dto.LatexSaleReportResponse;
import com.mycompany.api.dto.LatexSaleReportRow;
import com.mycompany.api.dto.ProductionDailyTrendResponse;
import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.dto.ProductionReportRow;
import com.mycompany.api.dto.ProductionReportTeamSubtotal;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.DailyTotalRow;
import com.mycompany.api.repository.LatexSaleAggregateRow;
import com.mycompany.api.repository.LatexSaleItemRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final LatexSaleItemRepository latexSaleItemRepository;
    private final LatexTypeRepository latexTypeRepository;

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

    public ProductionDailyTrendResponse productionDailyTrend(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        validateDateRange(fromDate, toDate);
        List<DailyTotalRow> raw = productionRecordItemRepository.aggregateDailyTotals(fromDate, toDate, teamId);
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
