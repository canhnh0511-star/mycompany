# API — Module 1: Chi phí / Sản lượng

> Tài liệu tay, bổ sung cho Swagger UI (`/swagger-ui.html`, tự sinh từ code qua springdoc-openapi, chỉ
> bật ở dev/local — xem `docs/TASKS.md` Phase 5). Swagger UI đủ để tra cứu request/response schema từng
> endpoint; file này chỉ giải thích các **luồng nghiệp vụ** mà OpenAPI không diễn tả tốt (thứ tự bước,
> lý do thiết kế, ràng buộc ngầm giữa nhiều request). Đọc `CLAUDE.md` trước để hiểu bối cảnh nghiệp vụ.

---

## 1. Auth

- `POST /api/v1/auth/login` — `{ "email", "password" }` → `{ "token", "userId", "fullName", "role" }`.
  Không có endpoint đăng ký công khai; tài khoản Admin seed sẵn qua Flyway migration
  (`docs/adr/0004-auth-simplified-for-v1.md`).
- Token trả về là **access token duy nhất**, hết hạn sau `app.jwt.expiration-ms` (mặc định 1 ngày —
  `JWT_EXPIRATION_MS`). **Không có refresh token** — hết hạn thì đăng nhập lại, không có luồng "làm mới
  token ngầm". Client phải tự xử lý 401 bằng cách điều hướng về màn đăng nhập.
- Gửi kèm mọi request (trừ `/auth/login`, `/actuator/health`) bằng header
  `Authorization: Bearer <token>`. Thiếu/token hết hạn/token sai chữ ký → 401.
- `GET/PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/password` — tự đổi thông tin/mật khẩu của chính
  mình (không có endpoint quản lý user khác ở v1 — chỉ 1 Admin, xem CLAUDE.md §2).

## 2. Batch nhập tay — hợp đồng `BatchResult<T>` (ADR-0007)

Áp dụng cho `POST /api/v1/production-records/batch`, `POST /api/v1/latex-sales/batch`,
`POST /api/v1/attendance-records/batch`. Body là **mảng** các dòng cùng loại (không phải object có field
`items`).

**Nguyên tắc: best-effort theo từng dòng — không rollback toàn batch khi 1 dòng lỗi.** Mỗi dòng chạy
trong transaction JPA riêng (`REQUIRES_NEW`); response luôn là **200 OK** (không phải 207 hay 4xx ở mức
request) ngay cả khi có dòng lỗi — client PHẢI đọc từng phần tử để biết dòng nào thành công:

```jsonc
{
  "results": [
    { "index": 0, "success": true,  "data": { /* Response DTO đầy đủ, kể cả id vừa tạo */ }, "error": null },
    { "index": 1, "success": false, "data": null, "error": "Nhân viên id=... đã có bản ghi sản lượng active ngày ..." },
    { "index": 2, "success": true,  "data": { ... }, "error": null }
  ]
}
```

- `index` khớp đúng vị trí trong mảng request gửi lên — dùng để highlight đúng dòng lỗi trên UI (form
  nhập tay nhiều dòng, CLAUDE.md §5).
- `error` là message tiếng Việt đọc được trực tiếp (409 trùng dữ liệu, 404 không tìm thấy tham chiếu,
  400 dữ liệu sai) — không phải stack trace, an toàn hiển thị thẳng cho người dùng.
- Không có "tất cả thành công thì mới lưu" — nếu cần vậy, tự kiểm tra `results[].success` phía client
  trước khi coi batch là "xong", nhưng dữ liệu các dòng `success=true` **đã lưu thật vào DB**, không thể
  "hủy cả batch" bằng cách bỏ qua response.
- Validate từng dòng thủ công bằng Jakarta `Validator` trong service (không dùng `@Valid` trên `List` ở
  controller — sẽ chặn toàn bộ request ngay từ binding khi có 1 dòng sai định dạng, phá vỡ tinh thần
  best-effort).

Nhập tay ghi thẳng `source=manual`, `status=confirmed` — **không qua draft**. Draft chỉ dành cho luồng
OCR (mục 3 bên dưới).

"Xóa" 1 dòng đã lưu = `POST /api/v1/{resource}/{id}/cancel` (chuyển `status → cancelled`), không có
DELETE thật (CLAUDE.md §4). Sửa 1 dòng đã lưu = `PATCH /api/v1/{resource}/{id}` — thay thế **toàn bộ**
aggregate (record + items), không patch từng field/item riêng lẻ.

## 3. Luồng OCR end-to-end (CLAUDE.md §5, ADR-0005, ADR-0006)

Áp dụng cho cả 2 loại phiếu: sổ ghi mủ (→ `production_records`) và sổ bán mủ (→ `latex_sales`), chọn qua
`targetType` (`PRODUCTION_RECORD` | `LATEX_SALE`).

```
Bước 1 — POST /api/v1/ocr/upload-url
  body: { "contentType": "image/jpeg" }   // chỉ image/jpeg | image/png (SUPABASE_ALLOWED_CONTENT_TYPES)
  → { "photoPath", "uploadUrl", "token" }
  photoPath do BACKEND tự sinh (ocr/{date}/{uuid}.ext) — client KHÔNG được tự đặt tên file (chặn path
  traversal). Object path này dùng lại y nguyên ở bước 3.

Bước 2 — client PUT trực tiếp ảnh lên uploadUrl (KHÔNG qua backend, backend không proxy binary)

Bước 3 — POST /api/v1/ocr/capture
  body: { "targetType", "photoPath", "teamId"? }
  // teamId BẮT BUỘC khi targetType=LATEX_SALE (latex_sales.team_id NOT NULL); là GỢI Ý (thu hẹp danh
  // sách fuzzy-match) khi targetType=PRODUCTION_RECORD, không bắt buộc.
```

`POST /ocr/capture` là request **đồng bộ** — chờ tới khi Claude Vision trả kết quả xong (ADR-0005, không
có polling/webhook). Ứng dụng mobile phải hiện loading rõ ràng và xử lý timeout/mất mạng tại chỗ (rủi ro
đã ghi nhận ở CLAUDE.md §9, chấp nhận ở v1).

**Mọi lần gọi `/ocr/capture` đều ghi 1 dòng `ocr_call_logs`**, kể cả khi lỗi kỹ thuật (network, 401 từ
Claude, timeout...) — dùng để theo dõi chi phí/tỷ lệ thành công (`GET /api/v1/ocr-call-logs`,
`GET /api/v1/ocr-call-logs/stats`). Response `/ocr/capture` phân theo 3 nhánh:

| Trường hợp | `success` | `typeMismatch` | Draft có được tạo? |
|---|---|---|---|
| Lỗi kỹ thuật gọi Claude (network/401/timeout) | `false` | — | Không |
| Ảnh không khớp `targetType` đã chọn | `true` | `true` | **Không** — trả `mismatchReason`, Admin phải chụp/chọn lại đúng loại |
| Đọc được, khớp loại phiếu | `true` | `false` | **Có, NGAY LẬP TỨC**, `status=draft` |

Khi khớp và tạo draft:
- **`production_records`**: OCR có thể trả nhiều dòng/nhân viên trong 1 ảnh (1 ảnh = 1 trang sổ, nhiều
  người). Mỗi dòng fuzzy-match tên đọc được (`EmployeeFuzzyMatcher`, Levenshtein trên tên đã bỏ dấu/hạ
  chữ thường, ngưỡng 0.75) với danh sách `employees` (thu hẹp theo `teamId` nếu có gửi lên). Dòng khớp →
  tạo draft ngay (`results[]`, cùng hợp đồng `BatchResult` ở mục 2). Dòng **không khớp** → xuất hiện ở
  `unmatchedLines` (KHÔNG tạo draft thiếu `employeeId`) — Admin xử lý tiếp bằng cách chọn nhân viên đúng
  thủ công rồi gửi qua `POST /api/v1/production-records/batch` (mục 2), không có endpoint riêng để "gán
  employeeId cho unmatched line".
- **`latex_sales`**: không cần fuzzy-match (không có `employee_id` ở bảng này) — luôn tạo đúng 1 draft
  gắn thẳng `teamId` đã truyền, `results` chỉ có 1 phần tử.

Draft ghi kèm `photoUrl` (trace về ảnh gốc) và `lowConfidenceFields` (JSON `{"fields": [...]}` — tên
field OCR không chắc chắn, ở mức DÒNG không phải từng item) — frontend đọc thẳng từ draft row để
highlight, không phải state tạm ở client (chống mất dữ liệu nếu Admin bị gián đoạn giữa chừng, ADR-0006).

```
Bước 4 — Admin xem bảng draft (GET /api/v1/production-records?status=draft&... hoặc /latex-sales?...),
         sửa qua PATCH /api/v1/{resource}/{id} nếu cần (có thể làm nhiều lần / bỏ dở rồi quay lại)

Bước 5 — POST /api/v1/production-records/{id}/confirm  (hoặc /latex-sales/{id}/confirm)
         draft → confirmed. KHÔNG tự động — chỉ Admin bấm "Lưu" mới gọi bước này.
         409 nếu record không còn ở trạng thái draft (đã confirm/cancel trước đó); 404 nếu không tồn tại.
         KHÔNG ghi edit_history (đây là bước hoàn tất review lần đầu, không phải "sửa" — xem mục 4).
```

**Sổ giấy tràn nhiều trang**: mỗi trang chụp 1 ảnh riêng, mỗi dòng độc lập theo `employee_id` +
`record_date` — không có bước "gộp nhiều ảnh thành 1 phiếu" ở API; các draft từ nhiều trang cùng ngày tự
động gộp chung khi Admin xem lại qua filter `record_date` (CLAUDE.md §5).

## 4. `edit_history` — khi nào ghi, khi nào không

- **Chỉ ghi khi sửa (`PATCH`) hoặc hủy (`cancel`) 1 record đã ở trạng thái `confirmed` TRƯỚC lần thao
  tác đó** (`shouldLog = status trước khi sửa != DRAFT`). Sửa/hủy 1 record đang `draft` (chưa qua bước
  review lần đầu) không ghi — đây là quy trình rà soát bình thường, không phải "sửa" theo nghĩa cần lưu
  vết tranh chấp.
- **Không ghi sự kiện tạo mới** (kể cả batch nhập tay lẫn tạo draft từ OCR) — chỉ ghi các lần sửa/hủy
  SAU KHI record đã tồn tại và đã confirmed.
- Snapshot ở mức **AGGREGATE**: mỗi lần ghi lưu toàn bộ record + tất cả items liên quan vào
  `old_data`/`new_data` (JSONB, chính là Response DTO serialize), không tách riêng theo từng item —
  phục vụ đối chiếu tranh chấp cần xem toàn cảnh 1 lần thay đổi.
- Đọc lại: `GET /api/v1/edit-history?tableName=&recordId=` (`tableName` chỉ nhận
  `production_records`/`latex_sales`/`attendance_records`, sai → 400).

## 5. Mã lỗi chung

Tất cả lỗi trả về dạng `ProblemDetail` (RFC 7807) qua `GlobalExceptionHandler`:

| HTTP status | Khi nào |
|---|---|
| 400 | Validation body sai (`jakarta.validation`), thiếu `@RequestParam` bắt buộc, dữ liệu nghiệp vụ không hợp lệ (`InvalidRequestException`) |
| 401 | Thiếu/sai/hết hạn JWT, sai email/password lúc login |
| 404 | Không tìm thấy resource theo id (`NoSuchElementException`) |
| 409 | Xung đột nghiệp vụ (`ConflictException` — trùng active record, chồng lấn `effective_from/to`, cancel 2 lần...) hoặc vi phạm ràng buộc DB lọt qua check ở app (`DataIntegrityViolationException`, message chung, không lộ tên constraint SQL) |
| 500 | Lỗi không mong đợi — luôn kèm stack trace đầy đủ + `X-Request-Id` trong log (CLAUDE.md §7), KHÔNG kèm trong response |

Mọi response (kể cả lỗi) có header `X-Request-Id` — dùng để tra log khi cần hỗ trợ debug (CLAUDE.md §7).
