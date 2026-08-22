-- =====================================================================
-- RecordStatus.CONFIRMED -> APPROVED (0021-scan-batch-model) — nhất quán thuật ngữ với
-- ScanBatch.status APPROVED (cùng nghĩa "đã khóa, immutable"). CHỈ áp dụng production_records và
-- latex_sales — attendance_records dùng AttendanceRecordStatus riêng từ nay (tách ở tầng Java
-- trước migration này, giá trị DB của attendance_records KHÔNG đổi, xem
-- docs/adr/0021-scan-batch-model.md).
-- Migration này PHẢI chạy sau khi code Java dùng RecordStatus.APPROVED đã deploy (cùng release
-- window — service layer đọc/ghi 'approved' ngay khi migration này chạy xong).
-- =====================================================================

ALTER TABLE production_records DROP CONSTRAINT production_records_status_check;
UPDATE production_records SET status = 'approved' WHERE status = 'confirmed';
ALTER TABLE production_records ADD CONSTRAINT production_records_status_check
    CHECK (status IN ('draft', 'approved', 'cancelled'));

ALTER TABLE latex_sales DROP CONSTRAINT latex_sales_status_check;
UPDATE latex_sales SET status = 'approved' WHERE status = 'confirmed';
ALTER TABLE latex_sales ADD CONSTRAINT latex_sales_status_check
    CHECK (status IN ('draft', 'approved', 'cancelled'));
