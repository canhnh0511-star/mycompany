-- Số dòng OCR đọc được từ ảnh (input.rows.size() lúc xử lý, KHÔNG suy ngược từ số record đã tạo —
-- 1 dòng "Tên chồng - Tên vợ" tạo ra 2 production_records, 1 dòng lỗi số liệu vẫn tạo 1 record +
-- 1 conflict, nên đếm ngược từ record/conflict sẽ sai). Dùng để hiện "Đọc được X dòng" trên Batch
-- Review, giúp Admin đối chiếu bằng mắt với số dòng thật trên phiếu giấy — tránh hiểu lầm hệ thống
-- đọc thiếu khi thực ra 1 số dòng bị bỏ có chủ đích (vd không cạo mủ hôm đó, xem EMPTY_ROW_SKIPPED).
ALTER TABLE scan_images ADD COLUMN ocr_row_count INT;
