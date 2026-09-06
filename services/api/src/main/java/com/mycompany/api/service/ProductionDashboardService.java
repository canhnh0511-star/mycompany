package com.mycompany.api.service;

import com.mycompany.api.dto.ProductionAlert;
import com.mycompany.api.dto.ProductionDashboardResponse;
import com.mycompany.api.dto.ProductionDashboardSummary;
import com.mycompany.api.dto.ProductionDataCompleteness;
import com.mycompany.api.dto.ProductionHeatmapCell;
import com.mycompany.api.dto.DailyTotalPoint;
import com.mycompany.api.dto.ProductionTrendPoint;
import com.mycompany.api.dto.ProductionWorkerDetailResponse;
import com.mycompany.api.dto.RubberTypeProduction;
import com.mycompany.api.dto.TeamPerformance;
import com.mycompany.api.dto.TopWorker;
import com.mycompany.api.entity.ConflictType;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.ScanBatchConflict;
import com.mycompany.api.entity.Team;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.ScanBatchConflictRepository;
import com.mycompany.api.repository.TeamDateCountRow;
import com.mycompany.api.repository.TeamDateLatexRow;
import com.mycompany.api.repository.TeamRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dữ liệu cho màn "Báo cáo sản lượng" dashboard (docs/specs — WEB UI SPEC — BÁO CÁO SẢN LƯỢNG). CHỈ
 * tính bản ghi APPROVED cho mọi số liệu sản lượng (cùng quy ước {@link ReportService}) — draft/
 * cancelled không lọt vào KPI/trend/heatmap/team performance/top workers/rubber type breakdown.
 *
 * <p>Kỳ trước (previous period) = cùng SỐ NGÀY, ngay trước `fromDate` (spec §5.6 — "nếu date range là
 * 15 ngày, so với 15 ngày trước tương ứng, không so cả tháng").
 *
 * <p>Không tính lại chia đôi vợ/chồng (ADR-0024, xem {@link ReportService#applySpouseSplit}) — phạm
 * vi dashboard này là bức tranh tổng quan/vận hành (trend, heatmap, cảnh báo), khác báo cáo lương chi
 * tiết theo nhân viên; nhiều bảng ở đây tổng hợp theo Tổ/loại mủ nên không có 1 dòng "theo nhân viên"
 * duy nhất bị lệch — chỉ "Top công nhân" hiển thị số CHƯA chia đôi, cân nhắc bổ sung sau nếu cần.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionDashboardService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal DROP_THRESHOLD_RATIO = BigDecimal.valueOf(0.6); // giảm > 40%
    private static final BigDecimal MISSING_DATA_RATIO = BigDecimal.valueOf(0.5);
    private static final BigDecimal ATTENTION_RATIO = BigDecimal.valueOf(0.8);
    private static final BigDecimal ATTENTION_CHANGE_PERCENT = BigDecimal.valueOf(-20);
    private static final int TOP_WORKERS_LIMIT = 10;
    private static final int MAX_ALERT_ITEMS = 6;

    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final ScanBatchConflictRepository scanBatchConflictRepository;

    public ProductionDashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        validateDateRange(fromDate, toDate);
        int daysInRange = (int) (toDate.toEpochDay() - fromDate.toEpochDay() + 1);
        LocalDate previousToDate = fromDate.minusDays(1);
        LocalDate previousFromDate = previousToDate.minusDays(daysInRange - 1L);

        List<LatexType> latexTypes = latexTypeRepository.findAll().stream()
                .sorted(Comparator.comparing(LatexType::getCode)).toList();

        List<ProductionAggregateRow> currentAgg =
                productionRecordItemRepository.aggregateForReport(fromDate, toDate, teamId, null);
        List<ProductionAggregateRow> previousAgg =
                productionRecordItemRepository.aggregateForReport(previousFromDate, previousToDate, teamId, null);
        List<TeamDateLatexRow> teamDateRows = productionRecordItemRepository.aggregateTeamDateLatex(fromDate, toDate, teamId);
        List<TeamDateLatexRow> previousTeamDateRows =
                productionRecordItemRepository.aggregateTeamDateLatex(previousFromDate, previousToDate, teamId);
        List<TeamDateCountRow> employeeCountRows =
                productionRecordRepository.countApprovedEmployeesByTeamDate(fromDate, toDate, teamId);
        List<TeamDateCountRow> documentCountRows =
                productionRecordRepository.countDocumentsByTeamDate(fromDate, toDate, teamId);

        Map<LocalDate, BigDecimal> dailyTotalCurrent = sumByDate(teamDateRows);
        Map<LocalDate, BigDecimal> dailyTotalPrevious = sumByDate(previousTeamDateRows);

        ProductionDashboardSummary summary =
                buildSummary(currentAgg, dailyTotalCurrent, dailyTotalPrevious, daysInRange);
        List<ProductionTrendPoint> trend =
                buildTrend(fromDate, toDate, previousFromDate, dailyTotalCurrent, dailyTotalPrevious);
        List<RubberTypeProduction> rubberTypes = buildRubberTypes(currentAgg, latexTypes);
        List<TeamPerformance> teamPerformance =
                buildTeamPerformance(teamId, currentAgg, previousAgg, teamDateRows, daysInRange);
        List<TopWorker> topWorkers = buildTopWorkers(currentAgg);
        ProductionDataCompleteness completeness =
                buildCompleteness(fromDate, toDate, teamId, dailyTotalCurrent.keySet(), daysInRange);
        List<ProductionAlert> alerts = buildAlerts(fromDate, toDate, teamId, teamDateRows, dailyTotalCurrent);
        List<ProductionHeatmapCell> heatmap = buildHeatmap(
                fromDate, toDate, teamId, teamDateRows, employeeCountRows, documentCountRows);

        return new ProductionDashboardResponse(
                fromDate, toDate, previousFromDate, previousToDate,
                codesOf(latexTypes), labelsOf(latexTypes),
                summary, trend, rubberTypes, teamPerformance, topWorkers, alerts, completeness, heatmap);
    }

    // ProductionWorkerDrawer (spec §9.3) — chi tiết 1 công nhân: tổng kỳ, breakdown loại mủ (tái dùng
    // aggregateForReport lọc theo employeeId — cùng query ReportService dùng), lịch sử theo ngày.
    public ProductionWorkerDetailResponse getWorkerDetail(UUID employeeId, LocalDate fromDate, LocalDate toDate) {
        validateDateRange(fromDate, toDate);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với id=" + employeeId));

        List<ProductionAggregateRow> agg =
                productionRecordItemRepository.aggregateForReport(fromDate, toDate, null, employeeId);
        Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (ProductionAggregateRow row : agg) {
            kgByType.merge(row.latexTypeCode(), row.totalKg(), BigDecimal::add);
            total = total.add(row.totalKg());
        }

        List<com.mycompany.api.repository.DailyTotalRow> dailyRows =
                productionRecordItemRepository.aggregateDailyTotalsForEmployee(fromDate, toDate, employeeId);
        List<DailyTotalPoint> dailyTrend = dailyRows.stream()
                .sorted(Comparator.comparing(com.mycompany.api.repository.DailyTotalRow::recordDate))
                .map(r -> new DailyTotalPoint(r.recordDate(), r.totalKg()))
                .toList();

        return new ProductionWorkerDetailResponse(
                employee.getId().toString(), employee.getFullName(), employee.getTeam().getName(),
                fromDate, toDate, total, dailyRows.size(), kgByType, dailyTrend);
    }

    // ---- summary (spec §5) ----

    private ProductionDashboardSummary buildSummary(
            List<ProductionAggregateRow> currentAgg, Map<LocalDate, BigDecimal> dailyTotalCurrent,
            Map<LocalDate, BigDecimal> dailyTotalPrevious, int daysInRange) {
        BigDecimal totalKg = currentAgg.stream().map(ProductionAggregateRow::totalKg).reduce(BigDecimal.ZERO, BigDecimal::add);
        int recordedDayCount = dailyTotalCurrent.size();
        Set<UUID> workers = currentAgg.stream().map(ProductionAggregateRow::employeeId).collect(Collectors.toSet());
        int workerCount = workers.size();

        BigDecimal averagePerRecordedDayKg = recordedDayCount > 0
                ? totalKg.divide(BigDecimal.valueOf(recordedDayCount), 2, RoundingMode.HALF_UP) : null;
        BigDecimal averagePerWorkerKg = workerCount > 0
                ? totalKg.divide(BigDecimal.valueOf(workerCount), 2, RoundingMode.HALF_UP) : null;

        boolean previousAvailable = !dailyTotalPrevious.isEmpty();
        BigDecimal previousTotal = dailyTotalPrevious.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal changeKg = previousAvailable ? totalKg.subtract(previousTotal) : null;
        BigDecimal changePercent = previousAvailable && previousTotal.compareTo(BigDecimal.ZERO) > 0
                ? changeKg.divide(previousTotal, 4, RoundingMode.HALF_UP).multiply(HUNDRED).setScale(1, RoundingMode.HALF_UP)
                : null;

        return new ProductionDashboardSummary(
                totalKg, averagePerRecordedDayKg, averagePerWorkerKg, recordedDayCount, workerCount,
                daysInRange, recordedDayCount, changePercent, changeKg, previousAvailable);
    }

    // ---- trend (spec §6) ----

    private List<ProductionTrendPoint> buildTrend(
            LocalDate fromDate, LocalDate toDate, LocalDate previousFromDate,
            Map<LocalDate, BigDecimal> dailyTotalCurrent, Map<LocalDate, BigDecimal> dailyTotalPrevious) {
        List<ProductionTrendPoint> points = new ArrayList<>();
        for (LocalDate d = fromDate; !d.isAfter(toDate); d = d.plusDays(1)) {
            long offset = d.toEpochDay() - fromDate.toEpochDay();
            LocalDate previousDate = previousFromDate.plusDays(offset);
            points.add(new ProductionTrendPoint(
                    d, dailyTotalCurrent.get(d), previousDate, dailyTotalPrevious.get(previousDate)));
        }
        return points;
    }

    // ---- rubber type breakdown (spec §7) ----

    private List<RubberTypeProduction> buildRubberTypes(List<ProductionAggregateRow> currentAgg, List<LatexType> latexTypes) {
        Map<String, BigDecimal> byCode = new HashMap<>();
        for (ProductionAggregateRow row : currentAgg) {
            byCode.merge(row.latexTypeCode(), row.totalKg(), BigDecimal::add);
        }
        BigDecimal total = byCode.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return latexTypes.stream()
                .map(lt -> {
                    BigDecimal kg = byCode.getOrDefault(lt.getCode(), BigDecimal.ZERO);
                    BigDecimal pct = total.compareTo(BigDecimal.ZERO) > 0
                            ? kg.divide(total, 4, RoundingMode.HALF_UP).multiply(HUNDRED).setScale(1, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return new RubberTypeProduction(lt.getCode(), lt.getLabel(), kg, pct);
                })
                .sorted(Comparator.comparing(RubberTypeProduction::productionKg).reversed())
                .toList();
    }

    // ---- team performance (spec §8) ----

    private List<TeamPerformance> buildTeamPerformance(
            UUID teamIdFilter, List<ProductionAggregateRow> currentAgg, List<ProductionAggregateRow> previousAgg,
            List<TeamDateLatexRow> teamDateRows, int daysInRange) {
        // Seed từ TOÀN BỘ Tổ (lọc theo teamIdFilter) — KHÔNG chỉ Tổ có mặt trong currentAgg, để 1 Tổ
        // hoàn toàn chưa có bản ghi APPROVED nào trong kỳ vẫn hiện ra với status MISSING_DATA thay vì
        // biến mất khỏi bảng (spec §8.2/§25 "dynamic number of teams" — Tổ thiếu dữ liệu vẫn là 1 Tổ).
        Map<UUID, String> teamNames = new LinkedHashMap<>();
        List<Team> allTeams = teamIdFilter != null
                ? teamRepository.findById(teamIdFilter).map(List::of).orElse(List.of())
                : teamRepository.findAll();
        allTeams.stream().sorted(Comparator.comparing(Team::getName)).forEach(t -> teamNames.put(t.getId(), t.getName()));

        Map<UUID, BigDecimal> totalByTeam = new HashMap<>();
        Map<UUID, Set<UUID>> workersByTeam = new HashMap<>();
        for (ProductionAggregateRow row : currentAgg) {
            teamNames.putIfAbsent(row.teamId(), row.teamName());
            totalByTeam.merge(row.teamId(), row.totalKg(), BigDecimal::add);
            workersByTeam.computeIfAbsent(row.teamId(), k -> new HashSet<>()).add(row.employeeId());
        }
        Map<UUID, BigDecimal> previousTotalByTeam = new HashMap<>();
        for (ProductionAggregateRow row : previousAgg) {
            previousTotalByTeam.merge(row.teamId(), row.totalKg(), BigDecimal::add);
        }
        Map<UUID, Set<LocalDate>> daysWithDataByTeam = new HashMap<>();
        for (TeamDateLatexRow row : teamDateRows) {
            daysWithDataByTeam.computeIfAbsent(row.teamId(), k -> new HashSet<>()).add(row.recordDate());
        }

        List<TeamPerformance> result = new ArrayList<>();
        for (Map.Entry<UUID, String> entry : teamNames.entrySet()) {
            UUID teamId = entry.getKey();
            BigDecimal totalKg = totalByTeam.getOrDefault(teamId, BigDecimal.ZERO);
            int workerCount = workersByTeam.getOrDefault(teamId, Set.of()).size();
            BigDecimal averagePerWorkerKg = workerCount > 0
                    ? totalKg.divide(BigDecimal.valueOf(workerCount), 2, RoundingMode.HALF_UP) : null;
            BigDecimal previousTotal = previousTotalByTeam.get(teamId);
            BigDecimal changePercent = previousTotal != null && previousTotal.compareTo(BigDecimal.ZERO) > 0
                    ? totalKg.subtract(previousTotal).divide(previousTotal, 4, RoundingMode.HALF_UP)
                            .multiply(HUNDRED).setScale(1, RoundingMode.HALF_UP)
                    : null;
            int daysWithData = daysWithDataByTeam.getOrDefault(teamId, Set.of()).size();
            BigDecimal completenessRatio = daysInRange > 0
                    ? BigDecimal.valueOf(daysWithData).divide(BigDecimal.valueOf(daysInRange), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            String status;
            if (completenessRatio.compareTo(MISSING_DATA_RATIO) < 0) {
                status = "MISSING_DATA";
            } else if (changePercent != null && changePercent.compareTo(ATTENTION_CHANGE_PERCENT) <= 0) {
                status = "ATTENTION";
            } else if (completenessRatio.compareTo(ATTENTION_RATIO) < 0) {
                status = "ATTENTION";
            } else {
                status = "GOOD";
            }

            result.add(new TeamPerformance(teamId, entry.getValue(), totalKg, workerCount, averagePerWorkerKg, changePercent, status));
        }
        return result.stream().sorted(Comparator.comparing(TeamPerformance::teamName)).toList();
    }

    // ---- top workers (spec §9) ----

    private List<TopWorker> buildTopWorkers(List<ProductionAggregateRow> currentAgg) {
        record Acc(String employeeName, UUID teamId, String teamName, BigDecimal kg) { }
        Map<UUID, Acc> byEmployee = new LinkedHashMap<>();
        for (ProductionAggregateRow row : currentAgg) {
            byEmployee.merge(row.employeeId(),
                    new Acc(row.employeeName(), row.teamId(), row.teamName(), row.totalKg()),
                    (a, b) -> new Acc(a.employeeName(), a.teamId(), a.teamName(), a.kg().add(b.kg())));
        }
        return byEmployee.entrySet().stream()
                .map(e -> new TopWorker(e.getKey(), e.getValue().employeeName(), e.getValue().teamId(),
                        e.getValue().teamName(), e.getValue().kg()))
                .sorted(Comparator.comparing(TopWorker::productionKg).reversed())
                .limit(TOP_WORKERS_LIMIT)
                .toList();
    }

    // ---- completeness (spec §11) ----

    private ProductionDataCompleteness buildCompleteness(
            LocalDate fromDate, LocalDate toDate, UUID teamId, Set<LocalDate> confirmedDates, int daysInRange) {
        List<ProductionRecord> draftRecords = teamId != null
                ? productionRecordRepository.findByStatusAndRecordDateBetweenAndTeamId(RecordStatus.DRAFT, fromDate, toDate, teamId)
                : productionRecordRepository.findByStatusAndRecordDateBetween(RecordStatus.DRAFT, fromDate, toDate);
        Set<LocalDate> draftDates = draftRecords.stream().map(ProductionRecord::getRecordDate).collect(Collectors.toSet());
        draftDates.removeAll(confirmedDates);

        int confirmedDays = confirmedDates.size();
        int pendingDays = draftDates.size();
        int noDataDays = Math.max(0, daysInRange - confirmedDays - pendingDays);
        int completionPercent = daysInRange > 0 ? Math.round(confirmedDays * 100f / daysInRange) : 0;
        int documentsNeedingReview = scanBatchConflictRepository.findOpenBlockingInRange(fromDate, toDate, teamId).size();

        return new ProductionDataCompleteness(daysInRange, confirmedDays, pendingDays, noDataDays, completionPercent, documentsNeedingReview);
    }

    // ---- alerts (spec §10) ----

    private List<ProductionAlert> buildAlerts(
            LocalDate fromDate, LocalDate toDate, UUID teamId,
            List<TeamDateLatexRow> teamDateRows, Map<LocalDate, BigDecimal> dailyTotalCurrent) {
        List<ProductionAlert> alerts = new ArrayList<>();
        alerts.addAll(buildProductionDropAlerts(teamDateRows));
        alerts.addAll(buildMissingDataAlert(fromDate, toDate, teamId));
        alerts.addAll(buildOcrMismatchAlerts(fromDate, toDate, teamId));
        alerts.addAll(buildUnconfirmedAlert(fromDate, toDate, teamId));
        return alerts;
    }

    // A. Sản lượng giảm bất thường (spec §10.1.A) — so với TB ngày có dữ liệu của chính Tổ đó.
    private List<ProductionAlert> buildProductionDropAlerts(List<TeamDateLatexRow> teamDateRows) {
        Map<UUID, String> teamNames = new LinkedHashMap<>();
        Map<UUID, Map<LocalDate, BigDecimal>> byTeamDate = new HashMap<>();
        for (TeamDateLatexRow row : teamDateRows) {
            teamNames.putIfAbsent(row.teamId(), row.teamName());
            byTeamDate.computeIfAbsent(row.teamId(), k -> new HashMap<>())
                    .merge(row.recordDate(), row.totalKg(), BigDecimal::add);
        }

        List<ProductionAlert> alerts = new ArrayList<>();
        for (Map.Entry<UUID, Map<LocalDate, BigDecimal>> entry : byTeamDate.entrySet()) {
            Map<LocalDate, BigDecimal> dayTotals = entry.getValue();
            if (dayTotals.size() < 3) continue; // cần đủ cơ sở để tính TB mới cảnh báo bất thường
            BigDecimal sum = dayTotals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avg = sum.divide(BigDecimal.valueOf(dayTotals.size()), 4, RoundingMode.HALF_UP);
            BigDecimal threshold = avg.multiply(DROP_THRESHOLD_RATIO);
            List<LocalDate> droppedDates = dayTotals.entrySet().stream()
                    .filter(e -> e.getValue().compareTo(threshold) < 0)
                    .map(Map.Entry::getKey)
                    .sorted()
                    .toList();
            if (droppedDates.isEmpty()) continue;
            String teamName = teamNames.get(entry.getKey());
            String dateList = droppedDates.stream().limit(MAX_ALERT_ITEMS)
                    .map(d -> String.format("%02d/%02d", d.getDayOfMonth(), d.getMonthValue()))
                    .collect(Collectors.joining(", "));
            alerts.add(new ProductionAlert(
                    "drop-" + entry.getKey(),
                    "AMBER",
                    "PRODUCTION_DROP",
                    teamName + " có " + droppedDates.size() + " ngày sản lượng giảm mạnh",
                    "Ngày " + dateList + ", giảm hơn 40% so với trung bình của Tổ trong kỳ",
                    "TEAM",
                    entry.getKey(),
                    droppedDates.get(droppedDates.size() - 1),
                    null));
        }
        return alerts;
    }

    // B. Thiếu dữ liệu (spec §10.1.B) — chỉ xét ngày gần nhất trong khoảng lọc (không <= hôm nay thì bỏ
    // qua vì "thiếu dữ liệu" chỉ có ý nghĩa với ngày đã qua/hôm nay, không phải ngày tương lai).
    private List<ProductionAlert> buildMissingDataAlert(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        LocalDate today = LocalDate.now();
        LocalDate checkDate = toDate.isAfter(today) ? today : toDate;
        if (checkDate.isBefore(fromDate)) return List.of();

        List<Employee> activeEmployees = teamId != null
                ? employeeRepository.findByTeamIdAndStatus(teamId, EmployeeStatus.ACTIVE)
                : employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        if (activeEmployees.isEmpty()) return List.of();

        Set<UUID> presentIds = new HashSet<>(
                productionRecordRepository.findDistinctEmployeeIdsWithRecordOnDate(checkDate, teamId));
        List<String> missingNames = activeEmployees.stream()
                .filter(e -> !presentIds.contains(e.getId()))
                .map(Employee::getFullName)
                .sorted()
                .toList();
        if (missingNames.isEmpty()) return List.of();

        String dateLabel = String.format("%02d/%02d/%d", checkDate.getDayOfMonth(), checkDate.getMonthValue(), checkDate.getYear());
        String namesPreview = missingNames.stream().limit(MAX_ALERT_ITEMS).collect(Collectors.joining(", "))
                + (missingNames.size() > MAX_ALERT_ITEMS ? " và " + (missingNames.size() - MAX_ALERT_ITEMS) + " người khác" : "");

        return List.of(new ProductionAlert(
                "missing-" + checkDate,
                "AMBER",
                "MISSING_DATA",
                missingNames.size() + " công nhân chưa có dữ liệu ngày " + dateLabel,
                namesPreview,
                "DATE",
                teamId,
                checkDate,
                null));
    }

    // C. OCR lệch tổng chưa xử lý (spec §10.1.C).
    private List<ProductionAlert> buildOcrMismatchAlerts(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        List<ScanBatchConflict> conflicts = scanBatchConflictRepository
                .findOpenByTypeInRange(ConflictType.TOTAL_MISMATCH, fromDate, toDate, teamId);
        if (conflicts.isEmpty()) return List.of();

        ScanBatchConflict first = conflicts.get(0);
        LocalDate workDate = first.getScanBatch().getWorkDate();
        String dateLabel = String.format("%02d/%02d/%d", workDate.getDayOfMonth(), workDate.getMonthValue(), workDate.getYear());
        String title = conflicts.size() == 1
                ? "1 phiếu OCR lệch tổng chưa xác nhận"
                : conflicts.size() + " phiếu OCR lệch tổng chưa xác nhận";
        return List.of(new ProductionAlert(
                "ocr-mismatch",
                "RED",
                "OCR_MISMATCH",
                title,
                "Gần nhất: Tổ " + first.getScanBatch().getTeam().getName() + " ngày " + dateLabel,
                "SCAN_BATCH",
                first.getScanBatch().getTeam().getId(),
                workDate,
                first.getScanBatch().getId()));
    }

    // D. Phiếu chưa chốt (spec §10.1.D).
    private List<ProductionAlert> buildUnconfirmedAlert(LocalDate fromDate, LocalDate toDate, UUID teamId) {
        List<ProductionRecord> drafts = teamId != null
                ? productionRecordRepository.findByStatusAndRecordDateBetweenAndTeamId(RecordStatus.DRAFT, fromDate, toDate, teamId)
                : productionRecordRepository.findByStatusAndRecordDateBetween(RecordStatus.DRAFT, fromDate, toDate);
        if (drafts.isEmpty()) return List.of();

        LocalDate earliest = drafts.stream().map(ProductionRecord::getRecordDate).min(LocalDate::compareTo).orElse(fromDate);
        return List.of(new ProductionAlert(
                "unconfirmed",
                "BLUE",
                "UNCONFIRMED",
                drafts.size() + " phiếu đang ở trạng thái chờ xác nhận",
                "Từ ngày " + String.format("%02d/%02d/%d", earliest.getDayOfMonth(), earliest.getMonthValue(), earliest.getYear()),
                "DATE",
                teamId,
                earliest,
                null));
    }

    // ---- heatmap (spec §12) ----

    private List<ProductionHeatmapCell> buildHeatmap(
            LocalDate fromDate, LocalDate toDate, UUID teamId, List<TeamDateLatexRow> teamDateRows,
            List<TeamDateCountRow> employeeCountRows, List<TeamDateCountRow> documentCountRows) {
        List<Team> teams = teamId != null
                ? teamRepository.findById(teamId).map(List::of).orElse(List.of())
                : teamRepository.findAll().stream().sorted(Comparator.comparing(Team::getName)).toList();

        record TeamDate(UUID teamId, LocalDate date) { }
        Map<TeamDate, BigDecimal> kgByCell = new HashMap<>();
        Map<TeamDate, Map<String, BigDecimal>> kgByCellType = new HashMap<>();
        for (TeamDateLatexRow row : teamDateRows) {
            TeamDate key = new TeamDate(row.teamId(), row.recordDate());
            kgByCell.merge(key, row.totalKg(), BigDecimal::add);
            kgByCellType.computeIfAbsent(key, k -> new LinkedHashMap<>()).merge(row.latexTypeCode(), row.totalKg(), BigDecimal::add);
        }
        Map<TeamDate, Long> employeeCountByCell = employeeCountRows.stream()
                .collect(Collectors.toMap(r -> new TeamDate(r.teamId(), r.recordDate()), TeamDateCountRow::count));
        Map<TeamDate, Long> documentCountByCell = documentCountRows.stream()
                .collect(Collectors.toMap(r -> new TeamDate(r.teamId(), r.recordDate()), TeamDateCountRow::count));

        List<ProductionHeatmapCell> cells = new ArrayList<>();
        for (Team team : teams) {
            for (LocalDate d = fromDate; !d.isAfter(toDate); d = d.plusDays(1)) {
                TeamDate key = new TeamDate(team.getId(), d);
                BigDecimal kg = kgByCell.get(key);
                Long employeeCount = employeeCountByCell.get(key);
                long documentCount = documentCountByCell.getOrDefault(key, 0L);
                cells.add(new ProductionHeatmapCell(
                        d, team.getId(), team.getName(), kg,
                        employeeCount == null ? null : employeeCount.intValue(),
                        (int) documentCount,
                        kgByCellType.getOrDefault(key, Map.of())));
            }
        }
        return cells;
    }

    // ---- helpers ----

    private Map<LocalDate, BigDecimal> sumByDate(List<TeamDateLatexRow> rows) {
        Map<LocalDate, BigDecimal> result = new HashMap<>();
        for (TeamDateLatexRow row : rows) {
            result.merge(row.recordDate(), row.totalKg(), BigDecimal::add);
        }
        return result;
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
