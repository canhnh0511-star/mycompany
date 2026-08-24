-- Thứ tự dòng gốc trên phiếu giấy (vị trí trong mảng "rows" OCR đọc được, nhân đôi để chừa chỗ cho
-- cặp vợ/chồng tách từ CÙNG 1 dòng — employee chính = i*2, vợ/chồng = i*2+1, xem
-- ScanBatchService#captureProductionRecordRows). NULL cho record nhập tay (source=manual) và toàn bộ
-- dữ liệu tạo trước migration này — không backfill (suy luận thứ tự cho dữ liệu cũ là suy diễn, không
-- phản ánh lịch sử thật, cùng nguyên tắc đã áp dụng cho scan_image_id ở migration 008). Dùng để Batch
-- Review VÀ màn tra cứu sản lượng cũ hiện đúng thứ tự như trên phiếu giấy, dễ đối chiếu ảnh gốc.
ALTER TABLE production_records ADD COLUMN row_index INT;
