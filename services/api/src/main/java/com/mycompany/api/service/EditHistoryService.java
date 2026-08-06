package com.mycompany.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.EditHistoryResponse;
import com.mycompany.api.entity.EditHistory;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EditHistoryRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi lịch sử chỉnh sửa polymorphic (table_name + record_id), snapshot AGGREGATE toàn bộ record +
 * items vào old_data/new_data JSONB (CLAUDE.md §4). Dùng chung cho ProductionRecord/LatexSale/
 * AttendanceRecord. Snapshot truyền vào là chính *Response DTO của resource (đã là aggregate sẵn).
 *
 * <p>Chỉ gọi service này khi record đã ở trạng thái CONFIRMED TRƯỚC lần sửa hiện tại — không ghi
 * trong lúc còn draft (quy trình rà soát/sửa trước khi confirm là bình thường, không phải "sửa" theo
 * nghĩa cần lưu vết tranh chấp — xem docs/TASKS.md Phase 2). Điều kiện này do caller (ProductionRecord/
 * LatexSale/AttendanceRecordService) tự kiểm tra trước khi gọi, không kiểm tra lại ở đây.
 */
@Service
@RequiredArgsConstructor
public class EditHistoryService {

    // Khớp đúng 3 bảng header polymorphic (CLAUDE.md §4) — chặn lỗi gõ nhầm tableName âm thầm trả rỗng.
    private static final Set<String> VALID_TABLE_NAMES = Set.of("production_records", "latex_sales", "attendance_records");

    private final EditHistoryRepository editHistoryRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void recordEdit(String tableName, UUID recordId, User editedBy, Object oldSnapshot, Object newSnapshot) {
        EditHistory history = EditHistory.builder()
                .tableName(tableName)
                .recordId(recordId)
                .editedBy(editedBy)
                .oldData(writeJson(oldSnapshot))
                .newData(writeJson(newSnapshot))
                .build();
        editHistoryRepository.save(history);
    }

    // Đọc lịch sử chỉnh sửa (docs/TASKS.md Phase 4) — sort mới nhất trước (đã ORDER BY ở repository).
    @Transactional(readOnly = true)
    public List<EditHistoryResponse> list(String tableName, UUID recordId) {
        if (!VALID_TABLE_NAMES.contains(tableName)) {
            throw new InvalidRequestException(
                    "tableName không hợp lệ — chỉ chấp nhận: " + VALID_TABLE_NAMES);
        }
        return editHistoryRepository.findByTableNameAndRecordId(tableName, recordId).stream()
                .map(h -> new EditHistoryResponse(
                        h.getId(), h.getTableName(), h.getRecordId(),
                        h.getEditedBy().getId(), h.getEditedBy().getFullName(),
                        h.getEditedAt(), h.getOldData(), h.getNewData()))
                .toList();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            // Không nên xảy ra với các Response DTO (record thuần, không cycle) — nếu có, coi là lỗi
            // lập trình chứ không phải lỗi nghiệp vụ, để rơi vào GlobalExceptionHandler 500.
            throw new IllegalStateException("Không serialize được snapshot cho edit_history", e);
        }
    }
}
