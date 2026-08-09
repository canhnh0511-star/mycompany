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

**Phase 2 xong (2026-08-06)**: batch nhập tay best-effort theo từng dòng (ADR-0007) cho
ProductionRecords/LatexSales/AttendanceRecords, PATCH sửa aggregate (record + items), cancel (status →
cancelled, không hard delete), `EditHistoryService` dùng chung ghi snapshot AGGREGATE khi sửa record đã
CONFIRMED. Đã smoke-test bằng curl trên Supabase dev thật — xem chi tiết ở mục Phase 2 bên dưới.

**Phase 3 xong về mặt code (2026-08-06)**: tích hợp Claude Vision OCR (signed upload URL, gọi Claude qua
`RestClient`, ghi `ocr_call_logs`, tạo draft + fuzzy-match + confirm). **CHƯA verify được luồng thành công
thật** — `ANTHROPIC_API_KEY` còn rỗng trong `.env` (xem Open Question Phase 3 cũ, giờ vẫn treo phần key).
Đã smoke-test được: signed upload URL thật (upload ảnh test lên Supabase Storage thành công), lỗi kỹ thuật
khi gọi Claude API (401 do thiếu key — xác nhận `ocr_call_logs` ghi đúng `success=false` + error message),
validate `teamId` bắt buộc cho `LATEX_SALE`, lỗi tải ảnh không tồn tại (400 rõ ràng), `confirm` (409 khi
record không phải draft, 404 khi không tồn tại). **Chưa test được**: happy-path thật (Claude đọc ảnh →
tạo draft → confirm), `type_mismatch`, fuzzy-match nhân viên, `unmatchedLines` — cần `ANTHROPIC_API_KEY`
thật để test tiếp.

**Phase 4 xong (2026-08-07)**: list+filter (production_records/latex_sales/attendance_records), đọc
`ocr_call_logs` (list + `/stats`), đọc `edit_history`, report JSON tổng hợp (sản lượng cá nhân + bán mủ
theo Tổ, chỉ tính CONFIRMED), export Excel (Apache POI) + PDF (OpenPDF, nhúng font Unicode cho tiếng Việt)
cho cả 2 report. Đã smoke-test bằng curl + mở file export thật trên Supabase dev — xem chi tiết ở mục
Phase 4 bên dưới (có 1 gotcha đáng chú ý về pgjdbc + tham số timestamp null trong JPQL).

Chưa có: springdoc-openapi, `docs/api.md`, test (unit lẫn integration).

`build.gradle.kts` hiện chưa có dependency cho: springdoc-openapi — cần thêm khi bắt tay Phase 5. Phase 3
OCR dùng thẳng `RestClient` có sẵn từ spring-boot-starter-web để gọi Claude API + Supabase Storage REST —
quyết định giữ dependency tối thiểu, không kéo thêm Anthropic Java SDK hay supabase-java. Phase 4 đã thêm
`org.apache.poi:poi-ooxml` + `com.github.librepdf:openpdf` cho export báo cáo (xem mục Phase 4).

**Lưu ý cho Phase 2+ (phát hiện lúc làm Phase 1, 2026-08-06):** entity nào có `@CreationTimestamp`
(`createdAt`) và id sinh client-side (`GenerationType.UUID`, tất cả entity trong repo đều vậy) — nếu
service `create()` gọi `repository.save(entity)` rồi map sang response NGAY trong cùng transaction,
`createdAt` sẽ là `null` trong response (Hibernate trì hoãn INSERT tới lúc flush/commit, mặc định AUTO
flush mode không flush ngay sau `save()`). Phải dùng `repository.saveAndFlush(entity)` ở nhánh create khi
cần đọc lại field do Hibernate tự sinh ngay lập tức — xem `TeamService`/`EmployeeService`/`RateConfigService`
làm mẫu. `ProductionRecord`, `LatexSale` cũng có `createdAt` — nhớ áp dụng khi làm Phase 2.

**Lưu ý cho Phase 3+ (phát hiện lúc làm Phase 2, 2026-08-06):** thay HOÀN TOÀN 1 `@OneToMany` collection
có `orphanRemoval = true` bằng cách gọi `collection.clear()` rồi add lại item mới trong CÙNG 1 lần flush
— nếu item mới trùng khóa UNIQUE composite với 1 item cũ vừa bị clear (vd cùng `latex_type_id` trong
`production_record_items`/`latex_sale_items`), Hibernate có thể INSERT dòng mới TRƯỚC KHI DELETE dòng cũ
trong cùng transaction, vi phạm tạm thời UNIQUE dù kết quả cuối cùng không trùng lặp gì thật (lỗi
`DataIntegrityViolationException` → 409 khó hiểu). Phải `repository.saveAndFlush(entity)` NGAY sau
`clear()` để ép Hibernate DELETE trước, rồi mới add item mới — xem
`ProductionRecordService`/`LatexSaleService`.`replaceItems()` làm mẫu. Áp dụng cho bất kỳ aggregate nào
khác sau này có pattern "sửa = thay thế toàn bộ children" + UNIQUE composite trên bảng con.

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
- [x] ~~Có nên thêm dotenv loader...~~ — RESOLVED 2026-08-06: thêm
  `me.paulschwarz:springboot3-dotenv:5.0.1` vào `build.gradle.kts` — `services/api/.env` giờ tự nạp vào
  Spring Environment lúc khởi động (`./gradlew bootRun` lẫn IDE run config), không cần export biến môi
  trường thủ công nữa. Đã verify: `bootRun` connect DB thành công bằng `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`
  từ `.env` mà không export gì trong shell.
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
  `DB_USERNAME=postgres.<project-ref>` (không phải `postgres` trơn). ~~`./gradlew bootRun` KHÔNG tự đọc
  `.env`~~ — RESOLVED 2026-08-06, xem Open Question bên dưới: đã thêm dotenv loader, giờ tự đọc
  `services/api/.env` khi khởi động, không cần export biến môi trường thủ công nữa.
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

## Phase 2 — Nhập liệu batch (ADR-0007: best-effort theo từng dòng) ✅ (xong 2026-08-06)

- [x] DTO chung `BatchResult<T>` (`dto/BatchResult.java`, nested `BatchItemResult<T>` với
  `index`/`success`/`data`/`error`) — per-row success/error, không rollback toàn batch khi 1 dòng lỗi
  (ADR-0007). Mỗi dòng chạy trong transaction RIÊNG (`RequiresNewTransactionRunner`, PROPAGATION_REQUIRES_NEW)
  nên 1 dòng lỗi không kéo rollback các dòng khác đã lưu thành công trong cùng request. Validate thủ công
  từng dòng bằng `BatchRowValidator` (Jakarta `Validator` gọi trực tiếp trong service) thay vì `@Valid` ở
  controller — `@Valid` trên cả List sẽ chặn TOÀN BỘ request ngay từ binding khi có 1 dòng lỗi.
- [x] `POST /api/v1/production-records/batch` (`ProductionRecordController`/`Service`) — nhiều
  dòng/nhân viên/ngày cùng lúc, denormalize `team_id` từ `employee.team_id` tại thời điểm ghi (CLAUDE.md
  §4). Validate 1 record ACTIVE/employee/ngày (partial unique index, check tay qua
  `existsByEmployeeIdAndRecordDateAndStatusNot` vì JPA không thể hiện được partial unique index) → 409 rõ
  theo dòng nếu trùng. Nhập tay ghi thẳng `source=manual`, `status=confirmed` — KHÔNG qua draft (draft chỉ
  dành cho luồng OCR, ADR-0006/Phase 3).
- [x] `POST /api/v1/latex-sales/batch` (`LatexSaleController`/`Service`) — theo Tổ, không có
  `employee_id`. Không có ràng buộc unique theo (team, ngày) ở DB nên không check trùng.
- [x] `POST /api/v1/attendance-records/batch` (`AttendanceRecordController`/`Service`) — ghi thẳng
  `status=confirmed` cho nhập tay (CLAUDE.md §4, khác PATCH ghi đè trực tiếp như thiết kế cũ). Không có
  ràng buộc unique ở DB.
- [x] `EditHistoryService` dùng chung cho cả 3 resource header — ghi polymorphic (`table_name`+
  `record_id`), snapshot AGGREGATE toàn bộ record + items (chính *Response DTO, Jackson serialize) vào
  `old_data`/`new_data` JSONB. Guard `shouldLog = status trước khi sửa != DRAFT` ở từng service TRƯỚC khi
  gọi — Phase 2 luôn CONFIRMED ngay lúc tạo nên guard này luôn true cho PATCH/cancel ở Phase 2, chỉ thực
  sự có ý nghĩa từ Phase 3 khi có record ở trạng thái `draft`. Không ghi sự kiện tạo mới, chỉ ghi sự kiện sửa.
- [x] "Xóa" = `POST .../{id}/cancel` chuyển `status` → `cancelled`, không hard delete (CLAUDE.md §4);
  chặn cancel 2 lần (409); cancel giải phóng lại slot (record_date, employee_id) cho
  production_records — đã test nhập lại đúng ngày sau khi cancel thành công.
- [x] PATCH cho từng resource (`GET`/`PATCH /{id}`) — sửa AGGREGATE toàn bộ (record + items thay thế
  HOÀN TOÀN, không patch từng item), dùng chung `EditHistoryService` ở trên. **Gotcha phát hiện khi test**:
  thay thế `@OneToMany` collection (`clear()` rồi add lại) trong 1 lần flush có thể vi phạm tạm thời UNIQUE
  composite trên bảng con nếu item mới trùng khóa với item cũ vừa xóa (Hibernate insert trước khi delete)
  — phải `saveAndFlush()` ngay sau `clear()` trước khi add lại, xem note ở mục "Lưu ý cho Phase 3+" phía trên.

Smoke-test 2026-08-06 (curl thủ công trên Supabase dev thật, chưa phải automated test — xem Phase 5): cả
3 resource đã test batch happy-path + best-effort (1 dòng lỗi không ảnh hưởng dòng khác, đủ cả 3 loại lỗi
409/404/400 trong cùng 1 request) + PATCH (kể cả case trùng latex_type_id sau khi sửa — gotcha ở trên) +
cancel + chặn cancel 2 lần (409) + nhập lại sau khi cancel (production_records).

## Phase 3 — Tích hợp OCR (CLAUDE.md §5, ADR-0005, ADR-0006) ✅ code xong (2026-08-06), chờ verify happy-path

- [x] Gọi Claude API (vision) bằng `RestClient` (Spring có sẵn, `ClaudeOcrService`) — không kéo thêm
  Anthropic Java SDK, giữ dependency tối thiểu (CLAUDE.md §1/§9). Model mặc định `claude-opus-5`, đổi qua
  `ANTHROPIC_MODEL` nếu muốn model rẻ hơn cho tác vụ trích xuất (không hardcode logic theo model cụ thể).
  Adaptive thinking bật tường minh (`thinking: {type: adaptive}`) — né 2 lỗi đã biết khi tắt thinking trên
  Claude Opus 5 (tool call lọt ra text thường / thinking tag rò vào response).
- [x] Signed upload URL từ Supabase Storage (`SupabaseStorageService`, bucket `receipt-photos`) —
  `POST /api/v1/ocr/upload-url` trả `photoPath`/`uploadUrl`/`token`, app PUT trực tiếp lên Supabase (không
  proxy binary qua Spring Boot). Object path tự sinh (`ocr/{date}/{uuid}.ext`) — KHÔNG dùng fileName client
  gửi lên để tránh path traversal. Backend tự tải lại bằng service role key khi cần gửi Claude.
  **Gotcha khi test**: `@ConfigurationProperties` record field `bucket` nhưng lúc đầu viết nhầm property
  yml là `storage-bucket` → bind null → lỗi Supabase "The related resource does not exist" (dễ nhầm là lỗi
  cấu hình bucket/quyền, thực ra là lỗi đặt tên property không khớp field). Đã sửa. **Gotcha 2**: Supabase
  Storage trả **400** (không phải 404) khi GET 1 object không tồn tại — `SupabaseStorageService.download()`
  bắt `RestClientException` chung và convert sang `InvalidRequestException` (400) thay vì để lộ 500.
- [x] `POST /api/v1/ocr/capture` (`OcrCaptureService`) — nhận `targetType` + `photoPath` (+ `teamId`, bắt
  buộc khi `LATEX_SALE`, chỉ là gợi ý thu hẹp fuzzy-match khi `PRODUCTION_RECORD`):
  - Ghi 1 dòng `ocr_call_logs` **bất kể thành công hay lỗi** — đã smoke-test case lỗi kỹ thuật (401 do
    `ANTHROPIC_API_KEY` rỗng) ghi đúng `success=false` + `error_message`.
  - `type_mismatch = true` → KHÔNG tạo draft, trả `mismatchReason` cho Admin — **chưa test được** (cần
    Claude đọc ảnh thật).
  - Khớp: tạo NGAY (các) draft row (`status=draft`, `source=ocr_import`) kèm `photoUrl`/`ocrCallLogId`.
    Fuzzy-match (`EmployeeFuzzyMatcher`, Levenshtein trên tên đã bỏ dấu/hạ chữ thường, ngưỡng 0.75) — dòng
    không khớp trả nguyên qua `unmatchedLines` (KHÔNG tạo draft thiếu employee_id) để Admin xử lý qua Nhập
    tay nhanh/batch endpoint sẵn có (Phase 2) — **chưa test được** (cần Claude đọc ảnh thật).
  - `low_confidence_fields` ghi dạng đơn giản hoá `{"fields": [...]}` (khác ví dụ minh họa chi tiết hơn ở
    CLAUDE.md §4 vì tool schema OCR chỉ trả tên trường ở mức DÒNG, không map tới từng item) — vẫn phục vụ
    đúng mục đích: frontend đọc thẳng từ draft row để highlight.
  - `record_date` OCR không đọc được → 400 rõ ràng ngay từ đầu (không cố tạo draft thiếu ngày).
- [x] `POST /api/v1/production-records/{id}/confirm` và `/api/v1/latex-sales/{id}/confirm` — draft →
  confirmed, KHÔNG tự động (ADR-0006), KHÔNG ghi `edit_history` (đây là bước hoàn tất review, không phải
  "sửa"). Đã test: 409 khi record không phải draft, 404 khi không tồn tại.
- [x] Log `WARN` khi OCR lỗi kỹ thuật / `type_mismatch` / fuzzy-match không khớp (CLAUDE.md §7).

**Chưa verify được** (cần `ANTHROPIC_API_KEY` thật — hiện `.env` để trống): happy-path đọc ảnh thật → tạo
draft đúng dữ liệu, `type_mismatch` thật, fuzzy-match thật, `estimated_cost_usd` tính đúng theo response
usage thật. User cần tự điền `ANTHROPIC_API_KEY` vào `services/api/.env` rồi test lại `POST /ocr/capture`
với ảnh phiếu thật.

## Phase 4 — Đọc/lọc/báo cáo ✅ (xong 2026-08-07)

- [x] List + filter cho `production_records`, `latex_sales`, `attendance_records` (theo `team_id`,
  `employee_id`, khoảng `record_date`, `status` — kể cả `draft` chưa confirm, theo UX tab "Tra cứu" ở
  CLAUDE.md §5; `attendance_records` lọc thêm `attendance_type`). `JpaSpecificationExecutor` +
  `XxxSpecifications` (package `service`, static factory bỏ qua filter null) + `Pageable`
  (`@PageableDefault size=50 sort=recordDate DESC`) — trả thẳng `Page<XxxResponse>`. `AttendanceRecord`
  không có cột `team_id` riêng nên filter teamId phải join qua `employee.team.id`.
- [x] `ocr_call_logs` — `OcrCallLogController` (`GET` list có filter `targetType`/`success`/khoảng
  `calledAt`, `GET /stats` — tổng số lần gọi, tỷ lệ thành công, tỷ lệ type_mismatch, tổng chi phí ước
  tính, thời gian phản hồi trung bình).
- [x] `edit_history` — `EditHistoryController` (`GET ?tableName=&recordId=`, validate `tableName` thuộc 3
  bảng header hợp lệ), thêm method `list()` vào `EditHistoryService` đã có (không tạo service mới).
- [x] Report JSON tổng hợp — 2 endpoint riêng (`ReportController`, `/api/v1/reports`): sản lượng cá nhân
  (group theo nhân viên, có subtotal theo Tổ) và bán mủ theo Tổ (group theo Tổ) — CHỈ tính bản ghi
  `CONFIRMED` (dữ liệu draft/cancelled không lọt vào báo cáo/bảng lương). Cột theo toàn bộ danh mục
  `LatexType` (ổn định kể cả loại mủ không phát sinh trong kỳ).
- [x] Export Excel (`org.apache.poi:poi-ooxml:5.5.1`) — `ExcelReportExportService`, tái dùng DTO report
  đã tính sẵn (không query lại DB), dòng subtotal/grand total in đậm.
- [x] Export PDF (`com.github.librepdf:openpdf:3.0.5`, package `org.openpdf.text.*` — bản 3.x đổi từ
  `com.lowagie.text.*` cũ) — `PdfReportExportService`, **nhúng font Unicode**
  `src/main/resources/fonts/NotoSans-Regular.ttf` (SIL OFL, tải từ
  `github.com/openmaptiles/fonts`) qua `BaseFont.createFont(name, IDENTITY_H, EMBEDDED, cached, ttfBytes,
  null)` — nạp bytes trực tiếp từ classpath, KHÔNG dùng overload nhận path string (không hoạt động khi
  app đóng gói trong jar). Font mặc định (Helvetica) không có dấu tiếng Việt — đã verify bằng cách unzip
  file export thật + kiểm tra `/FontFile2`, `BaseFont/...+NotoSans/Encoding/Identity-H` xuất hiện đúng
  trong PDF, và `sharedStrings.xml` trong `.xlsx` chứa đúng chữ có dấu.

**Gotcha phát hiện khi làm Phase 4 (2026-08-07):** pattern JPQL `(:param IS NULL OR cot >= :param)` để
filter optional — dùng an toàn với tham số UUID (`ProductionRecordItemRepository`/
`LatexSaleItemRepository.aggregateForReport`, filter `teamId`/`employeeId`) nhưng **lỗi với tham số
`Instant`/timestamp**: pgjdbc không suy được kiểu cho `$1` khi nó chỉ xuất hiện độc lập trong `? IS NULL`
(`could not determine data type of parameter $1`, SQLState 42P18) — gặp ở `OcrCallLogRepository
.aggregateStats` (filter `from`/`to`). Sửa bằng cách thay `null` bằng sentinel (`Instant.EPOCH` /
`9999-12-31`) ở service TRƯỚC khi truyền vào query, đổi JPQL sang `BETWEEN` không điều kiện — né hẳn
pattern này cho cột timestamp thay vì cố ép kiểu tham số. Áp dụng nếu sau này thêm aggregate query khác
lọc theo khoảng thời gian optional. Lưu ý riêng: `Specification`/Criteria API (dùng cho các endpoint list
ở trên) KHÔNG bị lỗi này — Criteria chỉ thêm predicate khi filter khác null, không bao giờ sinh ra `? IS
NULL` cho tham số null.

Đã thêm `MissingServletRequestParameterException` handler vào `GlobalExceptionHandler` (400, trước đó rơi
vào nhánh 500 chung) — Phase 4 là lần đầu dùng `@RequestParam` bắt buộc không có default
(`fromDate`/`toDate` ở report, `tableName`/`recordId` ở edit-history).

Smoke-test 2026-08-07 (curl thủ công trên Supabase dev thật, chưa phải automated test — xem Phase 5): list
+ filter cả 3 resource (không filter thấy hết kể cả draft/cancelled; filter status/date range/enum sai →
400 đúng); 2 report JSON (số khớp tay, đúng chỉ tính CONFIRMED — latex_sales report trả rỗng vì dữ liệu
test hiện tại chỉ có draft/cancelled); export cả 4 file (`.xlsx`×2, `.pdf`×2) — mở thật, số khớp JSON,
tiếng Việt hiển thị đúng; `ocr_call_logs` list + `/stats` (khớp tay 3 log có sẵn từ Phase 3: 2 success + 1
lỗi 401, tổng cost/avg duration đúng); `edit_history` (đúng snapshot before/after 1 record đã PATCH từ
Phase 2, validate `tableName` sai → 400, thiếu `recordId` → 400 đúng nhờ handler mới).

## Phase 5 — Test & tài liệu

- [x] Thêm dependency `springdoc-openapi` (2026-08-07) — `org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0`.
  `OpenApiConfig` khai báo Bearer JWT security scheme (nút "Authorize" trên Swagger UI, dán
  `accessToken` từ `POST /auth/login`, không cần gõ tiền tố `Bearer `) + metadata. `SecurityConfig`
  permitAll `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**` (vô hại vì bị tắt hẳn ở prod, xem
  dưới). **RESOLVED Open Question về profile prod**: mặc định BẬT (dev/local/staging chưa đặt
  profile), tạo `application-prod.yml` set `springdoc.api-docs.enabled=false` +
  `springdoc.swagger-ui.enabled=false` — kích hoạt bằng `SPRING_PROFILES_ACTIVE=prod` lúc deploy thật
  (chưa chốt nền tảng host nên chưa set ở đâu cả, cần nhớ set biến này khi deploy). Đã verify thật:
  `bootRun` không profile → `GET /v3/api-docs` 200 (JSON spec đủ toàn bộ path), `/swagger-ui.html`
  redirect 302 → `/swagger-ui/index.html` 200; `SPRING_PROFILES_ACTIVE=prod` → cả 2 endpoint biến mất
  hoàn toàn (route không còn tồn tại).
  **Gotcha phát hiện lúc verify (không phải do thay đổi lần này, có sẵn từ trước)**: khi 1 path không
  khớp route nào (vd springdoc bị tắt, hoặc `/actuator/health` — dependency `spring-boot-starter-
  actuator` thực ra CHƯA có trong `build.gradle.kts` dù `SecurityConfig` đã permitAll path này),
  Spring ném `NoResourceFoundException` (404 đúng ra) nhưng `GlobalExceptionHandler`'s catch-all
  `Exception` handler bắt luôn thành **500** thay vì 404 — sai lệch status code, chưa sửa (ngoài phạm
  vi việc thêm springdoc, ghi lại để xử lý sau; có thể cần thêm handler riêng cho
  `NoResourceFoundException` → 404 nếu muốn đúng semantics, hoặc thêm actuator dependency thật nếu vẫn
  muốn dùng `/actuator/health`).
  **FIXED (2026-08-07)**: đã xử lý cả 2 vế của gotcha trên trong cùng 1 lần. (1) Thêm
  `@ExceptionHandler(NoResourceFoundException.class)` riêng trong `GlobalExceptionHandler` trả về 404
  `ProblemDetail` (cùng style/title "Không tìm thấy dữ liệu" như bảng lỗi ở `docs/api.md` §6), đặt trước
  catch-all `Exception.class` nên không còn bị nuốt thành 500. (2) Thêm
  `implementation("org.springframework.boot:spring-boot-starter-actuator")` vào `build.gradle.kts` để
  `/actuator/health` (đã permitAll từ trước ở `SecurityConfig`) thực sự tồn tại thay vì trả lỗi sai
  status. Verify thật bằng `./gradlew build -x test` (BUILD SUCCESSFUL) + `bootRun` thủ công: `GET
  /actuator/health` → 200 `{"status":"UP"}`; `GET /swagger-ui/does-not-exist.js` (path permitAll nhưng
  không khớp resource nào, dùng để né việc security filter trả 403 trước khi tới controller cho các path
  không permitAll) → 404 đúng `ProblemDetail` mới thay vì 500 như trước.
- [x] `docs/api.md` viết tay (2026-08-07) — phần luồng nghiệp vụ mà OpenAPI không diễn tả tốt: OCR
  end-to-end (upload-url → capture → draft → confirm, cả 3 nhánh success/typeMismatch/unmatchedLines),
  batch contract (`BatchResult<T>` best-effort per-row, luôn HTTP 200), auth (JWT 1 ngày, không refresh
  token, 401 mặc định của Spring Security cho token thiếu/sai KHÔNG đảm bảo đúng format `ProblemDetail`
  như các lỗi khác), vòng đời status (draft/confirmed/cancelled, không hard delete, `edit_history` chỉ
  ghi khi sửa record đã CONFIRMED), bảng quy ước lỗi (`ProblemDetail` theo từng exception type), bảng
  tham chiếu nhanh toàn bộ endpoint. Viết tay dựa trên đọc trực tiếp source (controller/dto/
  GlobalExceptionHandler/SecurityConfig), chưa cross-check với Swagger UI vì springdoc-openapi chưa
  thêm (mục kế tiếp).
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
