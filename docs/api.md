# API — Module 1: Chi phí / Sản lượng

> Tài liệu viết tay, tập trung vào **luồng nghiệp vụ** mà Swagger/OpenAPI (khi thêm ở Phase 5) không
> diễn tả tốt: OCR end-to-end, batch contract, auth, quy ước lỗi. Danh sách field chi tiết từng
> DTO nên tra ở Swagger UI (`/swagger-ui.html`, khi có) hoặc đọc thẳng `dto/*.java` — file này không
> lặp lại toàn bộ Javadoc.
>
> Base path: **`/api/v1`**. Đọc `CLAUDE.md` trước để hiểu domain (Tổ/nhân viên/loại mủ/OCR).

---

## 1. Auth

Tự triển khai JWT thủ công (`docs/adr/0004-auth-simplified-for-v1.md`) — **không dùng Supabase Auth,
không có refresh token**. Access token hết hạn sau **1 ngày** (`app.jwt.expiration-ms`); hết hạn thì
đăng nhập lại, không có cơ chế refresh.

- `POST /api/v1/auth/login` — **public**. Body: `{ email, password }`. Trả `{ accessToken, userId,
  fullName, role }`. Sai email/password đều trả 401 message chung `"Email hoặc mật khẩu không đúng"`
  (không lộ email nào tồn tại).
- Không có endpoint đăng ký công khai. Tài khoản Admin duy nhất được seed qua Flyway migration
  (`002_seed_admin_user.sql`); Module 1 release 1 chỉ Admin đăng nhập (CLAUDE.md §2, ADR-0001).

**Gửi token:** header `Authorization: Bearer <accessToken>` trên mọi request trừ `POST
/api/v1/auth/login` và `GET /actuator/health`.

**Thiếu/sai/hết hạn token:** bị chặn ở Spring Security filter chain **trước khi tới controller** —
response là 401 mặc định của Spring Security, **không đảm bảo đúng format `ProblemDetail`** như các
lỗi khác ở mục 6. Frontend không nên parse `.title`/`.detail` cho case này, chỉ cần coi mọi 401 là
"cần đăng nhập lại".

- `GET/PATCH /api/v1/users/me` — xem/sửa hồ sơ (không đổi được email/password/role qua đây).
- `PATCH /api/v1/users/me/password` — đổi mật khẩu, verify `currentPassword` trước. Sai mật khẩu hiện
  tại → 401. Thành công → 204, không trả body.

---

## 2. Batch contract (ADR-0007 — best-effort theo từng dòng)

Áp dụng cho **3 endpoint** `POST .../batch`:
- `POST /api/v1/production-records/batch`
- `POST /api/v1/latex-sales/batch`
- `POST /api/v1/attendance-records/batch`

**Nguyên tắc cốt lõi:** 1 dòng lỗi **không** làm hỏng cả batch. Request body là **raw JSON array**
(không bọc trong object), *không* có `@Valid` ở tầng controller — validate diễn ra **từng dòng** bên
trong service, mỗi dòng chạy trong transaction riêng (`REQUIRES_NEW`) nên dòng lỗi không rollback
dòng đã lưu thành công trước/sau nó.

**Response luôn là HTTP 200** (batch tự nó "thành công" — kết quả từng dòng nằm trong payload):

```jsonc
{
  "results": [
    { "index": 0, "success": true,  "data": { /* Response DTO đầy đủ */ }, "error": null },
    { "index": 1, "success": false, "data": null, "error": "Nhân viên đã có bản ghi sản lượng ngày 2026-08-06" }
  ]
}
```

- `index` — vị trí (0-based) của dòng trong mảng request, dùng để frontend highlight đúng dòng lỗi.
- Khi `success=true`, `data` là **Response DTO đầy đủ** giống hệt như `GET /{id}` trả về — không phải
  bản rút gọn.
- `error` là message người-đọc-được (tiếng Việt), lấy trực tiếp từ exception nghiệp vụ
  (`ConflictException`/`InvalidRequestException`/`NoSuchElementException`) hoặc message chung nếu là
  lỗi không lường trước.

**Nhập tay (batch) luôn ghi thẳng `status=CONFIRMED`, `source=MANUAL`** — khác hẳn luồng OCR (mục 3)
ghi `status=DRAFT`. Đây là điểm phân biệt quan trọng: batch endpoint **không** dùng để review dữ liệu
OCR, chỉ dùng để nhập mới hoặc xử lý `unmatchedLines` từ OCR (nhập thủ công dòng mà fuzzy-match không
khớp được nhân viên).

`attendance-records` không có `/confirm` — không đi qua OCR/draft, chỉ có batch + PATCH + cancel.

---

## 3. Luồng OCR end-to-end (CLAUDE.md §5, ADR-0005 gọi đồng bộ, ADR-0006 ghi draft ngay)

3 bước, đúng thứ tự, không thể bỏ bước:

### Bước 1 — Xin signed upload URL

```
POST /api/v1/ocr/upload-url
Body: { "contentType": "image/jpeg" }   // hoặc image/png — theo app.supabase.allowed-content-types
→ 200: { "photoPath": "ocr/2026-08-07/<uuid>.jpg", "uploadUrl": "...", "token": "..." }
```

`photoPath` là object path **server tự sinh** (KHÔNG dùng tên file client gửi lên — chống path
traversal). Giữ lại `photoPath` này để dùng ở bước 2.

### Bước 2 — App PUT ảnh trực tiếp lên `uploadUrl`

**Không đi qua Spring Boot backend** — app PUT binary thẳng lên Supabase Storage bằng `uploadUrl` +
`token` nhận được ở bước 1. Backend chỉ tải lại ảnh này (bằng service role key) khi cần gửi cho
Claude ở bước 3.

### Bước 3 — Gọi capture (đồng bộ, chờ Claude trả kết quả)

```
POST /api/v1/ocr/capture
Body: {
  "targetType": "PRODUCTION_RECORD" | "LATEX_SALE",   // Admin CHỌN TRƯỚC, không phải AI đoán
  "photoPath": "ocr/2026-08-07/<uuid>.jpg",            // từ bước 1
  "teamId": "<uuid>"   // BẮT BUỘC trên thực tế nếu targetType=LATEX_SALE (latex_sales.team_id NOT
                        // NULL ở DB — DTO không @NotNull nên lỗi thiếu teamId sẽ hiện ra ở tầng DB/
                        // service dưới dạng 400/409 thay vì validation lỗi field rõ ràng); optional
                        // gợi ý thu hẹp fuzzy-match khi targetType=PRODUCTION_RECORD
}
```

Request này **luôn ghi 1 dòng `ocr_call_logs`**, dù kết quả ra sao — dùng để theo dõi chi phí/tỷ lệ
thành công (xem mục 5).

Response `OcrCaptureResponse` — đọc theo đúng thứ tự ưu tiên:

1. **`success=false`** — lỗi kỹ thuật khi gọi Claude API (network, 401 do sai key, timeout, JSON
   không đúng schema...). Xem `errorMessage`. **Không có draft nào được tạo.**
2. **`success=true` nhưng `typeMismatch=true`** — Claude đọc được ảnh nhưng xác nhận ảnh **không
   khớp** `targetType` Admin đã chọn (vd chọn "Sổ bán mủ" nhưng ảnh là sổ ghi mủ cá nhân). Xem
   `mismatchReason`. **Không có draft nào được tạo** — Admin cần chụp/chọn lại đúng loại hoặc đổi
   `targetType`.
3. **`success=true`, `typeMismatch=false`** — khớp loại phiếu. Draft đã được ghi **ngay lập tức** vào
   DB với `status=DRAFT`, `source=OCR_IMPORT`, kèm `photoUrl`/`ocrCallLogId`:
   - `targetType=PRODUCTION_RECORD` → `productionRecords: BatchItemResult<ProductionRecordResponse>[]`
     (1 ảnh phiếu có thể ra nhiều dòng nếu phiếu có nhiều nhân viên — mỗi dòng 1
     `BatchItemResult`, cùng shape với batch endpoint ở mục 2, vì bên trong dùng chung best-effort
     per-row)
   - `targetType=LATEX_SALE` → `latexSales: BatchItemResult<LatexSaleResponse>[]`
   - `unmatchedLines: OcrUnmatchedLine[]` (chỉ có ý nghĩa với `PRODUCTION_RECORD`) — dòng nào Claude
     đọc được tên nhân viên nhưng fuzzy-match (Levenshtein, ngưỡng 0.75) **không tìm ra** nhân viên
     khớp trong `employees` thì KHÔNG tạo draft thiếu `employee_id` — trả nguyên qua đây để Admin tự
     xử lý bằng `POST /production-records/batch` (mục 2), chọn đúng nhân viên thủ công.

**Quan trọng — draft không phải "auto-save nháp ở client", đó là ghi DB thật:**
- Frontend hiển thị bảng review đọc **trực tiếp từ các draft row vừa tạo** (đọc lại qua `GET
  /production-records`/`GET /latex-sales` với `status=DRAFT`), không phải giữ state tạm ở app — nếu
  Admin bị gián đoạn giữa chừng (mất mạng, tắt app), draft vẫn còn nguyên trong DB để quay lại sau.
- `lowConfidenceFields` trên draft row (JSON, dạng `{"fields": [...]}`) — field nào Claude không chắc
  chắn (chữ mờ, khó đọc) — frontend đọc thẳng field này để highlight, không cần logic đoán riêng.

### Bước 4 — Xác nhận draft → confirmed

```
POST /api/v1/production-records/{id}/confirm
POST /api/v1/latex-sales/{id}/confirm
```

- Admin xem/sửa draft trước (PATCH như nhập tay bình thường, có thể làm nhiều lần / bỏ dở quay lại —
  draft không tự hết hạn), rồi mới gọi `/confirm`.
- **Không tự động confirm** — đây là ràng buộc cứng (ADR-0006). Frontend không được gọi `/confirm`
  ngay sau khi capture mà chưa qua mắt người dùng.
- `/confirm` **không ghi `edit_history`** — đây là bước hoàn tất review lần đầu, không phải "sửa" một
  record đã tồn tại từ trước.
- 409 nếu record không ở trạng thái `DRAFT` (đã confirm hoặc đã cancel rồi); 404 nếu không tồn tại.

**`attendance-records` không có OCR/draft flow** — không có bước 3/4 tương ứng.

---

## 4. Vòng đời record (status) & sửa/xóa

`RecordStatus`: `DRAFT | CONFIRMED | CANCELLED` (chỉ `production_records`/`latex_sales`;
`attendance_records` chỉ có `CONFIRMED`/`CANCELLED`, không có `DRAFT`).

```
        (chỉ qua OCR)                (Admin review)
  ──────────► DRAFT ──────────► CONFIRMED ──────────► CANCELLED
  (nhập tay/batch bỏ qua DRAFT, đi thẳng CONFIRMED)     ▲
                                                          │
                                    CONFIRMED ────────────┘
                                    (PATCH sửa vẫn giữ CONFIRMED, không đổi status)
```

- **Không có hard delete.** "Xóa" = `POST .../{id}/cancel` → `status=CANCELLED`. Cancel 2 lần → 409.
  Cancel giải phóng lại slot `(employee_id, record_date)` cho `production_records` (nhập lại được
  ngày đó).
- **PATCH sửa AGGREGATE toàn bộ** — record + toàn bộ `items` bị **thay thế hoàn toàn**, không patch
  từng item lẻ. Gọi PATCH trên record đã `CANCELLED` → 409.
- **`edit_history` chỉ ghi khi sửa record đã `CONFIRMED`** (không ghi khi tạo mới, không ghi khi sửa
  record còn `DRAFT`, không ghi ở bước `/confirm`). Đọc lại qua `GET /api/v1/edit-history?tableName=
  production_records&recordId=<uuid>` — `tableName` phải là 1 trong 3 bảng header hợp lệ
  (`production_records`/`latex_sales`/`attendance_records`), cả 2 param bắt buộc (thiếu → 400).
  `oldData`/`newData` là **snapshot JSON toàn bộ record + items** (không phải diff từng field) — client
  tự `JSON.parse`.

---

## 5. Theo dõi chi phí OCR

`GET /api/v1/ocr-call-logs` — list có filter `targetType`/`success`/khoảng `calledAt` (`from`/`to`,
kiểu `Instant`).

`GET /api/v1/ocr-call-logs/stats` — filter `from`/`to` optional. Trả tổng số lần gọi, tỷ lệ thành
công, tỷ lệ `type_mismatch`, tổng `estimated_cost_usd`, thời gian phản hồi trung bình. Dùng để theo
dõi chi phí Claude API theo thời gian thực — mỗi lần gọi `/ocr/capture` đều có đúng 1 dòng tương ứng
ở đây (mục 3), kể cả khi lỗi.

---

## 6. Quy ước lỗi

Toàn bộ lỗi nghiệp vụ trả về **`ProblemDetail`** (RFC 7807, mặc định Spring Boot 3) — shape:

```jsonc
{ "type": "about:blank", "title": "...", "status": 404, "detail": "...", "instance": "/api/v1/..." }
```

| Tình huống | HTTP | `title` |
|---|---|---|
| Validation lỗi field (`@Valid` trên body) | 400 | "Dữ liệu không hợp lệ" — `detail` liệt kê từng field lỗi |
| Business rule lỗi không diễn tả được bằng annotation (vd trùng `latexTypeId` trong `items`, `effective_to < effective_from`) | 400 | "Dữ liệu không hợp lệ" |
| Thiếu query param bắt buộc (`fromDate`/`toDate` ở report, `tableName`/`recordId` ở edit-history) | 400 | "Thiếu tham số bắt buộc" |
| Sai kiểu param (UUID/LocalDate không parse được) hoặc JSON/enum sai định dạng | 400 | "Tham số không hợp lệ" / "Dữ liệu không hợp lệ" |
| Sai mật khẩu (login, đổi password) | 401 | "Đăng nhập thất bại" |
| Không tìm thấy record/entity | 404 | "Không tìm thấy dữ liệu" |
| Xung đột nghiệp vụ (status sai để chuyển tiếp, chồng lấn `effective_from/to`, xóa danh mục còn bị tham chiếu, trùng record active) | 409 | "Xung đột dữ liệu" |
| Vi phạm ràng buộc DB lọt qua validate ở app (race condition, EXCLUDE constraint) | 409 | "Xung đột dữ liệu" (message chung, không lộ tên constraint SQL) |
| Lỗi không lường trước | 500 | "Đã có lỗi xảy ra" — kèm `X-Request-Id` để tra log |

**Mọi response** (kể cả 500) đều có header `X-Request-Id` — 1 UUID sinh ra ở đầu request
(`RequestIdFilter`), gắn vào SLF4J MDC nên **mọi dòng log JSON trong lúc xử lý request đó tự động
kèm ID này**. Khi debug lỗi production, chỉ cần ID này để lọc ra toàn bộ log liên quan (docs/adr/
0008-logging-conventions.md).

**Batch endpoints (mục 2) là ngoại lệ** — luôn 200, lỗi từng dòng nằm trong payload
`results[i].error`, không phải ở tầng HTTP status.

---

## 7. Danh sách endpoint (tham chiếu nhanh)

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/auth/login` | public |
| GET/PATCH | `/api/v1/users/me` | |
| PATCH | `/api/v1/users/me/password` | |
| GET/POST/PATCH | `/api/v1/teams`, `/api/v1/teams/{id}` | không DELETE |
| GET/POST/PATCH | `/api/v1/employees`, `/api/v1/employees/{id}` | filter `teamId`/`status` |
| GET/POST/PATCH/DELETE | `/api/v1/latex-types`, `/api/v1/latex-types/{id}` | DELETE có guard tham chiếu |
| GET/POST/PATCH | `/api/v1/rate-configs`, `/api/v1/rate-configs/{id}` | không DELETE |
| GET/POST/PATCH | `/api/v1/allowance-configs`, `/api/v1/allowance-configs/{id}` | không DELETE |
| POST | `/api/v1/ocr/upload-url` | bước 1 OCR |
| POST | `/api/v1/ocr/capture` | bước 3 OCR |
| POST | `/api/v1/production-records/batch` | best-effort, xem mục 2 |
| GET | `/api/v1/production-records`, `/{id}` | filter `teamId`/`employeeId`/`fromDate`/`toDate`/`status` |
| PATCH | `/api/v1/production-records/{id}` | thay thế toàn bộ items |
| POST | `/api/v1/production-records/{id}/cancel` | soft delete |
| POST | `/api/v1/production-records/{id}/confirm` | chỉ luồng OCR, xem mục 3 |
| POST | `/api/v1/latex-sales/batch` | tương tự production-records, theo Tổ |
| GET/PATCH/cancel/confirm | `/api/v1/latex-sales/...` | tương tự production-records |
| POST | `/api/v1/attendance-records/batch` | không có draft/confirm |
| GET/PATCH/cancel | `/api/v1/attendance-records/...` | filter thêm `attendanceType` |
| GET | `/api/v1/ocr-call-logs`, `/stats` | mục 5 |
| GET | `/api/v1/edit-history?tableName=&recordId=` | 2 param bắt buộc |
| GET | `/api/v1/reports/production-records`, `/latex-sales` | `fromDate`/`toDate` bắt buộc, chỉ tính CONFIRMED |
| GET | `.../export/xlsx`, `.../export/pdf` | cùng query param với report JSON |
