package com.mycompany.api.dto;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.OcrTargetType;
import java.time.LocalDate;
import java.util.UUID;

/** 1 batch đang "chờ xử lý" (BatchStatus.isPendingHumanAction()) — Home "Chờ kiểm tra". Sắp xếp ngày cũ
 * nhất lên đầu ở query nguồn (ScanBatchRepository.findPending), giữ nguyên thứ tự khi trả ra. */
public record ScanBatchPendingItem(
        UUID id, UUID teamId, String teamName, OcrTargetType documentType, LocalDate workDate, BatchStatus status) {
}
