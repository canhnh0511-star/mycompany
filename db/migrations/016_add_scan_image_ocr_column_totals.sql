-- Lưu nguyên "Tổng cộng" OCR đọc được trên phiếu (column_totals) NGAY LÚC xử lý, không chỉ khi phát
-- hiện lệch với systemTotal (trước đây chỉ dùng tạm để so sánh rồi bỏ, không lưu lại) — để panel
-- "Thông tin ảnh/OCR" phía frontend luôn hiển thị được "Tổng trên ảnh" kể cả khi khớp hoàn toàn.
-- Xem ScanImage.java / ScanBatchService (mục A1, kế hoạch "Áp dụng thiết kế Nhập phiếu hàng ngày").
ALTER TABLE scan_images ADD COLUMN ocr_column_totals JSONB NULL;
