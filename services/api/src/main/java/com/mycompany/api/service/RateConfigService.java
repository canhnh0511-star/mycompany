package com.mycompany.api.service;

import com.mycompany.api.dto.CreateRateConfigRequest;
import com.mycompany.api.dto.RateConfigResponse;
import com.mycompany.api.dto.UpdateRateConfigRequest;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.RateConfig;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.RateConfigRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đơn giá theo latex_type, time-versioned. DB có EXCLUDE constraint chống chồng lấn effective_from/to
 * cho cùng latex_type_id (001_init_schema.sql) — validate trước ở đây để trả lỗi 409 rõ ràng
 * (docs/TASKS.md Open Question đã resolve theo hướng này); DataIntegrityViolationException ở
 * GlobalExceptionHandler là lưới an toàn cho race condition.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RateConfigService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RateConfigRepository rateConfigRepository;
    private final LatexTypeRepository latexTypeRepository;

    public List<RateConfigResponse> list(UUID latexTypeId) {
        List<RateConfig> configs = latexTypeId == null
                ? rateConfigRepository.findAll()
                : rateConfigRepository.findByLatexTypeId(latexTypeId);
        return configs.stream().map(this::toResponse).toList();
    }

    public RateConfigResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public RateConfigResponse create(CreateRateConfigRequest request) {
        LatexType latexType = findLatexTypeOrThrow(request.latexTypeId());
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(request.latexTypeId(), request.effectiveFrom(), request.effectiveTo(), null);

        RateConfig config = RateConfig.builder()
                .latexType(latexType)
                .unitPrice(request.unitPrice())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .build();
        // saveAndFlush — xem ghi chú trong TeamService.create() về @CreationTimestamp + id sinh client-side.
        return toResponse(rateConfigRepository.saveAndFlush(config));
    }

    @Transactional
    public RateConfigResponse update(UUID id, UpdateRateConfigRequest request) {
        RateConfig config = findOrThrow(id);
        validateRange(request.effectiveFrom(), request.effectiveTo());
        checkNoOverlap(config.getLatexType().getId(), request.effectiveFrom(), request.effectiveTo(), id);

        config.setUnitPrice(request.unitPrice());
        config.setEffectiveFrom(request.effectiveFrom());
        config.setEffectiveTo(request.effectiveTo());
        return toResponse(rateConfigRepository.save(config));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (to != null && !to.isAfter(from)) {
            throw new InvalidRequestException("effectiveTo phải sau effectiveFrom");
        }
    }

    private void checkNoOverlap(UUID latexTypeId, LocalDate from, LocalDate to, UUID excludeId) {
        List<RateConfig> existing = rateConfigRepository.findByLatexTypeId(latexTypeId);
        for (RateConfig other : existing) {
            if (excludeId != null && other.getId().equals(excludeId)) {
                continue;
            }
            if (DateRangeOverlap.overlaps(from, to, other.getEffectiveFrom(), other.getEffectiveTo())) {
                throw new ConflictException("Khoảng hiệu lực chồng lấn với 1 rate_config khác (id=" + other.getId()
                        + ", " + other.getEffectiveFrom().format(DATE_FORMAT) + " → "
                        + (other.getEffectiveTo() == null ? "vô thời hạn" : other.getEffectiveTo().format(DATE_FORMAT)) + ")");
            }
        }
    }

    private LatexType findLatexTypeOrThrow(UUID id) {
        return latexTypeRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy loại mủ với id=" + id));
    }

    private RateConfig findOrThrow(UUID id) {
        return rateConfigRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy rate_config với id=" + id));
    }

    private RateConfigResponse toResponse(RateConfig config) {
        return new RateConfigResponse(
                config.getId(),
                config.getLatexType().getId(),
                config.getLatexType().getCode(),
                config.getUnitPrice(),
                config.getEffectiveFrom(),
                config.getEffectiveTo(),
                config.getCreatedAt());
    }
}
