-- =====================================================================
-- Module 1 — Production / Cost Management (Rubber Latex Tapping Farm)
-- PostgreSQL migration (Supabase) — managed via Flyway/Liquibase from Spring Boot
-- Created: 2026-08-05
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- for EXCLUDE constraints mixing equality + range overlap

-- =====================================================================
-- 1. ORGANIZATION
-- =====================================================================

CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('team_lead', 'admin')),
    team_id         UUID REFERENCES teams(id), -- nullable for admin (manages all teams)
    avatar_url      TEXT,        -- nullable; self-editable via profile update endpoint
    position        VARCHAR(100), -- chức vụ (vd "Giám đốc", "Nhân sự"); free text, nullable
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Release 1: chỉ role 'admin' thực sự đăng nhập/thao tác. 'team_lead' đã có sẵn trong schema
-- cho release sau (xem docs/adr/0001-admin-only-v1-scope.md) — không cần đổi CHECK constraint.

CREATE TABLE employees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   VARCHAR(150) NOT NULL,
    team_id     UUID NOT NULL REFERENCES teams(id),
    user_id     UUID REFERENCES users(id), -- nullable; set khi nhân viên đồng thời là 1 User
                                            -- (ví dụ Tổ trưởng tự cạo mủ) — xem CONTEXT.md "Tổ trưởng"
    status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id)
);

CREATE INDEX idx_employees_team_id ON employees(team_id);

-- =====================================================================
-- 2. LATEX TYPES & RATE CONFIGURATION (time-versioned pricing)
-- =====================================================================

-- Danh mục MỞ — hiện có 4 loại, không giả định cố định vĩnh viễn
-- (xem docs/adr/0002-normalize-latex-type-storage.md)
CREATE TABLE latex_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20) NOT NULL UNIQUE, -- water | cup | strip | coagulated
    label       VARCHAR(50) NOT NULL,        -- Mủ nước | Mủ chén | Mủ dây | Mủ đông
    unit        VARCHAR(10) NOT NULL DEFAULT 'kg'
);

INSERT INTO latex_types (code, label, unit) VALUES
    ('water',       'Mủ nước', 'kg'),
    ('cup',         'Mủ chén', 'kg'),
    ('strip',       'Mủ dây',  'kg'),
    ('coagulated',  'Mủ đông', 'kg');

-- Price per latex type, time-bound (rates change month to month), thống nhất toàn công ty
-- (không phân biệt theo Tổ/khu vực). NULL effective_to = đang hiệu lực (daterange coi NULL là vô cực).
-- EXCLUDE ngăn 2 dòng cùng latex_type_id có khoảng effective_from/to chồng lấn.
CREATE TABLE rate_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latex_type_id   UUID NOT NULL REFERENCES latex_types(id),
    unit_price      NUMERIC(12,2) NOT NULL, -- VND per kg
    effective_from  DATE NOT NULL,
    effective_to    DATE, -- NULL = currently active
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    EXCLUDE USING gist (latex_type_id WITH =, daterange(effective_from, effective_to) WITH &&)
);

CREATE INDEX idx_rate_configs_latex_type ON rate_configs(latex_type_id, effective_from);

-- Allowance/deduction configuration for future Module 3 (payroll), declared here
-- so Module 1 captures the correct raw data from day one (no re-entry later).
-- Cùng cơ chế time-versioning + chống chồng lấn như rate_configs — 'code' KHÔNG unique
-- một mình (nhiều dòng theo thời gian cho cùng 1 code là hợp lệ).
CREATE TABLE allowance_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(30) NOT NULL, -- storm_allowance | medication | attendance | lighting | tapping_work
    name            VARCHAR(100) NOT NULL,
    calc_type       VARCHAR(20) NOT NULL CHECK (calc_type IN ('per_day', 'per_tree_section', 'per_shift', 'fixed')),
    unit_price      NUMERIC(12,2) NOT NULL,
    effective_from  DATE NOT NULL,
    effective_to    DATE,

    EXCLUDE USING gist (code WITH =, daterange(effective_from, effective_to) WITH &&)
);

INSERT INTO allowance_configs (code, name, calc_type, unit_price, effective_from) VALUES
    ('storm_allowance', 'Trợ cấp mưa bão',  'per_day',          100000, '2026-06-01'),
    ('medication',      'Bôi thuốc',        'per_tree_section',  60000, '2026-06-01'),
    ('attendance',      'Chuyên cần',       'per_day',            5000, '2026-06-01'),
    ('lighting',        'Tiền đèn',         'fixed',            200000, '2026-06-01'),
    ('tapping_work',    'Công xã miệng',    'per_shift',        250000, '2026-06-01');

-- =====================================================================
-- 2.5 OCR CALL LOGGING — theo dõi chi phí, thời gian phản hồi, tỷ lệ thành công mỗi lần gọi Claude API
-- =====================================================================

CREATE TABLE ocr_call_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    called_by           UUID NOT NULL REFERENCES users(id),
    called_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    target_type         VARCHAR(20) NOT NULL CHECK (target_type IN ('production_record', 'latex_sale')),
                        -- loại phiếu Admin ĐÃ CHỌN trước khi chụp/chọn ảnh (không phải loại thực tế đọc được)
    photo_url           TEXT NOT NULL,
    model               VARCHAR(50) NOT NULL, -- vd 'claude-sonnet-5' — đổi theo thời gian, không hardcode logic theo giá trị này
    duration_ms         INTEGER NOT NULL,
    success             BOOLEAN NOT NULL, -- cuộc gọi API có lỗi kỹ thuật không (network/timeout/API error)
    error_message       TEXT, -- chỉ có giá trị khi success = false
    type_mismatch       BOOLEAN NOT NULL DEFAULT false, -- chỉ có ý nghĩa khi success = true; true = Claude xác
                        -- định nội dung ảnh KHÔNG khớp target_type đã chọn → không tạo draft, báo Admin chụp lại
    input_tokens        INTEGER,
    output_tokens       INTEGER,
    estimated_cost_usd  NUMERIC(10,6) -- tính tại thời điểm gọi theo đơn giá model lúc đó (giá có thể đổi sau)
);

CREATE INDEX idx_ocr_call_logs_called_at ON ocr_call_logs(called_at);
CREATE INDEX idx_ocr_call_logs_success ON ocr_call_logs(success);

-- =====================================================================
-- 3. OPERATIONAL DATA — INDIVIDUAL PRODUCTION
-- =====================================================================

-- Header: sản lượng CÁ NHÂN theo ngày (1 dòng / nhân viên / ngày). Khối lượng theo từng loại mủ
-- nằm ở production_record_items bên dưới (xem docs/adr/0002-normalize-latex-type-storage.md).
CREATE TABLE production_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date     DATE NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    team_id         UUID NOT NULL REFERENCES teams(id), -- bản sao (denormalize) của employees.team_id tại
                                                          -- thời điểm ghi — giữ đúng lịch sử nếu nhân viên
                                                          -- đổi tổ sau này (không có điều động tạm giữa các tổ)

    notes           TEXT,

    source          VARCHAR(20) NOT NULL CHECK (source IN ('manual', 'ocr_import')),
    photo_url       TEXT, -- only set when source = ocr_import
    ocr_call_log_id UUID REFERENCES ocr_call_logs(id), -- nullable; set khi source = ocr_import —
                                                          -- trace ngược lại lần gọi OCR đã tạo ra draft này
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);

-- One ACTIVE production record per employee per day — record đã 'cancelled' không tính,
-- cho phép nhập lại đúng ngày đó sau khi hủy bản ghi sai.
CREATE UNIQUE INDEX uq_production_records_employee_date_active
    ON production_records (record_date, employee_id)
    WHERE status <> 'cancelled';

CREATE INDEX idx_production_date ON production_records(record_date);
CREATE INDEX idx_production_employee ON production_records(employee_id);
CREATE INDEX idx_production_team ON production_records(team_id);

-- Chi tiết khối lượng theo từng loại mủ trong 1 production_record.
CREATE TABLE production_record_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_record_id   UUID NOT NULL REFERENCES production_records(id) ON DELETE CASCADE,
    latex_type_id           UUID NOT NULL REFERENCES latex_types(id),
    kg                      NUMERIC(10,2) NOT NULL,
    drc_percent             NUMERIC(5,2), -- Dry Rubber Content (%) — CHỈ có giá trị khi latex_type = water

    UNIQUE (production_record_id, latex_type_id)
);

CREATE INDEX idx_production_record_items_record ON production_record_items(production_record_id);
CREATE INDEX idx_production_record_items_latex_type ON production_record_items(latex_type_id);

-- Work days / attendance — separated because units & payroll logic differ from production.
-- Không cần team_id riêng — suy ra qua employee_id → employees.team_id (không có điều động tạm).
-- 'lighting' không xuất hiện ở đây — đó là phụ cấp cố định/tháng, không gắn với chấm công theo ngày.
CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date     DATE NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    attendance_type VARCHAR(30) NOT NULL CHECK (attendance_type IN ('tapping_work', 'attendance', 'storm_allowance', 'medication')),
    quantity        NUMERIC(6,2) NOT NULL DEFAULT 1, -- number of days, or tree sections (for medication)
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, record_date);

-- =====================================================================
-- 4. LATEX SALES — sold per TEAM to a buyer (separate flow from individual production)
-- =====================================================================

-- Header: bán mủ theo TỔ cho người mua ngoài. Khối lượng theo từng loại mủ nằm ở
-- latex_sale_items bên dưới, cùng mô hình chuẩn hóa với production_record_items.
CREATE TABLE latex_sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date     DATE NOT NULL,
    team_id         UUID NOT NULL REFERENCES teams(id),

    buyer_name      VARCHAR(150),
    seller_signed_by VARCHAR(150), -- name of the team representative confirming the sale
    notes           TEXT,

    photo_url       TEXT,
    ocr_call_log_id UUID REFERENCES ocr_call_logs(id), -- nullable; set khi tạo qua OCR — xem production_records
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled'))
);

CREATE INDEX idx_latex_sales_date ON latex_sales(record_date);
CREATE INDEX idx_latex_sales_team ON latex_sales(team_id);

-- Chi tiết khối lượng theo từng loại mủ trong 1 latex_sale.
CREATE TABLE latex_sale_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latex_sale_id   UUID NOT NULL REFERENCES latex_sales(id) ON DELETE CASCADE,
    latex_type_id   UUID NOT NULL REFERENCES latex_types(id),
    kg              NUMERIC(10,2) NOT NULL,
    drc_percent     NUMERIC(5,2), -- CHỈ có giá trị khi latex_type = water

    UNIQUE (latex_sale_id, latex_type_id)
);

CREATE INDEX idx_latex_sale_items_sale ON latex_sale_items(latex_sale_id);
CREATE INDEX idx_latex_sale_items_latex_type ON latex_sale_items(latex_type_id);

-- =====================================================================
-- 5. EDIT HISTORY (applies to all operational tables)
-- =====================================================================

-- Chỉ ghi các lần SỬA sau khi bản ghi đã tồn tại (không ghi sự kiện tạo mới). Không có hard delete —
-- "xóa" là chuyển status sang 'cancelled', không xóa khỏi DB. Ghi ở mức AGGREGATE: table_name/record_id
-- luôn trỏ vào bảng header ('production_records' | 'latex_sales' | 'attendance_records'); old_data/new_data
-- snapshot toàn bộ record + các item con liên quan (production_record_items / latex_sale_items), không
-- tách riêng một dòng edit_history cho từng item.
CREATE TABLE edit_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  VARCHAR(50) NOT NULL, -- 'production_records' | 'latex_sales' | 'attendance_records'
    record_id   UUID NOT NULL,
    edited_by   UUID NOT NULL REFERENCES users(id),
    edited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_data    JSONB,
    new_data    JSONB
);

CREATE INDEX idx_edit_history_record ON edit_history(table_name, record_id);
