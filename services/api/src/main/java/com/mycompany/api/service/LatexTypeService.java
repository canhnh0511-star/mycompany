package com.mycompany.api.service;

import com.mycompany.api.dto.CreateLatexTypeRequest;
import com.mycompany.api.dto.LatexTypeResponse;
import com.mycompany.api.dto.UpdateLatexTypeRequest;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.LatexSaleItemRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.RateConfigRepository;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Danh mục MỞ (docs/adr/0002) — CRUD đủ nhưng KHÔNG cho xóa nếu đang bị tham chiếu bởi
 * rate_configs/production_record_items/latex_sale_items (docs/TASKS.md Phase 1, quyết định: kiểm tra
 * tham chiếu trước khi cho xóa, không thêm cột status riêng như Employee).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LatexTypeService {

    private static final String DEFAULT_UNIT = "kg";

    private final LatexTypeRepository latexTypeRepository;
    private final RateConfigRepository rateConfigRepository;
    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final LatexSaleItemRepository latexSaleItemRepository;

    public List<LatexTypeResponse> list() {
        return latexTypeRepository.findAll().stream().map(this::toResponse).toList();
    }

    public LatexTypeResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public LatexTypeResponse create(CreateLatexTypeRequest request) {
        if (latexTypeRepository.existsByCode(request.code())) {
            throw new ConflictException("Mã loại mủ '" + request.code() + "' đã tồn tại");
        }
        LatexType latexType = LatexType.builder()
                .code(request.code())
                .label(request.label())
                .unit(StringUtils.hasText(request.unit()) ? request.unit() : DEFAULT_UNIT)
                .build();
        return toResponse(latexTypeRepository.save(latexType));
    }

    @Transactional
    public LatexTypeResponse update(UUID id, UpdateLatexTypeRequest request) {
        LatexType latexType = findOrThrow(id);
        latexType.setLabel(request.label());
        latexType.setUnit(StringUtils.hasText(request.unit()) ? request.unit() : DEFAULT_UNIT);
        return toResponse(latexTypeRepository.save(latexType));
    }

    @Transactional
    public void delete(UUID id) {
        LatexType latexType = findOrThrow(id);
        boolean referenced = rateConfigRepository.existsByLatexTypeId(id)
                || productionRecordItemRepository.existsByLatexTypeId(id)
                || latexSaleItemRepository.existsByLatexTypeId(id);
        if (referenced) {
            throw new ConflictException(
                    "Không thể xóa loại mủ '" + latexType.getCode() + "' vì đang được tham chiếu bởi dữ liệu khác");
        }
        latexTypeRepository.delete(latexType);
    }

    private LatexType findOrThrow(UUID id) {
        return latexTypeRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy loại mủ với id=" + id));
    }

    private LatexTypeResponse toResponse(LatexType latexType) {
        return new LatexTypeResponse(latexType.getId(), latexType.getCode(), latexType.getLabel(), latexType.getUnit());
    }
}
