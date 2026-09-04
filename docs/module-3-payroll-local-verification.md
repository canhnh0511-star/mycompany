# Module 3 (Bảng lương) — việc cần làm tiếp ở môi trường LOCAL

> Sandbox agent dùng để build phần này (branch `claude/tim-phieu-screen-status-6wfiar`, đã merge
> fast-forward vào `main`) **không có mạng tới Supabase Postgres** (`timeout 6 bash -c 'cat < /dev/null
> > /dev/tcp/aws-0-...pooler.supabase.com/5432'` → timeout) — mọi thứ dưới đây chỉ được verify bằng
> `./gradlew compileJava`/`compileTestJava` (backend), `tsc`/`vite build`/`oxlint` (2 frontend), test
> unit không cần DB (`PayrollServiceTest`, Mockito), và 1 mock HTTP server + Playwright screenshot cho
> `apps/web`. **CHƯA CÓ LẦN NÀO chạy thật với Postgres/dữ liệu thật.** File này liệt kê chính xác việc
> cần làm ở máy có mạng tới DB thật để hoàn tất verify.

Tham chiếu đầy đủ quyết định thiết kế: `docs/specs/spec-3-bang-luong-v1-draft.md` (đặc biệt mục 7
"Implementation phases" — đã đánh dấu ✅ từng phần, và mục 8 "Câu hỏi còn mở").

---

## 0. Đã sửa 1 lỗi trước khi merge — cần biết

2 nhánh phát triển song song (`main` và branch Module 3) mỗi bên tự tạo **1 file migration đánh số
`011_`** khác nhau (`011_add_scan_image_ocr_row_count.sql` ở `main`, `011_module3_payroll_foundation.sql`
ở nhánh Module 3) — Flyway sẽ lỗi "duplicate migration version" nếu chạy nguyên trạng. Đã đổi số file
Module 3 thành **`015_module3_payroll_foundation.sql`** (số tiếp theo sau `014_add_user_phone.sql` của
`main`) trước khi merge — `db/migrations/` hiện tại KHÔNG còn trùng số, không cần làm gì thêm ở bước
này, chỉ ghi lại để biết vì sao số nhảy từ 011 lúc soạn spec sang 015 lúc merge.

---

## 1. Chạy migration + khởi động backend thật

```bash
cd services/api
cp .env.example .env   # nếu chưa có — điền DB_URL/DB_USERNAME/DB_PASSWORD/JWT_SECRET thật
# Bắt buộc: DB_URL/DB_USERNAME/DB_PASSWORD (Supabase Session Pooler), JWT_SECRET.
# Tùy chọn (không cần cho việc verify Bảng lương): ANTHROPIC_API_KEY, SUPABASE_* (chỉ cần cho luồng OCR).
export $(cat .env | xargs)   # hoặc cách bạn thường nạp .env cho Gradle/Spring ở máy này
./gradlew bootRun
```

Kỳ vọng: log Flyway áp `015_module3_payroll_foundation.sql` (và mọi migration `007`-`014` của `main`
nếu DB này chưa từng chạy chúng) thành công, `GET /actuator/health` trả `UP`, `/swagger-ui.html` load
được danh sách endpoint (bao gồm `/api/v1/payroll`, `/api/v1/payroll-mixed-latex-rate-configs`,
`/api/v1/technical-grade-configs`).

Đăng nhập lấy JWT (tài khoản seed từ `002_seed_admin_user.sql` — đổi mật khẩu ngay nếu đây không phải
máy local thuần túy):

```bash
curl -s -X POST localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mycompany.local","password":"changeme123!"}'
# -> { "accessToken": "..." }
```

---

## 2. Seed dữ liệu tối thiểu để Bảng lương KHÔNG toàn số 0

`GET /api/v1/payroll` tự tính từ dữ liệu nguồn — nếu DB trống (Team/Employee mới, chưa có
RateConfig/AllowanceConfig/PayrollMixedLatexRateConfig/TechnicalGradeConfig hiệu lực tại ngày cuối
tháng đang xem), toàn bộ cột "Thành tiền" sẽ ra 0đ dù có ProductionRecord/AttendanceRecord thật — không
phải bug, chỉ là thiếu config giá. Cần có đủ (thay `$TOKEN` bằng accessToken ở bước 1):

- 1 Team + ít nhất 1-2 Employee ACTIVE thuộc team đó (đã có CRUD từ Module 1, `/api/v1/teams`,
  `/api/v1/employees`).
- `RateConfig` cho `latex_type=water` hiệu lực tại tháng test (`/api/v1/rate-configs`, đã có sẵn từ
  Module 1 — nếu DB dev cũ đã có sẵn thì bỏ qua).
- `PayrollMixedLatexRateConfig` (**MỚI**, `/api/v1/payroll-mixed-latex-rate-configs`, POST):
  ```json
  { "unitPrice": 10000, "effectiveFrom": "2026-01-01", "effectiveTo": null }
  ```
- `TechnicalGradeConfig` (**MỚI**, `/api/v1/technical-grade-configs`, POST) — cần cả 3 hạng nếu muốn
  test đủ, ví dụ hạng A:
  ```json
  { "grade": "A", "unitPrice": 350000, "effectiveFrom": "2026-01-01", "effectiveTo": null }
  ```
- `AllowanceConfig` cho `medication`, `attendance`, `storm_allowance` hiệu lực tại tháng test (đã có
  sẵn từ Module 1 CRUD `/api/v1/allowance-configs` — nếu DB dev cũ chưa seed thì cần thêm).
- **`seasonal_work` CHƯA có `AllowanceConfig` mặc định** (mục 8 spec — chưa xác nhận đơn giá thật) —
  nếu muốn thấy cột "Công thời vụ" khác 0, tự thêm 1 dòng tạm qua `/api/v1/allowance-configs` với
  `code: "seasonal_work"`, biết rằng đây là giá trị PLACEHOLDER, không phải giá đã chốt.
- `ProductionRecord`/`AttendanceRecord` status `APPROVED` (không phải `DRAFT`/`CANCELLED`) trong tháng
  test cho (các) Employee ở trên — nhập tay qua form hoặc batch API Module 1 đều được.
- (Tùy chọn) `EmployeeTechnicalGradeAssignment` cho tháng test — set qua PATCH
  `/api/v1/payroll/{employeeId}/technical-grade?yearMonth=2026-08` (`{"grade":"A"}`) SAU khi đã có ít
  nhất 1 `TechnicalGradeConfig` cho hạng đó, nếu không cột "Hạng kỹ thuật" sẽ trống toàn bộ.

---

## 3. Chạy 2 frontend, đối chiếu bằng mắt

### 3a. Web (`apps/web`) — màn CHÍNH, ưu tiên verify trước

```bash
cd apps/web
npm install
cp .env.example .env.local   # sửa VITE_API_BASE_URL nếu backend không ở :8080
npm run dev
```

**Trước khi mở `/bang-luong`**: backend phải chạy với `CORS_ALLOWED_ORIGINS` có
`http://localhost:5173` (mặc định KHÔNG có — xem `apps/web/README.md` mục "Gotcha"), nếu không mọi
request bị CORS chặn im lặng. Đăng nhập ở `/login` (JWT lưu `localStorage` key
`mycompany_access_token`, dùng chung quy ước với `apps/mobile`), vào sidebar "Bảng lương".

Checklist đối chiếu (so 2 ảnh mockup gốc, đã lưu trong lịch sử phiên trước — nếu cần lại, có thể
chụp/export từ session trước hoặc hỏi người dùng gửi lại):

- [ ] 4 KPI card đầu trang đúng số (Tổng thực lãnh / công nhân đang làm / cần kiểm tra / trạng thái chốt).
- [ ] Filter bar: đổi Tháng, đổi Tổ, đổi Trạng thái, gõ tìm kiếm — bảng cập nhật lại đúng.
- [ ] Bảng chính: 2 hàng header (nhóm thành phần lương + đơn vị con) hiện đủ, số liệu đúng theo dữ liệu
      seed ở mục 2, dòng "Cộng" ở cuối = tổng đúng.
- [ ] Click 1 dòng → panel chi tiết bên phải mở, đúng nhân viên, đúng breakdown.
- [ ] Đổi "Hạng kỹ thuật" trong panel → gọi PATCH thành công, bảng+panel cùng cập nhật ngay (không cần
      F5).
- [ ] Sửa "Tạm ứng" (bấm vào số, gõ số mới, Lưu) → PATCH thành công, cập nhật ngay.
- [ ] Bấm "Chốt lương" → 4 KPI card "Chưa chốt" đổi thành "Đã chốt", số liệu KHÔNG đổi (chỉ là cờ hiển
      thị, mục 2.4 spec — không phải immutable).
- [ ] Bấm "Mở khóa" → về lại trạng thái chưa chốt.
- [ ] "Xuất bảng lương" → hiện thông báo "sẽ có ở phiên bản sau" (chưa có backend export — có chủ đích,
      không phải thiếu sót).

### 3b. Mobile (`apps/mobile`, web mode) — màn phụ, không bắt buộc

`PayrollScreen` cũ (`apps/mobile/src/features/payroll/`, route `(web)/payroll`) vẫn còn nguyên, có thể
dùng để đối chiếu chéo số liệu với `apps/web` (phải khớp nhau vì cùng gọi 1 backend). **Lưu ý đã biết
từ phiên trước**: `apps/mobile` chạy `--web` hiện CRASH TRẮNG MÀN HÌNH do xung đột thư viện
(`nativewind@5.0.0-preview.4` + `react-native-css@3.0.7` + `react-native-web@0.21.2`, lỗi
`Cannot read properties of undefined (reading 'default')` — tái hiện cả ở `expo start --web` lẫn
`expo export --platform web` + serve tĩnh, **KHÔNG liên quan gì tới code Module 3**, chưa có hướng sửa
được duyệt). Nếu cần verify `PayrollScreen`, ưu tiên chạy trên **app thật (Android/iOS emulator)** thay
vì `--web` cho tới khi bug đó được xử lý riêng.

---

## 4. Integration test cần DB thật

`./gradlew test` hiện chỉ chạy được phần **unit test** trong sandbox (không cần DB) —
`PayrollServiceTest` (12 test, Mockito, đã xanh). Các integration test sau cần DB thật, chưa chạy được
lần nào ở sandbox này — chạy `./gradlew test` đầy đủ (không filter) ở máy có mạng tới Postgres:

- `AuthIntegrationTest`, `UserIntegrationTest` (mới từ `main`)
- `ScanBatchIntegrationTest`, `ScanBatchConcurrencyIntegrationTest` (Spec 1, từ `main`)
- `ProductionSummaryIntegrationTest` (Spec 2, từ `main`)
- `TeamIntegrationTest`, `ProductionRecordIntegrationTest` (Module 1, cũ)

Chưa có integration test riêng cho `PayrollService`/`PayrollController` (chỉ có unit test) — cân nhắc
viết thêm nếu cần phủ PAYROLL-07 (lọc CANCELLED)/PAYROLL-08 (rate theo ngày thực tế), 2 case
`spec-3-bang-luong-v1-draft.md` mục 7 phần 3 ghi là "KHÔNG test được ở mức unit vì nằm trong nội dung
JPQL bị mock".

---

## 5. Việc CHƯA làm, không chặn MVP nhưng cần biết

Xem đầy đủ ở `docs/specs/spec-3-bang-luong-v1-draft.md` mục 8 — tóm tắt:

1. Đơn giá + ngày hiệu lực thật cho `seasonal_work` — hiện chưa xác nhận (mục 2 ở trên dùng
   placeholder khi seed test).
2. Rate lookup theo NGÀY thực tế của từng record hay 1 mốc chung cho cả tháng (hiện dùng ngày cuối
   tháng, đơn giản hóa có chủ đích) — chỉ ảnh hưởng khi giá đổi GIỮA tháng, trường hợp hiếm.
3. "Xem phiếu nguồn" (disabled, có tooltip giải thích — dữ liệu Bảng lương là tổng hợp theo tháng,
   không gắn 1 phiếu chụp cụ thể) / "In phiếu lương" định dạng gì — LATER.
4. Export Excel `/api/v1/payroll/export` — SHOULD, chưa làm ở cả backend lẫn 2 frontend (nút bấm hiện
   toast "sẽ có ở phiên bản sau").
