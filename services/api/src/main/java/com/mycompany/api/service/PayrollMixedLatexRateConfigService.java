package com.mycompany.api.service;

import com.mycompany.api.dto.CreatePayrollMixedLatexRateConfigRequest;
import com.mycompany.api.dto.PayrollMixedLatexRateConfigResponse;
import com.mycompany.api.dto.UpdatePayrollMixedLatexRateConfigRequest;
import com.mycompany.api.entity.PayrollMixedLatexRateConfig;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.PayrollMixedLatexRateConfigRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Mủ tạp" (Module 3 — Bảng lương, docs/specs/spec-3-bang-luong-v1-draft.md mục 2.1) — CRUD đơn
 * giá gộp cho payroll, cùng mô hình time-versioned + chống chồng lấn như RateConfigService, nhưng
 * KHÔNG có key phân biệt (latexTypeId/code) — chỉ 1 dòng hiệu lực tại 1 thời điểm cho TOÀN hệ
 * thống, nên checkNoOverlap so với TOÀN BỘ bản ghi, không lọc theo field nào.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PayrollMixedLatexRateConfigService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PayrollMixedLatexRateConfigRepository repository;

    public List<PayrollMixedLatexRateConfigResponse> list() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    public PayrollMixedLatexRateConfigResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public PayrollMixedLatexRateConfigResponse create(CreatePayrollMixedLatexRateConfigRequest request) {
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(request.effectiveFrom(), request.effectiveTo(), null);

        PayrollMixedLatexRateConfig config = PayrollMixedLatexRateConfig.builder()
                .unitPrice(request.unitPrice())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .build();
        return toResponse(repository.save(config));
    }

    @Transactional
    public PayrollMixedLatexRateConfigResponse update(UUID id, UpdatePayrollMixedLatexRateConfigRequest request) {
        PayrollMixedLatexRateConfig config = findOrThrow(id);
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(request.effectiveFrom(), request.effectiveTo(), id);

        config.setUnitPrice(request.unitPrice());
        config.setEffectiveFrom(request.effectiveFrom());
        config.setEffectiveTo(request.effectiveTo());
        return toResponse(repository.save(config));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (to != null && !to.isAfter(from)) {
            throw new InvalidRequestException("effectiveTo phải sau effectiveFrom");
        }
    }

    private void checkNoOverlap(LocalDate from, LocalDate to, UUID excludeId) {
        for (PayrollMixedLatexRateConfig other : repository.findAll()) {
            if (excludeId != null && other.getId().equals(excludeId)) {
                continue;
            }
            if (DateRangeOverlap.overlaps(from, to, other.getEffectiveFrom(), other.getEffectiveTo())) {
                throw new ConflictException(
                        "Khoảng hiệu lực chồng lấn với 1 payroll_mixed_latex_rate_config khác (id=" + other.getId()
                                + ", " + other.getEffectiveFrom().format(DATE_FORMAT) + " → "
                                + (other.getEffectiveTo() == null ? "vô thời hạn" : other.getEffectiveTo().format(DATE_FORMAT)) + ")");
            }
        }
    }

    private PayrollMixedLatexRateConfig findOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy payroll_mixed_latex_rate_config với id=" + id));
    }

    private PayrollMixedLatexRateConfigResponse toResponse(PayrollMixedLatexRateConfig config) {
        return new PayrollMixedLatexRateConfigResponse(
                config.getId(), config.getUnitPrice(), config.getEffectiveFrom(), config.getEffectiveTo());
    }
}
