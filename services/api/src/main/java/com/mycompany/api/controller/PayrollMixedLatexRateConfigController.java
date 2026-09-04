package com.mycompany.api.controller;

import com.mycompany.api.dto.CreatePayrollMixedLatexRateConfigRequest;
import com.mycompany.api.dto.PayrollMixedLatexRateConfigResponse;
import com.mycompany.api.dto.UpdatePayrollMixedLatexRateConfigRequest;
import com.mycompany.api.service.PayrollMixedLatexRateConfigService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** "Mủ tạp" (Module 3 — Bảng lương). Không có DELETE — giữ lịch sử đơn giá (time-versioned). */
@RestController
@RequestMapping("/api/v1/payroll-mixed-latex-rate-configs")
@RequiredArgsConstructor
public class PayrollMixedLatexRateConfigController {

    private final PayrollMixedLatexRateConfigService service;

    @GetMapping
    public List<PayrollMixedLatexRateConfigResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public PayrollMixedLatexRateConfigResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<PayrollMixedLatexRateConfigResponse> create(
            @Valid @RequestBody CreatePayrollMixedLatexRateConfigRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PatchMapping("/{id}")
    public PayrollMixedLatexRateConfigResponse update(
            @PathVariable UUID id, @Valid @RequestBody UpdatePayrollMixedLatexRateConfigRequest request) {
        return service.update(id, request);
    }
}
