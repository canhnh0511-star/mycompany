-- =====================================================================
-- Bổ sung sau buổi grilling backend/frontend:
-- 1. attendance_records cần status để nhất quán chính sách "không hard delete" với
--    production_records/latex_sales (trước đó chỉ sửa-đè qua PATCH, không "hủy" được dòng sai).
-- 2. production_records/latex_sales cần chỗ lưu field nào OCR không chắc chắn — ADR-0006 yêu cầu
--    frontend đọc thẳng từ draft row (không phải state tạm ở client), nên thông tin "AI không chắc"
--    (CLAUDE.md §5) phải nằm trong DB, không chỉ trong response tạm thời của lần gọi OCR.
-- =====================================================================

ALTER TABLE attendance_records
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('draft', 'confirmed', 'cancelled'));
-- Mặc định 'confirmed': dữ liệu nhập tay hiện tại không qua vòng OCR nên không cần trạng thái draft
-- tạm thời — nhưng vẫn có 'cancelled' để "hủy" 1 dòng chấm công sai mà không xóa cứng khỏi DB.

ALTER TABLE production_records
    ADD COLUMN low_confidence_fields JSONB; -- nullable; vd {"items":[{"latexTypeId":"...","field":"kg","reason":"chữ mờ"}]}

ALTER TABLE latex_sales
    ADD COLUMN low_confidence_fields JSONB; -- nullable, cùng cấu trúc
