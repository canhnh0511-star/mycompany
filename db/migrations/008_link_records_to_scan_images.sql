-- =====================================================================
-- Trace record -> ảnh nguồn cụ thể (0021-scan-batch-model) — thay cho việc chỉ so photo_url string
-- thủ công trước đây. Nullable + không backfill: record source=manual và toàn bộ dữ liệu tạo trước
-- migration này giữ nguyên NULL (xem docs/adr/0021-scan-batch-model.md phần rủi ro/migrate dữ liệu
-- cũ) — Sản lượng v2 coi NULL là "không có thông tin batch", không phải lỗi.
-- scan_batch_id denormalize từ scan_image.scan_batch_id, cùng tiền lệ production_records.team_id
-- denormalize từ employees.team_id (001_init_schema.sql).
-- =====================================================================

ALTER TABLE production_records ADD COLUMN scan_image_id UUID REFERENCES scan_images(id);
ALTER TABLE production_records ADD COLUMN scan_batch_id UUID REFERENCES scan_batches(id);
ALTER TABLE latex_sales ADD COLUMN scan_image_id UUID REFERENCES scan_images(id);
ALTER TABLE latex_sales ADD COLUMN scan_batch_id UUID REFERENCES scan_batches(id);

CREATE INDEX idx_production_records_scan_batch ON production_records(scan_batch_id);
CREATE INDEX idx_latex_sales_scan_batch ON latex_sales(scan_batch_id);
