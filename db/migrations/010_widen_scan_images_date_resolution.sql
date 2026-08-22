-- =====================================================================
-- Phát hiện khi chạy Case 23 (Spec 1 mục 9) thật trên DB: cột scan_images.date_resolution VARCHAR(20)
-- (migration 007) quá hẹp cho giá trị 'fallback_session_date' — DÀI 21 KÝ TỰ, vượt VARCHAR(20) — dù
-- CHECK constraint đã cho phép giá trị này. Insert thất bại với "value too long for type character
-- varying(20)" ngay khi RULE 13 (NOT_DETECTED tự resolve) chạy thật lần đầu.
--
-- 007 đã áp dụng thật lên DB (xem ADR-0021 addendum "renumber migration") nên không sửa tại chỗ —
-- widen bằng ALTER migration mới. VARCHAR(30) đủ dư cho cả 4 giá trị DateResolution hiện tại (dài
-- nhất là fallback_session_date = 21 ký tự) và còn chỗ trống nếu thêm giá trị mới sau này.
-- =====================================================================

ALTER TABLE scan_images
    ALTER COLUMN date_resolution TYPE VARCHAR(30);
