-- =====================================================================
-- Module 3 (Bảng lương) — Phase 1: nền tảng schema (docs/specs/spec-3-bang-luong-v1-draft.md mục 2).
-- Additive thuần túy — không đổi hành vi runtime hiện tại (chưa có service/API nào đọc các bảng này).
--
-- 4 khái niệm MỚI so với những gì Module 1 đã khai báo sẵn (rate_configs/allowance_configs):
--   1. "Mủ tạp" — đơn giá GỘP cho cup+strip+coagulated, tách khỏi rate_configs (vốn định giá riêng
--      từng latex_type) để không đổi hành vi Module 1 hiện tại — mục 2.1 spec.
--   2. "Hạng kỹ thuật" (A/B/C) — thuộc tính mới của employees + bảng giá cố định/tháng theo hạng —
--      mục 2.2 spec.
--   3. Chốt lương — cờ đơn giản theo THÁNG (không immutable, theo xác nhận user) — mục 2.4 spec.
--   4. Trừ/Tạm ứng — mặc định hệ thống (payroll_settings) + override theo nhân viên/tháng
--      (payroll_deductions) — mục 2.6 spec.
--
-- "Công thời vụ" (allowance_configs code mới) CHƯA insert seed data ở đây — đơn giá/ngày hiệu lực
-- chính xác còn là câu hỏi mở (spec mục 8). Chỉ mở CHECK constraint attendance_records để domain
-- SẴN SÀNG nhận giá trị này khi có quyết định, không tạo giá trị mặc định có thể sai.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mủ tạp — đơn giá gộp cup+strip+coagulated, time-versioned (cùng cơ chế chống chồng lấn như
--    rate_configs) nhưng KHÔNG gắn latex_type_id nào — áp dụng cho payroll only, không đổi cách
--    Sản lượng/OCR lưu 3 loại mủ này riêng biệt.
-- ---------------------------------------------------------------------
CREATE TABLE payroll_mixed_latex_rate_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_price      NUMERIC(12,2) NOT NULL, -- VND/kg, áp cho tổng kg (mủ chén + mủ dây + mủ đông)
    effective_from  DATE NOT NULL,
    effective_to    DATE, -- NULL = đang hiệu lực

    EXCLUDE USING gist (daterange(effective_from, effective_to) WITH &&)
);

-- ---------------------------------------------------------------------
-- 2. Hạng kỹ thuật — thuộc tính nhân viên + bảng giá cố định/tháng theo hạng (KHÔNG nhân số lượng
--    gì cả, khác hẳn cơ chế calc_type của allowance_configs).
-- ---------------------------------------------------------------------
ALTER TABLE employees
    ADD COLUMN technical_grade VARCHAR(1) CHECK (technical_grade IN ('a', 'b', 'c'));
    -- nullable — nhân viên chưa xếp hạng thì không có khoản phụ cấp này, không phải lỗi dữ liệu

CREATE TABLE technical_grade_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade           VARCHAR(1) NOT NULL CHECK (grade IN ('a', 'b', 'c')),
    unit_price      NUMERIC(12,2) NOT NULL, -- VND/tháng, cố định theo hạng
    effective_from  DATE NOT NULL,
    effective_to    DATE,

    EXCLUDE USING gist (grade WITH =, daterange(effective_from, effective_to) WITH &&)
);

-- ---------------------------------------------------------------------
-- 3. Công thời vụ — mở CHECK constraint attendance_type để nhận giá trị mới. KHÔNG insert
--    allowance_configs cho code này (đơn giá/ngày hiệu lực chưa xác nhận — spec mục 8).
-- ---------------------------------------------------------------------
ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_attendance_type_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_attendance_type_check
    CHECK (attendance_type IN ('tapping_work', 'attendance', 'storm_allowance', 'medication', 'seasonal_work'));

-- ---------------------------------------------------------------------
-- 4. Chốt lương — cờ đơn giản theo THÁNG, KHÔNG immutable (user xác nhận vẫn sửa được sau khi chốt,
--    chỉ là đánh dấu hiển thị) — vì vậy không cần state machine, chỉ 1 dòng = "đã chốt".
-- ---------------------------------------------------------------------
CREATE TABLE payroll_period_locks (
    year_month  VARCHAR(7) PRIMARY KEY, -- 'YYYY-MM'
    locked_by   UUID NOT NULL REFERENCES users(id),
    locked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. Trừ / Tạm ứng — mặc định hệ thống (key-value, tái dùng được cho setting khác sau này) + override
--    theo từng nhân viên/tháng. Sửa 1 dòng KHÔNG đụng payroll_settings — 2 bảng tách riêng để đổi
--    mặc định không ghi đè các override đã có (spec mục 2.6).
-- ---------------------------------------------------------------------
CREATE TABLE payroll_settings (
    key         VARCHAR(50) PRIMARY KEY,
    value       NUMERIC(12,2) NOT NULL,
    updated_by  UUID NOT NULL REFERENCES users(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO payroll_settings (key, value, updated_by, updated_at)
SELECT 'default_monthly_advance', 1000000, id, now()
FROM users WHERE email = 'admin@mycompany.local';

CREATE TABLE payroll_deductions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    year_month      VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    amount          NUMERIC(12,2) NOT NULL,
    updated_by      UUID NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (employee_id, year_month)
);
