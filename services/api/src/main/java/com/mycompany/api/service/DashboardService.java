package com.mycompany.api.service;

import com.mycompany.api.dto.DashboardKpisResponse;
import com.mycompany.api.dto.DashboardTrendsResponse;
import com.mycompany.api.dto.PayrollDistributionSliceResponse;
import com.mycompany.api.dto.DashboardPayrollSummaryResponse;
import com.mycompany.api.dto.RecentDocumentRowResponse;
import com.mycompany.api.dto.TeamProductionShareResponse;
import com.mycompany.api.dto.TeamStatusRowResponse;
import com.mycompany.api.dto.TrendResponse;
import com.mycompany.api.dto.WorkQueueItemResponse;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.LatexSale;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.AttendanceRecordRepository;
import com.mycompany.api.repository.EffectiveRateRow;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexSaleAggregateRow;
import com.mycompany.api.repository.LatexSaleItemRepository;
import com.mycompany.api.repository.LatexSaleRepository;
import com.mycompany.api.repository.OfficialProductionRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.RateConfigRepository;
import com.mycompany.api.repository.TeamRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backend cho màn Home/Tổng quan web app (apps/web/src/features/dashboard) — thuần projection/
 * aggregation từ dữ liệu nghiệp vụ nguồn đã có (production_records, latex_sales, attendance_records,
 * employees, rate_configs), KHÔNG lưu aggregate độc lập, cùng tinh thần {@link ProductionSummaryService}.
 *
 * <p><b>Không fake dữ liệu</b> (CLAUDE.md mục 1 "Ngoài phạm vi Module 1" + DoD spec-3-web-ui-home §41/§48):
 * Module 1 CHƯA có bảng chi phí (costs) và CHƯA tính lương tự động (Module 3). Vì vậy
 * costAmount/costCount/estimatedProfit (KPI) và totalExpected (payroll-summary) LUÔN null — KHÔNG
 * tính, KHÔNG bịa. Mọi field khác trong 5 endpoint này đều tính THẬT từ dữ liệu đã lưu.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class DashboardService {

    private static final String TREND_LABEL = "so với hôm qua";
    private static final int DEFAULT_RECENT_DOCUMENTS_LIMIT = 6;
    private static final int MAX_RECENT_DOCUMENTS_LIMIT = 50;
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("dd/MM");

    private final TeamRepository teamRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final LatexSaleRepository latexSaleRepository;
    private final LatexSaleItemRepository latexSaleItemRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final RateConfigRepository rateConfigRepository;

    // ============================================================= 1. kpis

    public DashboardKpisResponse getKpis(LocalDate date) {
        ProductionTotals today = loadProductionTotals(date);
        ProductionTotals yesterday = loadProductionTotals(date.minusDays(1));
        SalesTotals todaySales = loadSalesTotals(date);
        SalesTotals yesterdaySales = loadSalesTotals(date.minusDays(1));

        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        // null khi roster rỗng — frontend tự chuyển hiển thị "N người có mặt" thay vì "N / 0"
        // (DashboardKpiGrid.tsx, xem javadoc DashboardKpisResponse).
        Integer workforceExpected = activeEmployees.isEmpty() ? null : activeEmployees.size();

        List<TeamProductionShareResponse> productionByTeam = today.kgByTeamId().entrySet().stream()
                .map(e -> new TeamProductionShareResponse(today.teamNameById().get(e.getKey()), e.getValue()))
                .sorted(Comparator.comparing(TeamProductionShareResponse::teamName))
                .toList();

        DashboardTrendsResponse trends = new DashboardTrendsResponse(
                buildTrend(today.totalKg(), yesterday.totalKg()),
                buildTrend(BigDecimal.valueOf(today.employeeIds().size()), BigDecimal.valueOf(yesterday.employeeIds().size())),
                buildTrend(todaySales.totalKg(), yesterdaySales.totalKg()),
                null, // cost — Module 1 chưa có bảng chi phí
                null // estimatedProfit — phụ thuộc cost, cũng null
        );

        return new DashboardKpisResponse(
                date,
                today.totalKg(),
                productionByTeam,
                today.employeeIds().size(),
                workforceExpected,
                todaySales.totalKg(),
                todaySales.revenue(),
                null, // costAmount
                null, // costCount
                null, // estimatedProfit
                trends);
    }

    // ============================================================= 2. work-queue

    public List<WorkQueueItemResponse> getWorkQueue(LocalDate date) {
        List<Team> allTeams = teamRepository.findAll();
        Set<UUID> teamsWithRecord =
                new HashSet<>(productionRecordRepository.findDistinctTeamIdsWithActiveRecordOnDate(date));

        long productionNeedsReviewCount =
                productionRecordRepository.findByRecordDateAndStatusAndLowConfidenceFieldsIsNotNull(date, RecordStatus.DRAFT)
                        .size();
        long latexSaleNeedsReviewCount =
                latexSaleRepository.countByRecordDateAndStatusAndLowConfidenceFieldsIsNotNull(date, RecordStatus.DRAFT);
        long needsReviewCount = productionNeedsReviewCount + latexSaleNeedsReviewCount;

        Set<UUID> employeesWithProduction = productionRecordItemRepository.aggregateActiveProductionByDate(date).stream()
                .map(OfficialProductionRow::employeeId)
                .collect(Collectors.toSet());
        long missingEmployeesCount = employeeRepository.findByStatus(EmployeeStatus.ACTIVE).stream()
                .filter(e -> !employeesWithProduction.contains(e.getId()))
                .count();

        List<WorkQueueItemResponse> items = new ArrayList<>();
        for (Team team : allTeams) {
            if (!teamsWithRecord.contains(team.getId())) {
                items.add(new WorkQueueItemResponse(
                        "missing-team-" + team.getId(),
                        "warning",
                        "Tổ " + team.getName() + " chưa có phiếu ngày " + date.format(SHORT_DATE),
                        "Cần chụp phiếu để có dữ liệu sản lượng",
                        "Chụp / Xem",
                        "/phieu?date=" + date));
            }
        }
        if (needsReviewCount > 0) {
            items.add(new WorkQueueItemResponse(
                    "needs-review-" + date,
                    "warning",
                    needsReviewCount + " phiếu cần kiểm tra",
                    "OCR có độ tin cậy thấp",
                    "Kiểm tra",
                    "/phieu?status=needs-review&date=" + date));
        }
        if (missingEmployeesCount > 0) {
            items.add(new WorkQueueItemResponse(
                    "missing-employees-" + date,
                    "error",
                    missingEmployeesCount + " người chưa có sản lượng",
                    "Không thể tính lương",
                    "Xem danh sách",
                    "/san-luong?date=" + date + "&filter=missing"));
        }

        // error trước warning trước info (Collections.sort ổn định — giữ nguyên thứ tự thêm ở trên
        // giữa các item cùng severity, vd nhiều "missing-team" theo đúng thứ tự teamRepository.findAll()).
        items.sort(Comparator.comparingInt(i -> severityRank(i.severity())));
        return items;
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "error" -> 0;
            case "warning" -> 1;
            default -> 2; // info
        };
    }

    // ============================================================= 3. teams

    public List<TeamStatusRowResponse> getTeamStatus(LocalDate date) {
        List<Team> allTeams = teamRepository.findAll();
        ProductionTotals production = loadProductionTotals(date);
        SalesTotals sales = loadSalesTotals(date);
        Set<UUID> teamsWithRecord =
                new HashSet<>(productionRecordRepository.findDistinctTeamIdsWithActiveRecordOnDate(date));
        Set<UUID> teamsNeedsReview =
                productionRecordRepository.findByRecordDateAndStatusAndLowConfidenceFieldsIsNotNull(date, RecordStatus.DRAFT)
                        .stream()
                        .map(r -> r.getTeam().getId())
                        .collect(Collectors.toSet());

        return allTeams.stream()
                .map(team -> {
                    BigDecimal productionKg = production.kgByTeamId().getOrDefault(team.getId(), BigDecimal.ZERO);
                    int workforcePresent = production.employeeIdsByTeamId().getOrDefault(team.getId(), Set.of()).size();
                    int workforceExpected =
                            employeeRepository.findByTeamIdAndStatus(team.getId(), EmployeeStatus.ACTIVE).size();
                    BigDecimal soldKg = sales.kgByTeamId().getOrDefault(team.getId(), BigDecimal.ZERO);
                    String status = !teamsWithRecord.contains(team.getId())
                            ? "missing"
                            : teamsNeedsReview.contains(team.getId()) ? "needs_review" : "complete";
                    return new TeamStatusRowResponse(
                            team.getId(), team.getName(), productionKg, workforcePresent, workforceExpected, soldKg, status);
                })
                .sorted(Comparator.comparing(TeamStatusRowResponse::teamName))
                .toList();
    }

    // ============================================================= 4. recent-documents

    public List<RecentDocumentRowResponse> getRecentDocuments(LocalDate date, int limit) {
        int effectiveLimit = limit <= 0 ? DEFAULT_RECENT_DOCUMENTS_LIMIT : Math.min(limit, MAX_RECENT_DOCUMENTS_LIMIT);

        List<ProductionRecord> productionRecords =
                productionRecordRepository.findByRecordDateAndStatusNotOrderByCreatedAtAsc(date, RecordStatus.CANCELLED);
        List<LatexSale> latexSales =
                latexSaleRepository.findByRecordDateAndStatusNotOrderByCreatedAtAsc(date, RecordStatus.CANCELLED);

        List<DocumentEntry> entries = new ArrayList<>(productionRecords.size() + latexSales.size());
        for (ProductionRecord r : productionRecords) {
            entries.add(new DocumentEntry(
                    r.getId().toString(), "production", r.getCreatedAt(), r.getRecordDate(), r.getTeam().getName(),
                    mapDocumentStatus(r.getStatus(), r.getLowConfidenceFields())));
        }
        for (LatexSale s : latexSales) {
            entries.add(new DocumentEntry(
                    s.getId().toString(), "latex_sale", s.getCreatedAt(), s.getRecordDate(), s.getTeam().getName(),
                    mapDocumentStatus(s.getStatus(), s.getLowConfidenceFields())));
        }

        // Mã phiếu PH-{yyyyMMdd}-{seq} — seq đánh theo created_at ASC TRONG NGÀY recordDate, gộp CHUNG
        // cả 2 loại phiếu (yêu cầu nghiệp vụ) — để mã ổn định, không đổi giữa các lần gọi cùng ngày.
        // Tie-break theo id khi created_at trùng (hiếm, tránh thứ tự ngẫu nhiên).
        entries.sort(Comparator.comparing(DocumentEntry::createdAt).thenComparing(DocumentEntry::id));
        String datePrefix = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        Map<String, String> codeById = new HashMap<>();
        int seq = 1;
        for (DocumentEntry e : entries) {
            codeById.put(e.id(), "PH-" + datePrefix + "-" + String.format("%04d", seq));
            seq++;
        }

        return entries.stream()
                .sorted(Comparator.comparing(DocumentEntry::createdAt).reversed())
                .limit(effectiveLimit)
                .map(e -> new RecentDocumentRowResponse(
                        e.id(), codeById.get(e.id()), e.documentType(), e.recordDate(), e.teamName(), e.status()))
                .toList();
    }

    private String mapDocumentStatus(RecordStatus status, String lowConfidenceFields) {
        return switch (status) {
            case DRAFT -> lowConfidenceFields != null ? "need_review" : "draft";
            case APPROVED -> "approved";
            // Không xuất hiện thực tế — query nguồn đã lọc statusNot=CANCELLED (CLAUDE.md §5: record
            // cancelled không hiện ở danh sách này); giữ nhánh để switch trên enum đầy đủ, không cần default.
            case CANCELLED -> "cancelled";
        };
    }

    // ============================================================= 5. payroll-summary

    public DashboardPayrollSummaryResponse getPayrollSummary(YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();

        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        int employeeCount = activeEmployees.size();

        // "complete" = có ít nhất 1 production_record HOẶC attendance_record active trong tháng
        // (yêu cầu nghiệp vụ — Module 1 chưa có workflow tính lương thật để phân loại chi tiết hơn).
        Set<UUID> employeeIdsWithData =
                new HashSet<>(productionRecordRepository.findDistinctActiveEmployeeIdsInRange(from, to));
        employeeIdsWithData.addAll(attendanceRecordRepository.findDistinctActiveEmployeeIdsInRange(from, to));

        int completeCount = (int) activeEmployees.stream().filter(e -> employeeIdsWithData.contains(e.getId())).count();
        int incompleteCount = employeeCount - completeCount;

        // Ước lượng đơn giản (yêu cầu nghiệp vụ) — chỉ tính production_record, latex_sales không có
        // employee_id nên không thể quy về 1 nhân viên cụ thể (CLAUDE.md §5).
        int needsReviewCount =
                new HashSet<>(productionRecordRepository.findDistinctNeedsReviewEmployeeIdsInRange(from, to)).size();

        List<PayrollDistributionSliceResponse> distribution = List.of(
                new PayrollDistributionSliceResponse("complete", completeCount),
                new PayrollDistributionSliceResponse("incomplete", incompleteCount),
                // Luôn 0 — Module 1 chưa có workflow xác nhận/chốt bảng lương (Module 3 ngoài phạm vi).
                new PayrollDistributionSliceResponse("pending_confirmation", 0),
                new PayrollDistributionSliceResponse("finalized", 0));

        return new DashboardPayrollSummaryResponse(
                month.toString(), null, employeeCount, needsReviewCount, distribution, "/bang-luong/" + month);
    }

    // ============================================================= helpers dùng chung

    // % thay đổi so ngày trước, làm tròn số nguyên. Bỏ hẳn field trend (trả null) nếu previous = 0 —
    // không chia 0, và "tăng từ 0" không có ý nghĩa phần trăm rõ ràng để hiển thị.
    private TrendResponse buildTrend(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        double pct = current.subtract(previous)
                .divide(previous, 6, RoundingMode.HALF_UP)
                .doubleValue() * 100;
        long rounded = Math.round(pct);
        String direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral";
        // production/workforce/sold tăng đều positive (yêu cầu nghiệp vụ — không có trend nào trong 3
        // trend này mà tăng là xấu).
        String semantic = rounded == 0 ? "neutral" : rounded > 0 ? "positive" : "negative";
        return new TrendResponse(direction, Math.abs(rounded) + "%", TREND_LABEL, semantic);
    }

    // Tổng hợp production_record_items status <> CANCELLED cho 1 ngày — dùng chung cho kpis/teams (và
    // gọi lại cho ngày hôm qua ở kpis để tính trend), tránh lặp code pivot map.
    private ProductionTotals loadProductionTotals(LocalDate date) {
        List<OfficialProductionRow> rows = productionRecordItemRepository.aggregateActiveProductionByDate(date);
        BigDecimal totalKg = BigDecimal.ZERO;
        Map<UUID, BigDecimal> kgByTeamId = new LinkedHashMap<>();
        Map<UUID, String> teamNameById = new LinkedHashMap<>();
        Set<UUID> employeeIds = new HashSet<>();
        Map<UUID, Set<UUID>> employeeIdsByTeamId = new LinkedHashMap<>();
        for (OfficialProductionRow r : rows) {
            totalKg = totalKg.add(r.kg());
            kgByTeamId.merge(r.teamId(), r.kg(), BigDecimal::add);
            teamNameById.putIfAbsent(r.teamId(), r.teamName());
            employeeIds.add(r.employeeId());
            employeeIdsByTeamId.computeIfAbsent(r.teamId(), k -> new HashSet<>()).add(r.employeeId());
        }
        return new ProductionTotals(totalKg, kgByTeamId, teamNameById, employeeIds, employeeIdsByTeamId);
    }

    // Tổng hợp latex_sale_items status <> CANCELLED cho 1 ngày + quy đổi doanh thu theo rate_configs
    // hiệu lực TẠI NGÀY ĐÓ (không phải ngày hôm nay gọi API — đúng ý nghĩa lịch sử). Loại mủ không tìm
    // thấy đơn giá hiệu lực bị BỎ QUA khỏi revenue, chỉ log WARN — không throw lỗi cả request (yêu
    // cầu nghiệp vụ, tránh 1 rate_config thiếu làm sập cả dashboard).
    private SalesTotals loadSalesTotals(LocalDate date) {
        List<LatexSaleAggregateRow> rows = latexSaleItemRepository.aggregateActiveSalesByDate(date);
        Map<String, BigDecimal> unitPriceByLatexTypeCode = rateConfigRepository.findEffectiveRatesAt(date).stream()
                .collect(Collectors.toMap(EffectiveRateRow::latexTypeCode, EffectiveRateRow::unitPrice));

        BigDecimal totalKg = BigDecimal.ZERO;
        BigDecimal revenue = BigDecimal.ZERO;
        Map<UUID, BigDecimal> kgByTeamId = new LinkedHashMap<>();
        for (LatexSaleAggregateRow r : rows) {
            totalKg = totalKg.add(r.totalKg());
            kgByTeamId.merge(r.teamId(), r.totalKg(), BigDecimal::add);
            BigDecimal unitPrice = unitPriceByLatexTypeCode.get(r.latexTypeCode());
            if (unitPrice == null) {
                log.warn("Không tìm thấy đơn giá hiệu lực cho loại mủ '{}' tại ngày {} — bỏ {} kg khỏi soldRevenue "
                        + "(dashboard, teamId={})", r.latexTypeCode(), date, r.totalKg(), r.teamId());
                continue;
            }
            revenue = revenue.add(r.totalKg().multiply(unitPrice));
        }
        return new SalesTotals(totalKg, revenue.setScale(0, RoundingMode.HALF_UP), kgByTeamId);
    }

    private record ProductionTotals(
            BigDecimal totalKg,
            Map<UUID, BigDecimal> kgByTeamId,
            Map<UUID, String> teamNameById,
            Set<UUID> employeeIds,
            Map<UUID, Set<UUID>> employeeIdsByTeamId) {
    }

    private record SalesTotals(BigDecimal totalKg, BigDecimal revenue, Map<UUID, BigDecimal> kgByTeamId) {
    }

    private record DocumentEntry(
            String id, String documentType, Instant createdAt, LocalDate recordDate, String teamName, String status) {
    }
}
