-- Thêm 2 conflict_type mới: empty_row_skipped (dòng tên có trên phiếu nhưng không có số liệu — không
-- blocking, chỉ thông báo) và total_mismatch (tổng cột OCR đọc từ dòng "Tổng cộng" lệch với tổng thực
-- tế đã tạo record — blocking, bắt lỗi đọc nhầm cột). CHECK constraint cũ ở 007_scan_batches_and_images.sql
-- chưa có 2 giá trị này, gây lỗi "violates check constraint" khi ghi conflict thật (phát hiện khi test
-- thật trên iPhone 2026-08-23) — xem ConflictType.java.
ALTER TABLE scan_batch_conflicts DROP CONSTRAINT scan_batch_conflicts_conflict_type_check;
ALTER TABLE scan_batch_conflicts ADD CONSTRAINT scan_batch_conflicts_conflict_type_check CHECK (conflict_type IN
    ('duplicate_image', 'image_quality_or_ocr_failed', 'date_mismatch', 'unknown_employee',
     'invalid_business_value', 'potential_duplicate_ocr_row', 'pending_move', 'other',
     'total_mismatch', 'empty_row_skipped'));
