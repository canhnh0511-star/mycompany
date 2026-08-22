package com.mycompany.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.repository.LatexTypeRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Parse mảng items/low_confidence_fields từ JSON response Claude Vision — tách khỏi
 * ScanBatchService (trước đây nằm trong OcrCaptureService) để tái dùng thuần túy, không kéo theo
 * phụ thuộc business logic.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LatexTypeItemParser {

    private final LatexTypeRepository latexTypeRepository;

    public List<LatexItemRequest> parseItems(JsonNode itemsNode) {
        List<LatexItemRequest> items = new ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            String code = itemNode.path("latex_type_code").asText(null);
            BigDecimal kg = itemNode.hasNonNull("kg") ? itemNode.get("kg").decimalValue() : null;
            BigDecimal drc = itemNode.hasNonNull("drc_percent") ? itemNode.get("drc_percent").decimalValue() : null;
            UUID latexTypeId = code == null ? null : latexTypeRepository.findByCode(code).map(lt -> lt.getId()).orElse(null);
            if (latexTypeId == null || kg == null) {
                // Bỏ qua item thiếu dữ liệu bắt buộc — không throw để không làm hỏng cả dòng, chỉ
                // đơn giản là item đó không được đưa vào; low_confidence_fields đã cảnh báo riêng.
                log.warn("OCR trả item thiếu dữ liệu (latex_type_code={}, kg={}) — bỏ qua item này", code, kg);
                continue;
            }
            items.add(new LatexItemRequest(latexTypeId, kg, drc));
        }
        return items;
    }

    public List<String> parseStringArray(JsonNode arrayNode) {
        List<String> values = new ArrayList<>();
        for (JsonNode node : arrayNode) {
            values.add(node.asText());
        }
        return values;
    }
}
