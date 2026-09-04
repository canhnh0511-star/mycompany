# Spec (DRAFT) — Module 3: Bảng lương v1

> **Trạng thái: DRAFT — do Claude soạn dựa trên audit code thật + trả lời nghiệp vụ của user qua
> `AskUserQuestion` (xem lịch sử hội thoại), KHÔNG phải bản do user viết sẵn như Spec 1/Spec 2.**
> Có 1 điểm còn bỏ ngỏ chưa hỏi user (mục 8 "Trừ / Tạm ứng") — đánh dấu rõ, không tự suy diễn.
> Dừng lại chờ user duyệt trước khi implement, theo đúng kỷ luật đã áp dụng cho Module 1.

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

### 2.2 "Hạng kỹ thuật" — thuộc tính nhân viên + bảng giá theo hạng
```sql
ALTER TABLE employees ADD COLUMN technical_grade CHAR(1) CHECK (technical_grade IN ('A','B','C'));
-- nullable — nhân viên chưa xếp hạng thì không có phụ cấp này, không lỗi

CREATE TABLE technical_grade_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade           CHAR(1) NOT NULL CHECK (grade IN ('A','B','C')),
    unit_price      NUMERIC(12,2) NOT NULL,   -- VND/tháng, CỐ ĐỊNH — không nhân số lượng
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    EXCLUDE USING gist (grade WITH =, daterange(effective_from, effective_to) WITH &&)
);
```
Tính lương: nếu `employee.technical_grade IS NOT NULL` → cộng thẳng `unit_price` hiện hành của đúng
`grade` đó, 1 lần/tháng (không phụ thuộc số ngày công/số lần).

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
hạng_kỹ_thuật    = technical_grade_configs hiện hành(employee.technical_grade)  -- flat, chỉ nếu có grade

Tổng lương  = mủ_nước_tiền + mủ_tạp_tiền + bồi_thuốc_tiền + chuyên_cần_tiền
              + mưa_bão_tiền + thời_vụ_tiền + hạng_kỹ_thuật
Thực lãnh   = Tổng lương − Trừ/Tạm ứng   -- xem mục 8, nguồn dữ liệu CHƯA XÁC ĐỊNH
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
          totalPay, deduction, netPay, rowStatus
      } ]
  }

GET /api/v1/payroll/{employeeId}?yearMonth=2026-08
  → PayrollDetailResponse (breakdown đầy đủ như panel bên phải ảnh 2 — mỗi dòng kèm
    "số lượng × đơn giá = thành tiền" để trace được, giống nguyên tắc drill-down của Spec 2 mục 22-24)

POST /api/v1/payroll/lock?yearMonth=2026-08     → khóa (tạo dòng payroll_period_locks)
POST /api/v1/payroll/unlock?yearMonth=2026-08   → mở khóa (xóa dòng)

GET /api/v1/payroll/export?yearMonth=2026-08&teamId=   → Excel (tái dùng ExcelReportExportService)
```
`query` (tìm theo họ tên) — SHOULD, không MUST v1.
`status` filter theo `rowStatus` derived (mục 2.5) — MUST (khớp filter "Trạng thái" trong ảnh).

---

## 5. Phạm vi MUST / SHOULD / LATER (v1)

**MUST**: bảng tổng hợp theo tháng + filter Tổ/trạng thái, breakdown chi tiết theo nhân viên
(drill-down, trace được về record nguồn — cùng nguyên tắc Spec 2), chốt/mở chốt lương (cờ đơn
giản), Loading/Empty/Error, responsive desktop (ảnh là desktop, mobile để sau).

**SHOULD**: search theo tên, export Excel.

**LATER**: in phiếu lương ("In phiếu lương" nút trong ảnh), lương cho `latex_sales`, audit log chi
tiết cho hành động chốt/mở chốt, UI quản lý "Hạng kỹ thuật"/"Mủ tạp" trong "Thành phần lương" (cần
CRUD riêng, giống `rate-configs.tsx`/`allowance-configs.tsx` hiện có).

---

## 6. Test plan (nháp — hoàn thiện khi vào implement)

```text
PAYROLL-01  Nhân viên có đủ 7 thành phần → tổng đúng bằng tổng 7 khoản
PAYROLL-02  Nhân viên chỉ có mủ nước, không có phụ cấp nào → các khoản khác = 0, không lỗi
PAYROLL-03  employee.technical_grade = NULL → hạng_kỹ_thuật = 0, không throw
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
```

---

## 7. Implementation phases (đề xuất, chờ duyệt)

1. Migration: `payroll_mixed_latex_rate_configs`, `technical_grade_configs`, `payroll_period_locks`,
   `employees.technical_grade`, mở rộng CHECK `attendance_records.attendance_type` thêm `seasonal_work`,
   seed `allowance_configs` dòng `seasonal_work`.
2. Backend: `PayrollService`/`PayrollController` (2 endpoint GET + lock/unlock), tái dùng logic chọn
   rate-theo-thời-gian đã có ở `ReportController`/service liên quan (audit trước khi viết mới).
3. Test: PAYROLL-01 → 10 (unit cho công thức tính, không cần integration DB thật cho phần rate lookup
   nếu tách được thành pure function).
4. Frontend: màn Bảng lương (web/desktop — có thể tái dùng phần lớn pattern từ `LookupScreen`/
   `ProductionReportScreen` hiện có), panel chi tiết nhân viên (giống ảnh 2), export Excel.
5. Frontend: UI quản lý "Hạng kỹ thuật" + "Mủ tạp" trong admin-catalog (CRUD, cùng pattern
   `rate-configs.tsx`) — có thể tách phase riêng nếu Phase 4 đã đủ dùng qua seed data tạm.

---

## 8. CÂU HỎI CÒN MỞ — chưa hỏi user, KHÔNG được tự suy diễn khi implement

1. **Trừ / Tạm ứng** ("Trừ / Tạm ứng" cột trong ảnh, có giá trị khác 0 ở mọi dòng — vd 1.000.000)
   — domain hiện tại KHÔNG có bảng nào lưu khấu trừ/tạm ứng theo nhân viên/tháng. Cần hỏi: nhập tay
   thủ công mỗi tháng (form riêng), hay có nguồn dữ liệu khác (vd ứng lương từ Module khác)? Đây là
   **gap lớn nhất chưa giải quyết** — ảnh hưởng trực tiếp cột "Thực lãnh" (MUST).
2. Đơn giá + ngày hiệu lực chính xác cho `seasonal_work` (mục 2.3).
3. Rate lookup theo NGÀY thực tế của từng record hay theo 1 mốc chung cho cả tháng khi giá đổi giữa
   tháng (PAYROLL-08) — hiện chưa rõ, cần audit cách `ReportController` đang làm trước khi quyết.
4. "Xem phiếu nguồn"/"In phiếu lương" (nút trong ảnh 2) — in phiếu lương ra định dạng gì (PDF?
   Excel 1 dòng?) — đánh dấu LATER, chưa cần trả lời ngay cho MVP.

**Không implement bất kỳ phần nào phụ thuộc mục 8.1 (Trừ/Tạm ứng) cho tới khi có câu trả lời** —
đây là field xuất hiện ở MỌI dòng trong ảnh, không thể bỏ qua nếu làm đúng "Thực lãnh".
