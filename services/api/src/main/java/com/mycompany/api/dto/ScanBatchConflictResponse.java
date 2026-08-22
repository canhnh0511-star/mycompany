package com.mycompany.api.dto;

import java.util.UUID;

/** displayOrder tính tĩnh phía Java từ conflictType (Spec 1 mục 6 "thứ tự hiển thị") — không lưu DB. */
public record ScanBatchConflictResponse(
        UUID id,
        UUID scanImageId,
        String recordTable,
        UUID recordId,
        String conflictType,
        boolean blocking,
        String status,
        String detail,
        int displayOrder) {
}
