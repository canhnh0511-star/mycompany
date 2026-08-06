package com.mycompany.api.service;

import com.mycompany.api.dto.AllowanceConfigResponse;
import com.mycompany.api.dto.CreateAllowanceConfigRequest;
import com.mycompany.api.dto.UpdateAllowanceConfigRequest;
import com.mycompany.api.entity.AllowanceConfig;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.AllowanceConfigRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Danh mục phụ cấp/khấu trừ cho Module 3 (payroll), khai báo sẵn ở Module 1 — cùng mô hình
 * time-versioned + chống chồng lấn (code, effective_from/to) như RateConfig (001_init_schema.sql).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AllowanceConfigService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final AllowanceConfigRepository allowanceConfigRepository;

    public List<AllowanceConfigResponse> list(String code) {
        List<AllowanceConfig> configs = code == null || code.isBlank()
                ? allowanceConfigRepository.findAll()
                : allowanceConfigRepository.findByCode(code);
        return configs.stream().map(this::toResponse).toList();
    }

    public AllowanceConfigResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public AllowanceConfigResponse create(CreateAllowanceConfigRequest request) {
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(request.code(), request.effectiveFrom(), request.effectiveTo(), null);

        AllowanceConfig config = AllowanceConfig.builder()
                .code(request.code())
                .name(request.name())
                .calcType(request.calcType())
                .unitPrice(request.unitPrice())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .build();
        return toResponse(allowanceConfigRepository.save(config));
    }

    @Transactional
    public AllowanceConfigResponse update(UUID id, UpdateAllowanceConfigRequest request) {
        AllowanceConfig config = findOrThrow(id);
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(config.getCode(), request.effectiveFrom(), request.effectiveTo(), id);

        config.setName(request.name());
        config.setCalcType(request.calcType());
        config.setUnitPrice(request.unitPrice());
        config.setEffectiveFrom(request.effectiveFrom());
        config.setEffectiveTo(request.effectiveTo());
        return toResponse(allowanceConfigRepository.save(config));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (to != null && !to.isAfter(from)) {
            throw new InvalidRequestException("effectiveTo phải sau effectiveFrom");
        }
    }

    private void checkNoOverlap(String code, LocalDate from, LocalDate to, UUID excludeId) {
        List<AllowanceConfig> existing = allowanceConfigRepository.findByCode(code);
        for (AllowanceConfig other : existing) {
            if (excludeId != null && other.getId().equals(excludeId)) {
                continue;
            }
            if (DateRangeOverlap.overlaps(from, to, other.getEffectiveFrom(), other.getEffectiveTo())) {
                throw new ConflictException("Khoảng hiệu lực chồng lấn với 1 allowance_config khác (id=" + other.getId()
                        + ", " + other.getEffectiveFrom().format(DATE_FORMAT) + " → "
                        + (other.getEffectiveTo() == null ? "vô thời hạn" : other.getEffectiveTo().format(DATE_FORMAT)) + ")");
            }
        }
    }

    private AllowanceConfig findOrThrow(UUID id) {
        return allowanceConfigRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy allowance_config với id=" + id));
    }

    private AllowanceConfigResponse toResponse(AllowanceConfig config) {
        return new AllowanceConfigResponse(
                config.getId(),
                config.getCode(),
                config.getName(),
                config.getCalcType().name(),
                config.getUnitPrice(),
                config.getEffectiveFrom(),
                config.getEffectiveTo());
    }
}
