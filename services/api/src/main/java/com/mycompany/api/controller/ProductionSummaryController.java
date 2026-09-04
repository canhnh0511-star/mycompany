package com.mycompany.api.controller;

import com.mycompany.api.dto.EmployeeSearchResult;
import com.mycompany.api.dto.MonthlyProductionResponse;
import com.mycompany.api.dto.ProductionSummaryDailyResponse;
import com.mycompany.api.dto.TeamBreakdownResponse;
import com.mycompany.api.service.ProductionSummaryService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Sản lượng v2" (Phase 4, Spec 2 docs/specs/spec-2-san-luong-v2.md) — sibling của
 * {@link ReportController} (shape khác hẳn: pivot theo derived team status + drill-down, không phải
 * bảng phẳng theo khoảng ngày), tái dùng {@link ProductionSummaryService}.
 *
 * <p><b>Deviation có chủ đích so với plan gốc</b> — KHÔNG có {@code /export/xlsx} riêng ở đây: audit
 * xác nhận {@code ReportController#exportProductionXlsx} (GET /api/v1/reports/production-records/export/xlsx)
 * đã export ĐÚNG Official Production (filter status=APPROVED sẵn có, xem ReportService), chỉ cần gọi
 * với {@code fromDate=toDate=workDate} là đủ theo Spec 2 §39 — thêm 1 endpoint gần như trùng lặp vi
 * phạm thẳng Spec 2 §42 ("Không tạo API mới nếu source đã có API phù hợp").
 */
@RestController
@RequestMapping("/api/v1/production-summary")
@RequiredArgsConstructor
public class ProductionSummaryController {

    private final ProductionSummaryService productionSummaryService;

    @GetMapping("/daily")
    public ProductionSummaryDailyResponse daily(
            @RequestParam LocalDate workDate,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) String latexTypeCode) {
        return productionSummaryService.getDaily(workDate, teamId, latexTypeCode);
    }

    @GetMapping("/team/{teamId}/breakdown")
    public TeamBreakdownResponse teamBreakdown(
            @PathVariable UUID teamId,
            @RequestParam LocalDate workDate,
            @RequestParam(required = false) String latexTypeCode) {
        return productionSummaryService.getTeamBreakdown(teamId, workDate, latexTypeCode);
    }

    @GetMapping("/monthly")
    public MonthlyProductionResponse monthly(
            @RequestParam YearMonth yearMonth, @RequestParam(required = false) UUID teamId) {
        return productionSummaryService.getMonthly(yearMonth, teamId);
    }

    @GetMapping("/employee-search")
    public List<EmployeeSearchResult> employeeSearch(
            @RequestParam String query, @RequestParam(required = false) UUID teamId) {
        return productionSummaryService.searchEmployees(query, teamId);
    }
}
