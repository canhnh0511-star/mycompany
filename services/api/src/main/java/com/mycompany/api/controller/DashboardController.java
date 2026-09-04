package com.mycompany.api.controller;

import com.mycompany.api.dto.DashboardKpisResponse;
import com.mycompany.api.dto.DashboardPayrollSummaryResponse;
import com.mycompany.api.dto.RecentDocumentRowResponse;
import com.mycompany.api.dto.TeamStatusRowResponse;
import com.mycompany.api.dto.WorkQueueItemResponse;
import com.mycompany.api.service.DashboardService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Màn Home/Tổng quan web app (apps/web/src/features/dashboard) — 5 endpoint riêng biệt, mỗi panel
 * gọi API của mình (không gộp 1 endpoint) để 1 widget lỗi không kéo sập cả dashboard, khớp
 * apps/web/src/features/dashboard/api/dashboard.api.ts (đã viết sẵn ở FE, đây là phần backend hiện
 * thực hợp đồng đó). Xem javadoc {@link DashboardService} về nguyên tắc không fake dữ liệu.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/kpis")
    public DashboardKpisResponse kpis(@RequestParam LocalDate date) {
        return dashboardService.getKpis(date);
    }

    @GetMapping("/work-queue")
    public List<WorkQueueItemResponse> workQueue(@RequestParam LocalDate date) {
        return dashboardService.getWorkQueue(date);
    }

    @GetMapping("/teams")
    public List<TeamStatusRowResponse> teams(@RequestParam LocalDate date) {
        return dashboardService.getTeamStatus(date);
    }

    @GetMapping("/recent-documents")
    public List<RecentDocumentRowResponse> recentDocuments(
            @RequestParam LocalDate date, @RequestParam(defaultValue = "6") int limit) {
        return dashboardService.getRecentDocuments(date, limit);
    }

    @GetMapping("/payroll-summary")
    public DashboardPayrollSummaryResponse payrollSummary(@RequestParam YearMonth month) {
        return dashboardService.getPayrollSummary(month);
    }
}
