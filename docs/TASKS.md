# TASKS — Module 1: Chi phí / Sản lượng (backend Spring Boot)

> Checklist sống. Cập nhật (đánh dấu `[x]`) khi làm xong, không xóa mục đã hoàn thành — giữ lại làm lịch sử.
> Đọc `CLAUDE.md` (toàn bộ) + các ADR liên quan trước khi làm bất kỳ mục nào — file này chỉ tóm tắt việc
> cần làm + tham chiếu, không lặp lại quyết định thiết kế đã chốt ở nơi khác.

## Trạng thái hiện tại (tính đến khi file này được tạo)

Đã xong: 13 JPA entity + converter (đủ toàn bộ data model), JWT auth (`POST /api/v1/auth/login`,
`GET/PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/password`), `RequestIdFilter` + JSON structured
logging (`docs/adr/0008-logging-conventions.md`), `GlobalExceptionHandler` (validation/404/409/400/500 +
lưới an toàn `DataIntegrityViolationException`), `./gradlew build` xanh, Supabase project + Storage + kết
nối DB thật đã chạy (`bootRun` áp Flyway 001–003 thành công, login trả JWT hợp lệ). **Phase 1 xong**: CRUD
đủ cho Teams/Employees/LatexTypes/RateConfigs/AllowanceConfigs (`controller/service/dto`, không expose
entity trực tiếp), tất cả đã smoke-test bằng curl trên Supabase dev thật (2026-08-06) — happy path + từng
loại lỗi (404/400/409) cho mỗi resource.

Chưa có: controller/service cho các bảng nghiệp vụ vận hành (ProductionRecord, AttendanceRecord,
LatexSale, OcrCallLog, EditHistory — Phase 2+), tích hợp Claude Vision OCR, export Excel/PDF,
springdoc-openapi, `docs/api.md`, test (unit lẫn integration).

`build.gradle.kts` hiện chưa có dependency cho: springdoc-openapi, Apache POI, OpenPDF, Anthropic SDK/HTTP
client cho OCR — cần thêm khi bắt tay từng phase tương ứng bên dưới (không thêm trước khi cần).

**Lưu ý cho Phase 2+ (phát hiện lúc làm Phase 1, 2026-08-06):** entity nào có `@CreationTimestamp`
(`createdAt`) và id sinh client-side (`GenerationType.UUID`, tất cả entity trong repo đều vậy) — nếu
service `create()` gọi `repository.save(entity)` rồi map sang response NGAY trong cùng transaction,
`createdAt` sẽ là `null` trong response (Hibernate trì hoãn INSERT tới lúc flush/commit, mặc định AUTO
flush mode không flush ngay sau `save()`). Phải dùng `repository.saveAndFlush(entity)` ở nhánh create khi
cần đọc lại field do Hibernate tự sinh ngay lập tức — xem `TeamService`/`EmployeeService`/`RateConfigService`
làm mẫu. `ProductionRecord`, `LatexSale` cũng có `createdAt` — nhớ áp dụng khi làm Phase 2.

## Open Questions còn treo (khác với "Quyết định đã chốt" — những cái NÀY chưa quyết)

- [ ] Swagger UI (`springdoc-openapi`) mở ở profile nào — chỉ dev/local, hay cho phép truy cập ở prod có
  auth riêng? (Phase 5)
- [x] ~~Chưa có endpoint đổi mật khẩu~~ — RESOLVED 2026-08-06: `PATCH /api/v1/users/me/password`
  (`ChangePasswordRequest`: `currentPassword`/`newPassword`, verify bằng `PasswordEncoder.matches` trước
  khi cho đổi). Đã test round-trip (đổi → login bằng mật khẩu mới OK, login bằng mật khẩu cũ 401 → đổi lại)
  nhưng **CHƯA đổi mật khẩu admin seed thật** — vẫn còn `changeme123!`, xem Phase 0 bên dưới.
- [x] ~~Định dạng response lỗi 409~~ — RESOLVED 2026-08-06: service layer tự validate chồng lấn
  effective_from/to TRƯỚC khi insert/update (`RateConfigService`/`AllowanceConfigService`,
  `DateRangeOverlap` helper dùng chung) → ném `ConflictException` (409, `ProblemDetail`, message có id +
  khoảng ngày của dòng xung đột). `DataIntegrityViolationException` (race condition lọt qua check ở app,
  hoặc vi phạm UNIQUE khác) → 409 chung chung ở `GlobalExceptionHandler`, không lộ tên constraint SQL.
- [ ] Giới hạn kích thước/định dạng ảnh upload lên Supabase Storage (chỉ JPEG/PNG? giới hạn MB?) — chưa
  chốt, cần quyết trước khi code signed upload URL (Phase 3)
- [ ] Có nên thêm dotenv loader (vd `me.paulschwarz:spring-dotenv`) để `./gradlew bootRun`/IDE tự đọc
  `services/api/.env`, hay giữ quy ước export biến môi trường thủ công? Hiện tại `.env` KHÔNG tự nạp — dev
  máy mới dễ quên bước này (phát hiện 2026-08-06, xem Phase 0)
- [ ] `LatexType` xóa được (hard delete có guard tham chiếu) thay vì chỉ "ngừng dùng" như Employee — quyết
  định 2026-08-06 chọn nhánh không cần schema mới (không thêm cột status) để không chặn Phase 1. Nếu sau
  này muốn giữ lịch sử ngay cả khi không còn tham chiếu, cần đổi sang thêm cột status + migration mới.

## Phase 0 — Supabase & môi trường

- [x] Project Supabase tạo (region Singapore), Storage bật, bucket `receipt-photos` (private)
- [x] Supabase CLI cài (`npm install -g supabase`), `supabase link --project-ref <ref>`
- [x] `services/api/.env` ghi xong (DB_URL/USERNAME/PASSWORD, JWT_SECRET, PORT)
- [x] `.env.example` có placeholder `ANTHROPIC_API_KEY` (giá trị thật điền khi bắt tay Phase 3)
- [x] `bootRun` chạy lên, Flyway áp 001+002+003 thành công, `POST /auth/login` trả JWT hợp lệ
  — xác nhận lại 2026-08-06 với Supabase project hiện tại: host trực tiếp (`db.<ref>.supabase.co`) chỉ có
  DNS IPv6, mạng dev không đi IPv6 được nên phải dùng **Session Pooler** (IPv4) thay thế —
  `DB_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  `DB_USERNAME=postgres.<project-ref>` (không phải `postgres` trơn). `./gradlew bootRun` KHÔNG tự đọc
  `.env` — chưa có dotenv loader trong `build.gradle.kts`, phải export biến môi trường vào shell (hoặc IDE
  run config) trước khi chạy, xem Open Question bên dưới.
  Nhân tiện phát hiện + sửa: Hibernate 6 báo lỗi `PathResolutionException` (fail lúc build
  `SessionFactory`) với `@OrderBy("latexType.code")` trên `ProductionRecord.items`/`LatexSale.items` — đã
  xóa annotation khỏi 2 entity, để dành việc sắp xếp cho tầng service/DTO khi cần.
- [ ] User đã đổi mật khẩu admin seed (`changeme123!`) sang mật khẩu thật — endpoint đã có
  (`PATCH /api/v1/users/me/password`, xong 2026-08-06) nhưng **user vẫn cần tự gọi để đổi** — nhắc lại nếu
  chưa làm.

## Phase 1 — Admin config CRUD ✅ (xong 2026-08-06)

Tạo package `service/` (business logic tách khỏi controller, theo layer — CLAUDE.md §6). Mỗi resource:
controller + service + DTO request/response (không expose entity trực tiếp qua API).

- [x] **Teams**: `GET /api/v1/teams`, `GET /api/v1/teams/{id}`, `POST /api/v1/teams`,
  `PATCH /api/v1/teams/{id}` (chỉ `name`/`description`). KHÔNG có DELETE ở v1 (CLAUDE.md §4, được tham
  chiếu bởi employees/production_records/latex_sales).
- [x] **Employees**: CRUD đủ (kể cả đổi `status` active/inactive, đổi `team_id`). List có filter theo
  `team_id`/`status` (`EmployeeRepository.findByTeamIdAndStatus`); trùng `user_id` (UNIQUE ở DB) chặn ở
  service → 409 thay vì lộ `DataIntegrityViolationException`.
- [x] **LatexTypes**: danh mục MỞ (`docs/adr/0002-normalize-latex-type-storage.md`) — CRUD đủ, `code`
  KHÔNG sửa được sau khi tạo (chỉ `label`/`unit`), DELETE có guard: chặn (409) nếu còn tham chiếu ở
  `rate_configs`/`production_record_items`/`latex_sale_items` — xem Open Question đã resolve về hướng này.
- [x] **RateConfigs**: CRUD theo `latex_type_id` + `effective_from`/`effective_to`. Validate chồng lấn ở
  service TRƯỚC khi insert/update → 409 rõ ràng kèm id + khoảng ngày dòng xung đột (xem Open Question đã
  resolve). Không có DELETE (giữ lịch sử đơn giá).
- [x] **AllowanceConfigs**: cùng mô hình CRUD + cùng ràng buộc chống chồng lấn effective_from/to như
  RateConfigs (theo `code`, không phải id — nhiều dòng cùng code theo thời gian là hợp lệ). Lưu ý
  "lighting" (tiền đèn) không gắn `attendance_records` theo ngày (CLAUDE.md §4) — chỉ là khai báo cấu
  hình, chưa tính lương ở Module 1. Không có DELETE.
- [x] Endpoint đổi mật khẩu admin (`PATCH /api/v1/users/me/password`) — làm ở phase này, xem Phase 0.

Smoke-test 2026-08-06 (curl thủ công trên Supabase dev thật, chưa phải automated test — xem Phase 5):
mỗi resource đã test happy path + validation error (400) + not-found (404) + conflict (409) tương ứng;
riêng RateConfigs/AllowanceConfigs đã test cả overlap chặn đúng lẫn range liền kề (`effective_to` =
`effective_from` dòng sau) KHÔNG bị coi là chồng lấn (nửa mở `[from, to)` đúng ngữ nghĩa `daterange`).

## Phase 2 — Nhập liệu batch (ADR-0007: best-effort theo từng dòng)

- [ ] DTO chung `BatchResult<T>` (per-row success/error, không rollback toàn batch khi 1 dòng lỗi — đúng
  tinh thần ADR-0007).
- [ ] `POST /api/v1/production-records/batch` — nhiều dòng/nhân viên/ngày cùng lúc, denormalize
  `team_id` từ `employee.team_id` tại thời điểm ghi (CLAUDE.md §4). Validate 1 record ACTIVE/employee/ngày
  (partial unique index) → trả lỗi rõ theo dòng nếu trùng.
- [ ] `POST /api/v1/latex-sales/batch` — theo Tổ, không có `employee_id`.
- [ ] `POST /api/v1/attendance-records/batch` — có `status` (draft|confirmed|cancelled, mặc định
  confirmed cho nhập tay — CLAUDE.md §4, khác PATCH ghi đè trực tiếp như thiết kế cũ).
- [ ] `EditHistoryService` dùng chung cho cả 3 resource header (production_records, latex_sales,
  attendance_records nếu áp dụng): ghi polymorphic (`table_name`+`record_id`), snapshot AGGREGATE toàn bộ
  record + items vào `old_data`/`new_data` JSONB. **Chỉ ghi từ lần sửa đầu tiên SAU KHI record đã
  `confirmed`** — không ghi trong lúc còn `draft` (rà soát/sửa trước khi confirm là quy trình bình thường,
  quyết định đã chốt). Không ghi sự kiện tạo mới, chỉ ghi sự kiện sửa.
- [ ] "Xóa" luôn là chuyển `status` → `cancelled`, không hard delete (CLAUDE.md §4).
- [ ] PATCH cho từng resource (sửa sau khi tạo) — dùng chung `EditHistoryService` ở trên.

## Phase 3 — Tích hợp OCR (CLAUDE.md §5, ADR-0005, ADR-0006)

- [ ] Thêm dependency HTTP client gọi Claude API (vision) — chưa có trong `build.gradle.kts`, chọn
  `RestClient`/`WebClient` (Spring có sẵn) thay vì kéo thêm SDK ngoài nếu không cần thiết.
- [ ] Signed upload URL từ Supabase Storage (bucket `receipt-photos`, private) — endpoint backend generate
  URL cho app upload trực tiếp, không proxy binary qua Spring Boot.
- [ ] `ClaudeOcrService` — gọi Claude API **đồng bộ** (ADR-0005), yêu cầu model xác nhận ảnh có khớp
  `target_type` (`production_record`/`latex_sale`) Admin đã chọn trước không, trả JSON có cấu trúc.
- [ ] `POST /api/v1/ocr/capture` (hoặc tương đương) — nhận `photo_url` + `target_type` đã chọn:
  - Ghi 1 dòng `ocr_call_logs` **bất kể thành công hay lỗi** (`success`, `type_mismatch`, `duration_ms`,
    `input_tokens`/`output_tokens`/`estimated_cost_usd`, `error_message` khi lỗi).
  - Nếu `type_mismatch = true`: KHÔNG tạo draft, trả lỗi rõ cho Admin biết ảnh bị loại.
  - Nếu khớp: ghi NGAY (các) draft row (`status = draft`) kèm `photo_url` + `ocr_call_log_id` — có thể
    nhiều dòng nếu 1 ảnh có nhiều nhân viên. Fuzzy-match tên đọc được với `employees`, trả kèm
    `unmatchedLines` cho dòng không khớp để Admin chọn thủ công (CLAUDE.md §9 — luôn cho chọn thủ công khi
    không khớp chính xác).
  - Field OCR không chắc chắn → ghi vào `low_confidence_fields` JSONB của draft row (đã có ở entity từ
    Phase 0 của phiên trước).
- [ ] Endpoint confirm draft (PATCH đổi `status` → `confirmed`, KHÔNG tự động — ADR-0006) và cancel draft.
- [ ] Log `WARN` khi OCR trả field không chắc chắn hoặc fuzzy-match không khớp (CLAUDE.md §7).

## Phase 4 — Đọc/lọc/báo cáo

- [ ] List + filter cho `production_records`, `latex_sales`, `attendance_records` (theo `team_id`,
  `employee_id`, khoảng `record_date`, `status` — kể cả `draft` chưa confirm, theo UX tab "Tra cứu" ở
  CLAUDE.md §5).
- [ ] `ocr_call_logs` — read + thống kê (tỷ lệ thành công, tổng chi phí ước tính, thời gian phản hồi trung
  bình) phục vụ theo dõi chi phí OCR.
- [ ] `edit_history` — read theo `table_name`+`record_id`, trả snapshot AGGREGATE.
- [ ] Report JSON tổng hợp theo ngày/tháng/tổ/nhân viên.
- [ ] Export Excel (thêm dependency Apache POI) — sinh ở backend, đảm bảo nhất quán web/app.
- [ ] Export PDF (thêm dependency iText/OpenPDF).

## Phase 5 — Test & tài liệu

- [ ] Thêm dependency `springdoc-openapi` — tự sinh Swagger UI, chặn ở profile non-prod (xem Open
  Question về prod).
- [ ] `docs/api.md` viết tay — phần luồng nghiệp vụ mà OpenAPI không diễn tả tốt: OCR end-to-end
  (capture → draft → confirm), batch contract (`BatchResult<T>` best-effort per-row), auth (JWT 1 ngày,
  không refresh token).
- [ ] Unit test (Mockito) theo từng service — ưu tiên logic nghiệp vụ phức tạp (fuzzy-match, EditHistory
  chỉ ghi sau confirmed, batch best-effort, EXCLUDE constraint handling).
- [ ] Integration test chạy thẳng lên Supabase dev thật, `@Transactional` rollback mỗi test (đã xác nhận
  với user — không Docker/Testcontainers ở v1).

## Deferred / ngoài phạm vi Module 1

- Team-lead tự đăng nhập + tự nhập liệu (release sau — `docs/adr/0001-admin-only-v1-scope.md`)
- Tính lương tự động (Module 3) — Module 1 chỉ khai báo cấu hình (`rate_configs`, `allowance_configs`)
- Offline queue khi mất mạng thực địa (CLAUDE.md §9 — rủi ro chấp nhận ở v1, cân nhắc nếu xảy ra thường
  xuyên trong thực tế)
- Hồ sơ nhân sự đầy đủ (Module 2)
