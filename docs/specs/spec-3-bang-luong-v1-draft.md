# Spec (DRAFT) — Module 3: Bảng lương v1

> **Trạng thái: DRAFT — do Claude soạn dựa trên audit code thật + trả lời nghiệp vụ của user qua
> `AskUserQuestion` (xem lịch sử hội thoại), KHÔNG phải bản do user viết sẵn như Spec 1/Spec 2.**
> Mục 8 "Trừ / Tạm ứng" đã được xác nhận (mặc định 1.000.000đ/người/tháng, cho phép sửa từng người)
> — xem mục 2.6 + 8. Dừng lại chờ user duyệt toàn bộ trước khi implement, theo đúng kỷ luật đã áp
> dụng cho Module 1.

Nguồn: 2 ảnh mockup "Bảng lương" (desktop web, sidebar mới) user cung cấp + audit
`db/migrations/001_init_schema.sql` (bảng `rate_configs`/`allowance_configs`/`employees` đã được
Module 1 cố tình khai báo sẵn cho việc này — xem comment trong migration: *"Allowance/deduction
configuration for future Module 3 (payroll), declared here so Module 1 captures the correct raw
data from day one"*).

---

## 0. Mục tiêu

Màn Bảng lương (web/desktop, Admin dùng) hiển thị lương THÁNG của từng công nhân, tính từ dữ liệu
sản lượng + chấm công đã APPROVED — cùng nguyên tắc "single source of truth, không cho sửa tay số
tổng" như Sản lượng v2 (Spec 2 mục 2): số liệu lương LUÔN suy ra từ `production_records`/
`attendance_records` đã duyệt + bảng đơn giá hiện hành, không lưu 1 con số lương độc lập có thể
chỉnh tay.

Ngoài scope v1 (LATER, không làm đợt này): tính lương cho `latex_sales` (bán mủ theo Tổ — không
gắn nhân viên cụ thể, không thuộc lương cá nhân), UI "Cấu hình hệ thống"/"Chi phí"/"Báo cáo" khác
trong sidebar ảnh (đã có sẵn 1 phần qua admin-catalog/reports hiện tại, không thuộc phạm vi bảng
lương).

---

## 1. Đối chiếu ảnh ↔ domain hiện có (audit)

| Cột trong ảnh | Domain hiện tại | Kết luận |
|---|---|---|
| Mủ nước 3.400đ/kg | `rate_configs` (latex_type=water) | Khớp thẳng, dùng lại |
| Bồi thuốc 60.000đ/phần cây | `allowance_configs.medication` (per_tree_section, 60.000) | Khớp, chỉ lệch chính tả nhãn hiển thị |
| Chuyên cần 5.000đ/ngày | `allowance_configs.attendance` (per_day, 5.000) | Khớp y hệt |
| Công mưa bão | `allowance_configs.storm_allowance` (per_day, 100.000) | Khớp |
| Tiền đèn | `allowance_configs.lighting` (fixed, 200.000) | **Cố tình KHÔNG hiện** ở bảng lương này (user xác nhận) — tính/hiện ở nơi khác, ngoài scope màn này |
| **Mủ tạp** 10.000đ/kg | *(không có)* | **Mới** — gộp `cup`+`strip`+`coagulated` thành 1 đơn giá duy nhất (user xác nhận) |
| **Hạng kỹ thuật** (A=350k/B=250k/C=150k) | *(không có)* | **Mới hoàn toàn** — không map vào code nào trong 5 code cũ (user xác nhận) |
| **Công thời vụ** | *(không có, khác `tapping_work`)* | **Mới hoàn toàn**, không phải đổi tên `tapping_work` (user xác nhận) |

---

## 2. Data model — thay đổi cần thiết

### 2.1 "Mủ tạp" — đơn giá gộp, KHÔNG đổi `latex_types`/`rate_configs` hiện có
Quyết định thiết kế: **không sửa** `latex_types`/`rate_configs` gốc (rủi ro cao — production/OCR/
latex_sales đang dùng, đổi model định giá per-type sẽ phá hành vi Module 1 hiện tại). Thay vào đó
thêm 1 bảng cấu hình RIÊNG cho payroll:

```sql
CREATE TABLE payroll_mixed_latex_rate_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_price      NUMERIC(12,2) NOT NULL,   -- VND/kg, áp dụng cho tổng kg (cup+strip+coagulated)
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    EXCLUDE USING gist (daterange(effective_from, effective_to) WITH &&)  -- chỉ 1 dòng hiệu lực tại 1 thời điểm
);
```
Khi tính lương: `mủ_tạp_kg = SUM(production_record_items.kg WHERE latex_type IN (cup, strip, coagulated))`,
`mủ_tạp_tiền = mủ_tạp_kg × unit_price hiện hành`. Không đổi cách `cup`/`strip`/`coagulated` được
lưu/hiển thị ở màn Sản lượng — đây thuần là 1 phép tính riêng cho payroll.

### 2.2 "Hạng kỹ thuật" — XÉT LẠI THEO TỪNG THÁNG, không phải thuộc tính cố định của nhân viên
> **Sửa sau khi user chỉnh lại (2026-09-04):** bản đầu tiên đặt `technical_grade` làm cột cố định
> trên `employees` — SAI, vì hạng kỹ thuật là tiêu chí xét THEO TỪNG THÁNG (1 nhân viên có thể đổi
> hạng tháng này sang tháng khác). Đã sửa: bỏ cột trên `employees`, thay bằng 1 bảng gán hạng theo
> (employee_id, year_month) — CÙNG PATTERN với `payroll_deductions` (mục 2.6).
```sql
CREATE TABLE employee_technical_grade_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    year_month      VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
    grade           VARCHAR(1) NOT NULL CHECK (grade IN ('a','b','c')),
    updated_by      UUID NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, year_month)
);

CREATE TABLE technical_grade_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade           VARCHAR(1) NOT NULL CHECK (grade IN ('a','b','c')),
    unit_price      NUMERIC(12,2) NOT NULL,   -- VND/tháng, CỐ ĐỊNH — không nhân số lượng
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    EXCLUDE USING gist (grade WITH =, daterange(effective_from, effective_to) WITH &&)
);
```
Tính lương: nếu có dòng `employee_technical_grade_assignments` cho đúng (employeeId, yearMonth)
đang xét → cộng thẳng `unit_price` hiện hành của đúng `grade` đó, 1 lần/tháng (không phụ thuộc số
ngày công/số lần). Không có dòng → hạng_kỹ_thuật = 0, không lỗi (nhân viên chưa được xếp hạng
tháng đó). "Sửa hạng" trong UI Bảng lương = upsert 1 dòng ở bảng này cho đúng tháng đang xem — KHÔNG
đụng tháng khác (đối xứng với cách "Trừ/Tạm ứng" hoạt động ở mục 2.6, khác nhau ở chỗ hạng kỹ thuật
KHÔNG có "mặc định hệ thống" — mặc định là "chưa xếp hạng" = 0đ).

### 2.3 "Công thời vụ" — thêm 1 dòng vào `allowance_configs` hiện có
```sql
INSERT INTO allowance_configs (code, name, calc_type, unit_price, effective_from) VALUES
    ('seasonal_work', 'Công thời vụ', 'per_day', <cần user xác nhận đơn giá>, '<ngày hiệu lực>');
```
`attendance_type` CHECK constraint ở `attendance_records` (migration 001 dòng 190) phải mở rộng
thêm `'seasonal_work'`.
**Cần xác nhận với user trước khi viết migration thật:** đơn giá chính xác + `calc_type` đúng
(`per_day` là suy đoán từ cột "Ngày | Tiền" trong ảnh, chưa chắc chắn 100%) + ngày hiệu lực.

### 2.4 Chốt lương — 1 cờ đơn giản theo THÁNG (không theo nhân viên/Tổ)
Theo xác nhận của user: chốt cả tháng 1 lần, KHÔNG immutable (vẫn sửa được sau khi chốt, chỉ là cờ
hiển thị) — vì vậy KHÔNG cần state machine phức tạp kiểu APPROVED, chỉ cần 1 bảng đánh dấu:
```sql
CREATE TABLE payroll_period_locks (
    year_month  CHAR(7) PRIMARY KEY,  -- 'YYYY-MM'
    locked_by   UUID NOT NULL REFERENCES users(id),
    locked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Có dòng cho `year_month` → "Đã chốt". Không có dòng → "Chưa chốt". "Mở chốt" = xóa dòng (không cần
audit log riêng ở v1, có thể bổ sung sau nếu cần).

### 2.5 Trạng thái dòng nhân viên — DERIVED, không lưu DB
Theo xác nhận của user, dựa vào status của `production_records`/`attendance_records` trong tháng
của nhân viên đó (cùng field `status`/`RecordStatus` đã có — production/attendance):
```text
- "Thiếu dữ liệu"   : KHÔNG có production_records nào (status <> cancelled) trong tháng cho nhân viên này
- "Cần kiểm tra"     : có ít nhất 1 production_records đang DRAFT trong tháng
- "Đã xác nhận"      : có record, và TẤT CẢ production_records (status <> cancelled) trong tháng đều APPROVED
```
`attendance_records` mặc định đã `confirmed` ngay khi tạo (CLAUDE.md §4 — không qua draft trừ luồng
OCR, mà attendance hiện tại không có OCR) nên không ảnh hưởng tới rule "Cần kiểm tra" ở trên trong
v1 — chỉ `production_records.status` mới quyết định.

### 2.6 Trừ / Tạm ứng — mặc định hệ thống + override theo từng nhân viên/tháng
Xác nhận với user: mặc định MỌI nhân viên tạm ứng 1.000.000đ/tháng, Admin được sửa riêng cho từng
người khi cần (không phải nhập tay từ đầu cho tất cả — chỉ sửa những trường hợp khác mặc định).
Thiết kế 2 bảng, tách mặc định hệ thống khỏi override cá nhân (không nhét chung 1 bảng — mặc định
cần sửa được ở "Cấu hình hệ thống" mà không phải sửa từng dòng nhân viên):

```sql
-- Cấu hình chung, key-value đơn giản (tái dùng cho các setting hệ thống khác sau này nếu cần,
-- khớp mục "Cấu hình hệ thống" trong sidebar ảnh 1) — time-versioned nhẹ, không cần daterange đầy
-- đủ như rate_configs vì chỉ 1 giá trị hiện hành tại 1 thời điểm, không cần lịch sử chồng lấn phức tạp.
CREATE TABLE payroll_settings (
    key             VARCHAR(50) PRIMARY KEY,      -- vd 'default_monthly_advance'
    value           NUMERIC(12,2) NOT NULL,
    updated_by      UUID NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO payroll_settings (key, value, updated_by, updated_at)
    VALUES ('default_monthly_advance', 1000000, <admin seed user id>, now());

-- Override theo từng nhân viên/tháng — CHỈ có dòng khi Admin chủ động sửa khác mặc định.
CREATE TABLE payroll_deductions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    year_month      CHAR(7) NOT NULL,   -- 'YYYY-MM'
    amount          NUMERIC(12,2) NOT NULL,
    updated_by      UUID NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, year_month)
);
```
Rule khi tính lương: `Trừ/Tạm ứng = payroll_deductions.amount nếu có dòng (employee_id, year_month),
ngược lại = payroll_settings['default_monthly_advance'].value hiện hành`. Sửa 1 dòng trong UI bảng
lương (PATCH) = upsert vào `payroll_deductions`, KHÔNG đổi `payroll_settings` (đổi mặc định hệ
thống là hành động riêng, ở màn Cấu hình hệ thống — LATER, ngoài scope UI v1, chỉ cần seed sẵn
1.000.000 qua migration là đủ cho MVP).

---

## 3. Công thức tính lương (per nhân viên / tháng, runtime — không lưu DB)

```text
mủ_nước_tiền     = SUM(kg WHERE latex_type=water,  status=APPROVED trong tháng) × rate_configs hiện hành(water)
mủ_tạp_tiền      = SUM(kg WHERE latex_type IN (cup,strip,coagulated), status=APPROVED trong tháng)
                    × payroll_mixed_latex_rate_configs hiện hành
bồi_thuốc_tiền   = SUM(quantity WHERE attendance_type=medication trong tháng) × allowance_configs hiện hành(medication)
chuyên_cần_tiền  = SUM(quantity WHERE attendance_type=attendance trong tháng) × allowance_configs hiện hành(attendance)
mưa_bão_tiền     = SUM(quantity WHERE attendance_type=storm_allowance trong tháng) × allowance_configs hiện hành(storm_allowance)
thời_vụ_tiền     = SUM(quantity WHERE attendance_type=seasonal_work trong tháng) × allowance_configs hiện hành(seasonal_work)
hạng_kỹ_thuật    = technical_grade_configs hiện hành(assignment(employeeId, yearMonth).grade)  -- flat, chỉ nếu có dòng gán hạng tháng đó

Tổng lương  = mủ_nước_tiền + mủ_tạp_tiền + bồi_thuốc_tiền + chuyên_cần_tiền
              + mưa_bão_tiền + thời_vụ_tiền + hạng_kỹ_thuật
Thực lãnh   = Tổng lương − Trừ/Tạm ứng   -- xem mục 2.6: override payroll_deductions, mặc định payroll_settings
```
"Đơn giá hiện hành" = dòng `rate_configs`/`allowance_configs`/`technical_grade_configs`/
`payroll_mixed_latex_rate_configs` có `effective_from <= <ngày cuối tháng>` và
(`effective_to IS NULL` hoặc `effective_to >= <ngày đầu tháng>`) — cùng cách các báo cáo hiện tại
(`ReportController`) đang chọn rate theo thời gian, audit lại code thật khi implement để tái dùng
đúng hàm sẵn có, không viết lại logic chọn rate từ đầu.

---

## 4. API (đề xuất — audit lại `ReportController` trước khi code, tái dùng nếu có thể)

```text
GET /api/v1/payroll?yearMonth=2026-08&teamId=&status=&query=
  → PayrollSummaryResponse {
      yearMonth, totalNetPay, totalEmployees, needsReviewCount, missingDataCount,
      locked: boolean, lockedBy, lockedAt,
      rows: [ PayrollRowResponse {
          employeeId, employeeName, teamId, teamName,
          waterKg, waterAmount, mixedLatexKg, mixedLatexAmount,
          medicationCount, medicationAmount, attendanceDays, attendanceAmount,
          stormAllowanceDays, stormAllowanceAmount, seasonalWorkDays, seasonalWorkAmount,
          technicalGrade, technicalGradeAmount,
          totalPay, deduction, deductionIsOverride, netPay, rowStatus
      } ]
  }

GET /api/v1/payroll/{employeeId}?yearMonth=2026-08
  → PayrollDetailResponse (breakdown đầy đủ như panel bên phải ảnh 2 — mỗi dòng kèm
    "số lượng × đơn giá = thành tiền" để trace được, giống nguyên tắc drill-down của Spec 2 mục 22-24)

PATCH /api/v1/payroll/{employeeId}/deduction?yearMonth=2026-08   body: { amount }
  → upsert payroll_deductions (employee_id, year_month) — sửa Trừ/Tạm ứng riêng cho 1 người/1 tháng,
    KHÔNG đổi payroll_settings mặc định (mục 2.6). `deductionIsOverride=true` ở response sau khi có
    dòng override, để UI phân biệt "đang dùng mặc định" vs "đã chỉnh tay" (tránh Admin tưởng nhầm
    giá trị 1.000.000 hiển thị là do họ tự nhập).

PATCH /api/v1/payroll/{employeeId}/technical-grade?yearMonth=2026-08   body: { grade: 'A'|'B'|'C'|null }
  → upsert employee_technical_grade_assignments (employee_id, year_month) — xếp/đổi hạng riêng cho
    ĐÚNG tháng đang xem (mục 2.2), KHÔNG ảnh hưởng tháng khác. `grade: null` = xóa dòng (bỏ xếp hạng
    tháng đó, quay lại 0đ).

POST /api/v1/payroll/lock?yearMonth=2026-08     → khóa (tạo dòng payroll_period_locks)
POST /api/v1/payroll/unlock?yearMonth=2026-08   → mở khóa (xóa dòng)

GET /api/v1/payroll/export?yearMonth=2026-08&teamId=   → Excel (tái dùng ExcelReportExportService)
```
`query` (tìm theo họ tên) — SHOULD, không MUST v1.
`status` filter theo `rowStatus` derived (mục 2.5) — MUST (khớp filter "Trạng thái" trong ảnh).

---

## 5. Phạm vi MUST / SHOULD / LATER (v1)

**MUST**: bảng tổng hợp theo tháng + filter Tổ/trạng thái, breakdown chi tiết theo nhân viên
(drill-down, trace được về record nguồn — cùng nguyên tắc Spec 2), sửa Trừ/Tạm ứng riêng từng người
(mục 2.6), chốt/mở chốt lương (cờ đơn giản), Loading/Empty/Error, responsive desktop (ảnh là
desktop, mobile để sau).

**SHOULD**: search theo tên, export Excel.

**LATER**: in phiếu lương ("In phiếu lương" nút trong ảnh), lương cho `latex_sales`, audit log chi
tiết cho hành động chốt/mở chốt, UI quản lý "Hạng kỹ thuật"/"Mủ tạp" trong "Thành phần lương" (cần
CRUD riêng, giống `rate-configs.tsx`/`allowance-configs.tsx` hiện có), UI sửa
`payroll_settings['default_monthly_advance']` (màn Cấu hình hệ thống — v1 chỉ seed sẵn qua
migration, chưa cần UI).

---

## 6. Test plan (nháp — hoàn thiện khi vào implement)

```text
PAYROLL-01  Nhân viên có đủ 7 thành phần → tổng đúng bằng tổng 7 khoản
PAYROLL-02  Nhân viên chỉ có mủ nước, không có phụ cấp nào → các khoản khác = 0, không lỗi
PAYROLL-03  Không có dòng employee_technical_grade_assignments cho (employeeId, yearMonth) đang xét
            → hạng_kỹ_thuật = 0, không throw
PAYROLL-03b Nhân viên có grade='A' tháng 08 nhưng KHÔNG có dòng gán cho tháng 09 → tháng 09
            hạng_kỹ_thuật = 0 (KHÔNG tự kế thừa hạng tháng trước — mỗi tháng xét độc lập)
PAYROLL-04  production_records có dòng DRAFT trong tháng → rowStatus = "Cần kiểm tra"
PAYROLL-05  Không có production_records nào trong tháng → rowStatus = "Thiếu dữ liệu"
PAYROLL-06  Toàn bộ production_records APPROVED → rowStatus = "Đã xác nhận"
PAYROLL-07  record CANCELLED không tính vào rowStatus lẫn tổng tiền (giống Official Production)
PAYROLL-08  rate_configs/allowance_configs đổi giá giữa tháng (effective_from nằm giữa tháng) →
            tính đúng theo NGÀY thực tế của từng production_record/attendance_record, không dùng 1
            giá cố định cho cả tháng (cần xác nhận: có tính theo mốc effective per-record hay theo
            1 mốc "cuối tháng" duy nhất — XEM MỤC 9, câu hỏi còn mở)
PAYROLL-09  Lock tháng → GET vẫn trả đúng dữ liệu (không immutable, theo quyết định user)
PAYROLL-10  Filter theo Tổ/trạng thái áp dụng nhất quán summary + rows (giống PROD-16 Spec 2)
PAYROLL-11  Nhân viên chưa có dòng payroll_deductions cho tháng đang xem → deduction =
            payroll_settings['default_monthly_advance'] (1.000.000), deductionIsOverride = false
PAYROLL-12  PATCH deduction cho 1 nhân viên/tháng → GET sau đó trả đúng amount vừa sửa,
            deductionIsOverride = true; các nhân viên khác KHÔNG bị ảnh hưởng (vẫn dùng mặc định)
PAYROLL-13  Đổi payroll_settings['default_monthly_advance'] → nhân viên CHƯA có override phản ánh
            giá trị mới ngay; nhân viên ĐÃ override giữ nguyên giá trị đã sửa (không bị ghi đè)
```

---

## 7. Implementation phases (đề xuất, chờ duyệt)

1. Migration: `payroll_mixed_latex_rate_configs`, `technical_grade_configs`,
   `employee_technical_grade_assignments`, `payroll_period_locks`, `payroll_settings` (seed
   `default_monthly_advance`=1.000.000), `payroll_deductions`, mở rộng CHECK
   `attendance_records.attendance_type` thêm `seasonal_work`, seed `allowance_configs` dòng
   `seasonal_work`. **✅ ĐÃ XONG** (migration 011 + entity, commit b6be99b — bản đầu tiên sai ở
   chỗ đặt technical_grade làm cột cố định trên `employees`, đã sửa lại thành bảng gán theo tháng).
2. Backend: `PayrollService`/`PayrollController` (GET summary, GET detail, PATCH deduction, PATCH
   technical-grade, lock/unlock), tái dùng logic chọn rate-theo-thời-gian đã có ở
   `ReportController`/service liên quan (audit xác nhận: KHÔNG có sẵn — `ReportService` chỉ pivot
   kg, không lookup rate theo ngày; viết mới, xem mục 3 công thức). **✅ ĐÃ XONG** — đơn giá cả
   tháng chọn theo 1 mốc tham chiếu DUY NHẤT (ngày cuối tháng), đơn giản hóa có chủ đích cho v1 vì
   không có sẵn cơ chế nào để tái dùng cho rate-theo-từng-ngày (xem javadoc `PayrollService`) — vẫn
   là câu hỏi mở mục 8, không chặn MVP.
3. Test: PAYROLL-01 → 13 (unit cho công thức tính, không cần integration DB thật cho phần rate
   lookup nếu tách được thành pure function). **✅ ĐÃ XONG** — `PayrollServiceTest` (Mockito, 12
   test, chạy pass trong sandbox không cần DB). PAYROLL-07 (lọc CANCELLED) và PAYROLL-08 (rate theo
   ngày thực tế) KHÔNG test được ở mức unit vì nằm trong nội dung JPQL bị mock — cần integration
   test DB thật sau nếu muốn phủ đầy đủ.
4. Frontend: màn Bảng lương (web/desktop — có thể tái dùng phần lớn pattern từ `LookupScreen`/
   `ProductionReportScreen` hiện có), panel chi tiết nhân viên (giống ảnh 2) kèm sửa Trừ/Tạm ứng,
   export Excel. **✅ ĐÃ XONG PHẦN CHÍNH** — route `(web)/payroll`, `PayrollScreen` (bảng chỉ đọc +
   panel chi tiết bên phải khi bấm 1 dòng, KHÔNG sửa inline trong bảng — tránh `AppSelect` phá layout
   nhiều cột), sửa Trừ/Tạm ứng + Hạng kỹ thuật ở panel. Thêm field `technicalGrade` vào
   `PayrollDetailResponse` (backend) khi làm tới đây — DTO Phase 2 thiếu, cần cho frontend preselect
   đúng giá trị thay vì tự suy từ label dòng breakdown. **Export Excel CHƯA làm** (backend
   `/api/v1/payroll/export` cũng chưa có — SHOULD, để phase sau). Verify: `tsc --noEmit` +
   `expo export --platform web` sạch — **CHƯA** test bằng mắt trên trình duyệt thật/dữ liệu thật.
5. Frontend: UI quản lý "Hạng kỹ thuật" + "Mủ tạp" trong admin-catalog (CRUD, cùng pattern
   `rate-configs.tsx`) — có thể tách phase riêng nếu Phase 4 đã đủ dùng qua seed data tạm. **✅ ĐÃ
   XONG** — cần viết CRUD backend TRƯỚC (Phase 2 chỉ làm entity/repository, chưa có
   Service/Controller cho 2 bảng giá này — audit lại lúc bắt tay mới phát hiện gap này):
   `PayrollMixedLatexRateConfigController` (`/api/v1/payroll-mixed-latex-rate-configs`, không có key
   phân biệt — chỉ 1 dòng hiệu lực toàn hệ thống tại 1 thời điểm) +
   `TechnicalGradeConfigController` (`/api/v1/technical-grade-configs`, chống chồng lấn theo
   `grade`). Frontend: `PayrollMixedLatexRateConfigsScreen` + `TechnicalGradeConfigsScreen`
   (route `(web)/admin-catalog/payroll-mixed-latex` + `technical-grades`, thêm 2 nav item), cùng
   pattern CRUD time-versioned không-DELETE như `RateConfigsScreen`. `grade` chỉ chọn được lúc TẠO
   MỚI (sửa 1 dòng lịch sử không đổi hạng được). Verify: `compileJava` sạch, `tsc --noEmit` +
   `expo export --platform web` sạch — **CHƯA** test bằng mắt/dữ liệu thật.
6. **SỬA HƯỚNG** — Phase 4 xây màn Bảng lương trong `apps/mobile`'s `(web)` route group, nhưng đó
   KHÔNG phải web frontend thật của dự án: `apps/web` (React+TS+Vite+MUI, tồn tại song song trên
   `main`, xem `docs/specs/spec-3-web-ui-home.md`) mới là web app chính thức — phát hiện muộn vì 2
   nhánh phát triển song song không đồng bộ tới lúc merge. Route/`PayrollScreen` cũ trong
   `apps/mobile` **VẪN GIỮ NGUYÊN** (không xóa — vẫn hoạt động, có thể hữu ích nếu Admin dùng điện
   thoại), nhưng KHÔNG còn là màn chính. Build lại toàn bộ UI (KPI row, filter bar, bảng 2 hàng
   header, panel chi tiết sửa Trừ/Tạm ứng + Hạng kỹ thuật, nút Chốt/Mở khóa) trong
   `apps/web/src/features/payroll/`, route `/bang-luong` (đổi `status: 'pending' → 'ready'` trong
   `navConfig.tsx`), gọi thẳng `PayrollController` có sẵn — không cần dựng lại backend. **✅ ĐÃ
   XONG** — đối chiếu đúng bố cục 2 ảnh mockup gốc. Verify: `tsc -b && vite build` + `oxlint` sạch;
   test thật qua mock backend (Node http server giả `/api/v1/payroll`, `/api/v1/payroll/{id}`,
   `/api/v1/teams`, `/api/v1/users/me`) + Playwright screenshot — bảng, click chọn dòng, panel chi
   tiết, sửa Hạng kỹ thuật render đúng. **CHƯA** test với backend thật (sandbox không có mạng tới
   Supabase Postgres) — cần verify lại khi có DB thật. Export Excel vẫn CHƯA làm (như Phase 4).

---

## 8. CÂU HỎI CÒN MỞ — chưa hỏi user, KHÔNG được tự suy diễn khi implement

> ~~Trừ / Tạm ứng~~ — **đã xác nhận**, xem mục 2.6 (mặc định 1.000.000đ/tháng qua `payroll_settings`,
> override từng người qua `payroll_deductions`).

1. Đơn giá + ngày hiệu lực chính xác cho `seasonal_work` (mục 2.3) — số trong ảnh không đọc được rõ
   ràng đơn giá cột "Công thời vụ" (khác các cột còn lại có ghi rõ "x đ/đơn vị" ngay dưới tên cột).
2. Rate lookup theo NGÀY thực tế của từng record hay theo 1 mốc chung cho cả tháng khi giá đổi giữa
   tháng (PAYROLL-08) — hiện chưa rõ, cần audit cách `ReportController` đang làm trước khi quyết.
3. "Xem phiếu nguồn"/"In phiếu lương" (nút trong ảnh 2) — in phiếu lương ra định dạng gì (PDF?
   Excel 1 dòng?) — đánh dấu LATER, chưa cần trả lời ngay cho MVP.

Cả 3 câu trên đều KHÔNG chặn MUST của v1 (seasonal_work có thể seed tạm 1 giá trị placeholder rồi
sửa sau qua "Thành phần lương" một khi CRUD làm xong — LATER theo mục 5; mục 2/3 chỉ ảnh hưởng độ
chính xác khi giá đổi giữa tháng, trường hợp hiếm, không chặn happy-path).
