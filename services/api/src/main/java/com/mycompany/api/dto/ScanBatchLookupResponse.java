package com.mycompany.api.dto;

import java.util.UUID;

/**
 * Frontend gọi khi mở màn Chụp phiếu, TRƯỚC khi chụp ảnh đầu tiên — biết ngay có batch FAILED/
 * APPROVED đang giữ key này không để hiện banner tương ứng (Spec 1 mục 1) thay vì để user chụp rồi
 * mới nhận 409. batchId/status null khi key đang trống (chưa có batch hoặc batch cũ đã CANCELLED).
 */
public record ScanBatchLookupResponse(UUID batchId, String status, boolean blocked) {
}
