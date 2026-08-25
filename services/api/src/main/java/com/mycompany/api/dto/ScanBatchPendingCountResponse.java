package com.mycompany.api.dto;

/** Số batch đang "chờ xử lý" (BatchStatus.isPendingHumanAction()) — Home "Chờ kiểm tra". */
public record ScanBatchPendingCountResponse(long count) {
}
