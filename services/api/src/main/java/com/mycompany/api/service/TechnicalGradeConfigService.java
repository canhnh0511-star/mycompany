package com.mycompany.api.service;

import com.mycompany.api.dto.CreateTechnicalGradeConfigRequest;
import com.mycompany.api.dto.TechnicalGradeConfigResponse;
import com.mycompany.api.dto.UpdateTechnicalGradeConfigRequest;
import com.mycompany.api.entity.TechnicalGrade;
import com.mycompany.api.entity.TechnicalGradeConfig;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.TechnicalGradeConfigRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Hạng kỹ thuật" (Module 3 — Bảng lương, docs/specs/spec-3-bang-luong-v1-draft.md mục 2.2) — CRUD
 * đơn giá theo hạng A/B/C, cùng mô hình time-versioned + chống chồng lấn (grade, effective_from/to)
 * như AllowanceConfigService. Bảng gán hạng THEO TỪNG THÁNG cho từng nhân viên
 * (EmployeeTechnicalGradeAssignment) là 1 khái niệm KHÁC — sửa qua PayrollController
 * (PATCH /api/v1/payroll/{employeeId}/technical-grade), không qua đây.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TechnicalGradeConfigService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final TechnicalGradeConfigRepository repository;

    public List<TechnicalGradeConfigResponse> list(TechnicalGrade grade) {
        List<TechnicalGradeConfig> configs = grade == null ? repository.findAll() : repository.findByGrade(grade);
        return configs.stream().map(this::toResponse).toList();
    }

    public TechnicalGradeConfigResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public TechnicalGradeConfigResponse create(CreateTechnicalGradeConfigRequest request) {
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(request.grade(), request.effectiveFrom(), request.effectiveTo(), null);

        TechnicalGradeConfig config = TechnicalGradeConfig.builder()
                .grade(request.grade())
                .unitPrice(request.unitPrice())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .build();
        return toResponse(repository.save(config));
    }

    @Transactional
    public TechnicalGradeConfigResponse update(UUID id, UpdateTechnicalGradeConfigRequest request) {
        TechnicalGradeConfig config = findOrThrow(id);
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(config.getGrade(), request.effectiveFrom(), request.effectiveTo(), id);

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

    private void checkNoOverlap(TechnicalGrade grade, LocalDate from, LocalDate to, UUID excludeId) {
        for (TechnicalGradeConfig other : repository.findByGrade(grade)) {
            if (excludeId != null && other.getId().equals(excludeId)) {
                continue;
            }
            if (DateRangeOverlap.overlaps(from, to, other.getEffectiveFrom(), other.getEffectiveTo())) {
                throw new ConflictException("Khoảng hiệu lực chồng lấn với 1 technical_grade_config khác (id=" + other.getId()
                        + ", " + other.getEffectiveFrom().format(DATE_FORMAT) + " → "
                        + (other.getEffectiveTo() == null ? "vô thời hạn" : other.getEffectiveTo().format(DATE_FORMAT)) + ")");
            }
        }
    }

    private TechnicalGradeConfig findOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy technical_grade_config với id=" + id));
    }

    private TechnicalGradeConfigResponse toResponse(TechnicalGradeConfig config) {
        return new TechnicalGradeConfigResponse(
                config.getId(), config.getGrade().name(), config.getUnitPrice(),
                config.getEffectiveFrom(), config.getEffectiveTo());
    }
}
