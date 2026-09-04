package com.mycompany.api.controller;

import com.mycompany.api.dto.PayrollDetailResponse;
import com.mycompany.api.dto.PayrollRowResponse;
import com.mycompany.api.dto.PayrollSummaryResponse;
import com.mycompany.api.dto.UpdateDeductionRequest;
import com.mycompany.api.dto.UpdateTechnicalGradeRequest;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.PayrollService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Module 3 — Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). CHỈ tra cứu/tổng hợp —
 * không có endpoint sửa trực tiếp tổng lương (mục 0/49 spec gốc: "không có Sửa tổng sản lượng"),
 * chỉ sửa 2 input hợp lệ (Trừ/Tạm ứng, Hạng kỹ thuật theo tháng).
 */
@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService payrollService;

    @GetMapping
    public PayrollSummaryResponse summary(
            @RequestParam String yearMonth,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query) {
        return payrollService.summary(yearMonth, teamId, status, query);
    }

    @GetMapping("/{employeeId}")
    public PayrollDetailResponse detail(@PathVariable UUID employeeId, @RequestParam String yearMonth) {
        return payrollService.detail(employeeId, yearMonth);
    }

    @PatchMapping("/{employeeId}/deduction")
    public PayrollRowResponse updateDeduction(@PathVariable UUID employeeId, @RequestParam String yearMonth,
            @Valid @RequestBody UpdateDeductionRequest request, @AuthenticationPrincipal User currentUser) {
        return payrollService.updateDeduction(employeeId, yearMonth, request.amount(), currentUser);
    }

    @PatchMapping("/{employeeId}/technical-grade")
    public PayrollRowResponse updateTechnicalGrade(@PathVariable UUID employeeId, @RequestParam String yearMonth,
            @Valid @RequestBody UpdateTechnicalGradeRequest request, @AuthenticationPrincipal User currentUser) {
        return payrollService.updateTechnicalGrade(employeeId, yearMonth, request.grade(), currentUser);
    }

    // "Chốt lương" — cờ đơn giản theo THÁNG, KHÔNG immutable (mục 2.4 spec — dữ liệu vẫn sửa được
    // sau khi chốt, đây chỉ là đánh dấu hiển thị).
    @PostMapping("/lock")
    public PayrollSummaryResponse lock(@RequestParam String yearMonth, @AuthenticationPrincipal User currentUser) {
        return payrollService.lock(yearMonth, currentUser);
    }

    @PostMapping("/unlock")
    public PayrollSummaryResponse unlock(@RequestParam String yearMonth) {
        return payrollService.unlock(yearMonth);
    }
}
