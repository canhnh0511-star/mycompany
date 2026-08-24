# Scan Session/Batch rework (Spec 1) + Sản lượng v2 (Spec 2)

## Context

Luồng OCR hiện tại (ADR-0006/0011) là: 1 ảnh → 1 lần gọi Claude Vision đồng bộ → N draft row độc lập trong `production_records`/`latex_sales`, mỗi row có 3 status riêng (`draft/confirmed/cancelled`). Không có khái niệm nhóm nhiều ảnh thành 1 "phiên quét", không xử lý ngày-trên-phiếu-khác-ngày-phiên-quét, không chặn 2 phiên trùng cùng Tổ/ngày/loại phiếu, và màn "Sản lượng" (tab Lookup) hiện chỉ là list+filter phẳng.

Audit xác nhận (3 agent song song + đọc lại source thật): **không có bất kỳ hạ tầng batch/session nào trong code** — đây là domain hoàn toàn mới, không phải mở rộng cái có sẵn. 2 phát hiện chỉnh sửa audit ban đầu, đã verify lại bằng cách đọc trực tiếp source:

1. **OCR date đã được đọc**, không phải "chưa có". `ClaudeOcrService` schema đã yêu cầu Claude trả `record_date`. Nhưng `OcrCaptureService.capture()` dòng 129-131 hiện **throw `InvalidRequestException`** nếu parse date thất bại — ngày đang **bắt buộc + blocking cứng**, chưa có khái niệm verify/so sánh/mismatch. Việc cần làm: đổi hành vi throw→fallback, không phải thêm capability đọc ngày.
2. **`RecordStatus` enum bị dùng chung bởi 3 entity**, không chỉ 2: `AttendanceRecord.status` (entity/AttendanceRecord.java:72) cũng dùng thẳng `RecordStatus.CONFIRMED`, dù comment chỉ nhắc `ProductionRecord`/`LatexSale`. Việc này ngoài phạm vi CLAUDE.md/2 spec nhưng bị kéo theo nếu rename `CONFIRMED→APPROVED` mà không tách trước.

Quyết định đã chốt với user (AskUserQuestion):
- **Thứ tự**: Spec 1 (Scan Session/Batch, backend + capture flow) làm xong hoàn chỉnh trước, Spec 2 (Sản lượng v2) làm sau trên nền PRIMARY/SUPPLEMENT/PENDING_MOVE đã có thật.
- **Tổng kg**: giữ nguyên cộng dồn 4 loại mủ thành `TOTAL_PRODUCTION_KG` (đã là hành vi thật ở Home/Report, không phải giả định).
- **OCR date verification**: đưa vào scope Spec 1 lần này (đổi hành vi throw→NOT_DETECTED/MISMATCH, không phải xây mới từ đầu).

Mục tiêu turn này: đưa ra **implementation plan để user duyệt** — theo đúng yêu cầu "Dừng lại và chờ xác nhận trước khi implement" ở cuối cả 2 spec. Chưa viết code.

---

## Quyết định kiến trúc cốt lõi

### 1. Tách `BatchStatus` (batch) khỏi `RecordStatus` (record) — không hợp nhất
`RecordStatus` (DRAFT/CONFIRMED/CANCELLED) mô tả 1 dòng dữ liệu đã persist. `BatchStatus` mới mô tả vòng đời pipeline xử lý ảnh (upload→OCR→review→approve), có state mà 1 record đơn lẻ không có (UPLOADING/PROCESSING/PARTIAL_FAILED). Quan trọng hơn: **record nhập tay (manual/quick-entry, ADR-0007) không đi qua Scan Session** — không có batch nào để gán. Batch-level approve/cancel **cascade ghi hàng loạt** xuống record-level status trong 1 transaction, nhưng đây là 2 state machine riêng.

### 2. Rename `RecordStatus.CONFIRMED → APPROVED`, nhưng tách `AttendanceRecordStatus` ra TRƯỚC
Thứ tự bắt buộc (tránh động vào `attendance_records` — ngoài phạm vi 2 spec):
1. Tạo `AttendanceRecordStatus` enum riêng (copy y hệt 3 giá trị) + converter riêng, đổi `AttendanceRecord.status` sang dùng nó. Giá trị lưu DB **không đổi** (converter vẫn lowercase `.name()`), CHECK constraint `attendance_records` không cần sửa.
2. Rename `RecordStatus.CONFIRMED → APPROVED` (giờ chỉ còn `ProductionRecord`+`LatexSale` dùng).
3. Migration đổi giá trị DB `'confirmed'→'approved'` **chỉ** cho `production_records`/`latex_sales`.
4. Đổi endpoint `/confirm` → `/approve` cho nhất quán thuật ngữ với batch APPROVED.

### 3. Quan hệ ScanBatch/ScanImage ↔ production_records/latex_sales
Thêm 2 cột nullable: `scan_image_id`, `scan_batch_id` (denormalized, giống tiền lệ `team_id` denormalize từ `employee.team_id`). NULL cho record `manual` và toàn bộ dữ liệu cũ trước migration (không backfill — xem mục Rủi ro). Đây cũng chính là ranh giới 2 dimension Spec 2 yêu cầu tách: **Data Capture Method** = `source` field có sẵn (`manual`/`ocr_import`); **Lifecycle/Origin Context** = `scan_batch.batch_type` (`PRIMARY`/`SUPPLEMENT`) — 2 field độc lập, không gộp.

### 4. PENDING_MOVE sống ở `ScanImage.status`, không thêm giá trị vào `RecordStatus`
Record dưới ảnh PENDING_MOVE giữ nguyên `DRAFT`. Loại khỏi tổng kg qua **điều kiện join ở query** (`WHERE scan_image.status <> 'PENDING_MOVE'`), không thêm state trên record — nhất quán nguyên tắc #1.

---

## Entity model mới

Enum mới (`entity/`, converter kiểu `RecordStatusConverter`, lowercase DB):
```
BatchType: PRIMARY, SUPPLEMENT
BatchStatus: DRAFT, UPLOADING, PROCESSING, NEED_REVIEW, READY_TO_APPROVE, PARTIAL_FAILED, FAILED, APPROVED, CANCELLED
ImageStatus: UPLOADING, PROCESSING, ACTIVE, FAILED, PENDING_MOVE, MOVED, REPLACED
DateVerificationStatus: MATCHED, NOT_DETECTED, MISMATCH
DateResolution: FALLBACK_SESSION_DATE, KEEP_SESSION_DATE, CHANGE_DATE, UNRESOLVED
ConflictType: DUPLICATE_IMAGE, IMAGE_QUALITY_OR_OCR_FAILED, DATE_MISMATCH, UNKNOWN_EMPLOYEE,
              INVALID_BUSINESS_VALUE, POTENTIAL_DUPLICATE_OCR_ROW, PENDING_MOVE, OTHER
ConflictStatus: OPEN, RESOLVED, OVERRIDDEN
```

**`ScanBatch`**: id, documentType (reuse `OcrTargetType`), workDate, team(FK), batchType, originalBatch(FK scan_batches, null trừ SUPPLEMENT), status, createdBy/createdAt, approvedBy/approvedAt.

**`ScanImage`**: id, scanBatch(FK), storagePath, clientImageId(unique, dedup retry-upload RULE 4), contentHash(dedup DUPLICATE_IMAGE), status, ocrRunId(đổi mỗi lần retry OCR RULE 5), ocrCallLog(FK), dateVerificationStatus, dateResolution, ocrDetectedDate, effectiveWorkDate, pendingMoveTargetBatchId(FK), replacesImage(FK scan_images, RULE 6 — ảnh chụp lại trỏ ảnh cũ, ảnh cũ→REPLACED không xóa vật lý), errorMessage, uploadedBy/createdAt/updatedAt.

**`ScanBatchConflict`** (ledger chuẩn hóa cho toàn bộ bảng "blocking conflict" mục 6 Spec 1 — vừa tính `canApprove`, vừa nguồn hiển thị UI theo displayOrder): id, scanBatch(FK), scanImage(FK null nếu conflict scope=dòng), recordTable+recordId (polymorphic như `edit_history`, null nếu conflict scope=ảnh/batch), conflictType, blocking(bool), status, detail(JSONB), resolvedBy/resolvedAt/resolution, createdAt.
`canApprove(batch)` = `NOT EXISTS (conflict WHERE scanBatch=? AND blocking=true AND status='OPEN')` — 1 query, khớp RULE 6/15.

**`ScanBatchAuditLog`**: id, scanBatch(FK), scanImage(FK null), action(enum text), performedBy(FK users, **null nếu system**), performedBySystem(bool — deviation có chủ đích so với spec's literal "SYSTEM": giữ FK thật cho referential integrity, DTO render `"SYSTEM"` khi cờ true), performedAt, oldValue/newValue(JSONB), sourceBatchId/targetBatchId.
Không tái dùng `edit_history` (thiết kế cho snapshot diff polymorphic khác mục đích, không có performedBySystem/action-log nhiều-sự-kiện-nhỏ).

---

## Thuật toán cốt lõi

### Create-or-merge PRIMARY (mục 2-3 Spec 1, RULE 3/3b/14/17)
Transaction-scoped Postgres advisory lock (`pg_advisory_xact_lock(hash(documentType,workDate,teamId))`) bao quanh: tìm batch PRIMARY non-CANCELLED mới nhất cho key → nếu rỗng tạo DRAFT mới; nếu ACTIVE/MERGEABLE → trả về (merge); nếu FAILED → `ConflictException` 409 (frontend hiện banner Thử lại/Hủy phiên); nếu APPROVED → `ConflictException` 409 (frontend hiện flow Bổ sung phiếu). Unique constraint mục DB (dưới) là belt-and-suspenders nếu lock bị miss ở code path khác sau này — catch `DataIntegrityViolationException` → 409.

### Create-or-reuse Supplement (mục 3.2, RULE 18)
Cùng pattern advisory lock theo `originalBatchId`: tìm Supplement có status ∈ `ACTIVE_SUPPLEMENT_STATUSES` cho originalBatchId → reuse (Case 26); nếu không có (kể cả vì lần trước đã APPROVED/CANCELLED — Case 27) → tạo Supplement mới (cùng workDate/team với PRIMARY gốc, chỉ khác batchType+originalBatch).

### Recompute batch status (mục 5.2, RULE 16) — chạy sau MỌI mutating event
Precedence: có ảnh UPLOADING→UPLOADING; có ảnh PROCESSING→PROCESSING; toàn bộ ảnh active đều FAILED (chưa từng có ảnh hợp lệ)→FAILED; có ảnh FAILED nhưng còn ảnh ACTIVE khác→PARTIAL_FAILED; có conflict blocking OPEN→NEED_REVIEW; ngược lại→READY_TO_APPROVE. Gọi tại: cuối upload/OCR/retry/resolve-conflict/đổi trạng thái PENDING_MOVE↔MOVED↔ACTIVE. Khi supplement approve/reject xong phải recompute **cả 2 batch** (source lẫn target).

### Resolve date mismatch (mục 4-5, RULE 7-9/15) — `POST /scan-batches/images/{id}/resolve-date`
- `KEEP_SESSION_DATE`: đóng conflict DATE_MISMATCH (RESOLVED), recompute source.
- `CHANGE_DATE` + target rỗng/CANCELLED/ACTIVE-MERGEABLE: dùng chính thuật toán create-or-merge PRIMARY cho target key, reparent ảnh+record DRAFT sang target (`record_date=ocrDate`), đóng conflict, recompute cả 2 batch.
- `CHANGE_DATE` + target FAILED: 409, yêu cầu resolve target trước.
- `CHANGE_DATE` + target APPROVED (RULE 9): create-or-reuse Supplement, `image.status=PENDING_MOVE` + `pendingMoveTargetBatchId`, **copy** (không move) các DRAFT record của ảnh sang supplement (record gốc giữ nguyên, loại khỏi tính toán qua join theo ImageStatus — mục kiến trúc #4), mở conflict PENDING_MOVE (blocking) trên source, audit `IMAGE_MARKED_PENDING_MOVE`.

**Supplement APPROVE**: bulk-approve record supplement; với mỗi ảnh có `pendingMoveTargetBatchId==supplement.id`: reparent ảnh sang supplement, `status=MOVED`, cancel record GỐC còn DRAFT ở source (tránh double-count), đóng conflict PENDING_MOVE, audit `IMAGE_MOVED`, recompute source (hết PENDING_MOVE → có thể approve).
**Supplement REJECT/CANCEL** (Case 22, RULE 15): ảnh→`ACTIVE`, `dateVerificationStatus=MISMATCH`, `dateResolution=UNRESOLVED` (không giữ resolution cũ), hủy record copy ở supplement, **mở lại** 1 conflict DATE_MISMATCH mới (không tái dùng row cũ đã RESOLVED — giữ audit append-only), recompute source (vẫn NEED_REVIEW cho tới khi user resolve lại từ đầu).

### Conflict khác (mục 6, RULE 12)
`DUPLICATE_IMAGE`: so `contentHash` giữa ảnh ACTIVE cùng batch. `IMAGE_QUALITY_OR_OCR_FAILED` (gộp theo ghi chú Spec 1): OCR `success=false` hoặc `type_mismatch=true` → ảnh FAILED. `UNKNOWN_EMPLOYEE`: persist `OcrUnmatchedLine` hiện có thành conflict row thay vì chỉ trả response. `INVALID_BUSINESS_VALUE`: tái dùng `BatchRowValidator` hiện có, kết quả invalid→conflict thay vì reject cứng. `POTENTIAL_DUPLICATE_OCR_ROW`: bắt `DataIntegrityViolationException` từ unique index `uq_production_records_employee_date_active` hiện có, chuyển thành conflict thay vì làm mất cả ảnh (RULE 11 áp cho từng dòng). Thứ tự hiển thị UI = `Map<ConflictType,Integer>` tĩnh phía Java, trả qua `displayOrder` trong DTO.

---

## API

**`ScanBatchController`** (`/api/v1/scan-batches`, thay thế `POST /api/v1/ocr/capture`):
`GET /lookup?documentType&teamId&workDate` (check trước khi mở Capture) · `POST /images` (upload+OCR+verify+conflict-detect+recompute 1 ảnh, trả ScanBatchResponse đầy đủ) · `GET /{id}` (detail: images[], conflicts[] sort displayOrder, canApprove) · `POST /images/{id}/retry` · `POST /{id}/retry` (batch-level) · `POST /{id}/cancel` · `POST /images/{id}/resolve-date` · `POST /images/{id}/resolve-conflict` (polymorphic theo conflictType) · `POST /{id}/approve` · `GET /{id}/audit-log`.
Giữ nguyên `POST /api/v1/ocr/upload-url`.

**`ProductionSummaryController`** (`/api/v1/production-summary`, controller MỚI — sibling của `ReportController`, theo đúng tiền lệ `daily-trend` đã có: shape khác hẳn report phẳng nên tách endpoint thay vì nhồi vào `ProductionReportResponse`):
`GET /daily?workDate&teamId&latexTypeCode` (MUST — Official Production + derivedStatus Case A-G + pendingMoveInfo) · `GET /team/{id}/breakdown?workDate&latexTypeCode` (MUST — drill-down nhân viên→record, kèm captureMethod + originContext + photoUrl) · `GET /monthly?yearMonth&teamId` (SHOULD) · `GET /employee-search?query` (SHOULD) · `GET /export/xlsx` (SHOULD, tái dùng `ExcelReportExportService`).
Backend aggregate 2 query độc lập (tổng kg theo CONFIRMED→APPROVED status, tái dùng cấu trúc JPQL `aggregateForReport`; batch status cho derived status là query mới trên `scan_batches`) merge ở service layer — không kéo record về client.

---

## DB Migration (Flyway)

> Lưu ý: 3 migration Phase 1 ban đầu đánh số `004/005/006` đã được **renumber thành `007/008/009`**
> khi verify trên DB Supabase dev thật — trùng số với `004_add_employee_spouse.sql` đã áp dụng thật từ
> nhánh `main` trước đó. Xem addendum cuối `docs/adr/0021-scan-batch-model.md`. Số file dưới đây giữ
> nguyên ý định gốc, KHÔNG phải số file thật trong repo — check `db/migrations/` để lấy số chính xác.

- **`scan_batches_and_images.sql`**: `scan_batches`, `scan_images`, `scan_batch_conflicts`, `scan_batch_audit_log`. Unique constraints:
  ```sql
  CREATE UNIQUE INDEX uq_scan_batches_primary_key ON scan_batches (document_type, work_date, team_id)
      WHERE batch_type = 'primary' AND status <> 'cancelled';   -- APPROVED vẫn nằm trong index (mục 3.1)
  CREATE UNIQUE INDEX uq_scan_batches_supplement_active ON scan_batches (original_batch_id)
      WHERE batch_type = 'supplement' AND status IN (...ACTIVE_SUPPLEMENT_STATUSES...);  -- mục 3.2
  ```
- **`link_records_to_scan_images.sql`**: `ALTER TABLE production_records/latex_sales ADD COLUMN scan_image_id, scan_batch_id` (nullable, FK).
- **`rename_confirmed_to_approved.sql`**: đổi CHECK constraint + `UPDATE ... SET status='approved' WHERE status='confirmed'` **chỉ** cho `production_records`/`latex_sales`. `attendance_records` không đụng (đã tách enum ở tầng Java trước đó). Migration này chạy **sau khi** code Java dùng `RecordStatus.APPROVED` đã deploy (deploy: migration → code, cùng release window).
- **`widen_scan_images_date_resolution.sql`** (phát sinh khi verify DB thật): `scan_images.date_resolution` VARCHAR(20)→VARCHAR(30) — giá trị `'fallback_session_date'` (21 ký tự) vượt quá cột gốc.

---

## Test plan

**Spec 1** — Case 17-28 (đề bài) → integration test (`@Transactional` rollback pattern có sẵn, theo `TeamIntegrationTest`), trừ **Case 19 và 28** cần race thật: 2 `Thread`/`CompletableFuture` mỗi cái tự mở transaction `PROPAGATION_REQUIRES_NEW` riêng (tái dùng `RequiresNewTransactionRunner` có sẵn), method test **không** bọc `@Transactional` lớp ngoài (để lock/constraint phát huy đúng nghĩa), tự cleanup ở `@AfterEach`. `recompute()` precedence + `canApprove()` + date-compare logic → unit test thuần (truth table).

**Spec 2** — theo nhóm MUST: tổng Official Production đúng (chỉ APPROVED PRIMARY+SUPPLEMENT, loại PENDING_MOVE/DRAFT/FAILED/CANCELLED) · không double-count qua supplement lịch sử CANCELLED · drill-down trả đúng scanImageId/photoUrl (null cho manual) · derived status Case A-G (unit, truth table thuần) · filter nhất quán 3 endpoint · review-gate: DTO không chứa field kiểu `expectedCount`/`avgDrc` (không tự suy denominator/AVG DRC).

---

## Implementation phases

1. **Spec 1 Backend Core** — entity/enum/repository/migration. Additive + rename an toàn, không đổi runtime hiện tại nếu chưa nối API. Ship được độc lập (không route nào gọi tới). ✅ ĐÃ XONG (commit 39db0f8 + fix bug tự phát hiện fd036ed).
2. **Spec 1 Backend API** — `ScanBatchController`/`ScanBatchService`/`ConflictDetector`/`DateVerificationService`. `OcrController.capture` cũ **xóa thẳng** (hệ thống nội bộ 1 mobile client, admin-only — không cần giữ 2 code path song song). ✅ ĐÃ XONG (commit 32d023f + integration test Case 17-28 commit 3a1be11, đã chạy pass thật trên DB local).
3. **Spec 1 Frontend (Capture rework)** — `CaptureScreen` thêm date picker `sessionWorkDate` + bắt buộc chọn Tổ cho cả 2 loại phiếu (thay đổi hành vi hiện tại — PRODUCTION_RECORD hiện không bắt buộc); `useOcrQueue` sinh `clientImageId`, gọi API mới; `OcrReviewScreen` viết lại theo model batch+conflict (→ `BatchReviewScreen` mới); màn resolve-conflict mới (date mismatch, unknown employee); banner FAILED [Thử lại][Hủy phiên]; nút Approve disable theo `canApprove`. ✅ ĐÃ XONG (commit 500f483 — `BatchReviewScreen.tsx` + route `scan-batch-review/[batchId].tsx` mới, `OcrReviewScreen.tsx`/`reviewStore.ts`/route `ocr-review/[logId]` cũ đã xóa. Verify tĩnh: `./gradlew compileJava` + `npx tsc --noEmit` sạch — **CHƯA** chạy thật trên thiết bị/Anthropic API, xem prompt test Android emulator đã gửi user).
4. **Spec 2 Backend** — `ProductionSummaryController`/`Service`. Cần Phase 1-3 xong trước để PRIMARY/SUPPLEMENT/PENDING_MOVE có dữ liệu thật. Ship độc lập được (test qua curl trước khi có frontend). ⏳ CHƯA BẮT ĐẦU.
5. **Spec 2 Frontend** — viết lại `LookupScreen.tsx` thành dashboard Sản lượng v2 (summary card + derived-status badge theo Tổ, breakdown table, drill-down, filter bar). Tạo `DataTable.tsx` component dùng chung (audit xác nhận chưa có, 3 màn hiện tại tự vẽ table trùng lặp pattern — lúc hợp lý để tạo). ⏳ CHƯA BẮT ĐẦU.

Deploy Phase 2+3 bắt buộc đồng bộ (backend xóa `/ocr/capture` cũ + mobile app cùng lúc — không thể chạy 2 phiên bản song song lâu vì client cũ sẽ 404).

---

## Rủi ro & migrate dữ liệu cũ

**Không backfill** `ScanBatch`/`ScanImage` cho dữ liệu cũ — suy luận LogicalBatchKey + gom nhóm theo `photo_url` cho record cũ là suy diễn, không phản ánh lịch sử thật (không biết ảnh cũ từng FAILED/retry hay chưa). `scan_image_id`/`scan_batch_id` để NULL cho dữ liệu cũ; `production_summary` service khi không tìm thấy `ScanBatch` cho 1 key coi là "không có thông tin batch" (không phải lỗi) — không gắn badge NEED_REVIEW/FAILED cho ngày cũ trước migration. Trước khi deploy: khuyến nghị admin xử lý hết draft OCR tồn đọng (confirm/cancel) để giảm record "mồ côi" batch.

---

## Ngoài scope lần này (theo đúng phân loại LATER của Spec 2 + phần Spec 1 đã loại trừ)

- Spec 2: Provisional/tạm tính, chart 7 ngày, advanced sort/analytics, trend/anomaly, DRC tổng hợp — **không làm**.
- Không đổi `useTeamDailySummaries`/Home/TeamWorkday hiện tại (cách tính done/partial/none hiện suy ra từ active employees — về bản chất vi phạm nguyên tắc "không x/y nếu chưa có expectedWorkersForDate" mà Spec 2 đặt ra cho màn mới, nhưng **đồng bộ sửa Home là ngoài scope 2 spec này** — chỉ đảm bảo màn Sản lượng v2 mới không lặp lại cách tính đó).

---

## Verification (sau khi implement từng phase)

- Phase 1: `./gradlew build` (services/api) pass, Flyway migration chạy sạch trên DB dev (`./gradlew flywayMigrate` hoặc tự động lúc app start).
- Phase 2: chạy integration test Case 17-28 xanh; test thủ công qua curl/Postman toàn bộ endpoint `ScanBatchController`.
- Phase 3: `run` skill build+chạy Expo, đi qua flow thật: chụp 2 ảnh cùng Tổ/ngày (merge), giả lập FAILED (ngắt mạng giữa chừng) → thấy banner Thử lại/Hủy phiên, resolve 1 case date-mismatch end-to-end.
- Phase 4: test suite Spec 2 xanh + curl trực tiếp `/production-summary/daily` đối chiếu tay với dữ liệu seed.
- Phase 5: build+chạy Expo, kiểm tra responsive mobile/tablet/desktop qua `--web`, đối chiếu acceptance criteria mục 50 Spec 2 bằng tay (checklist ~25 mục).

---

## LƯU Ý cho session local đọc file này

File này là **Plan** (đã được user duyệt), KHÔNG phải Spec 1/Spec 2 gốc — 2 spec gốc do user paste trực tiếp
vào hội thoại (không lưu file trong repo, xem ADR-0021 dòng 3: "không có file spec gốc trong repo,
`docs/module-1-chi-phi-san-luong-spec.md` đang trống"), và bản plan này + `docs/adr/0021-scan-batch-model.md`
+ `docs/adr/0022-attendance-status-split.md` + code/comment hiện tại đã chứa toàn bộ quyết định/rule cụ thể
cần biết để tiếp tục implement — không cần bản spec gốc để làm việc tiếp. Nếu cần đối chiếu lại đúng câu chữ
gốc của spec (số RULE, số Test Case cụ thể), phải hỏi lại user trực tiếp — session nào cũng không còn giữ
bản gốc verbatim.

Trạng thái triển khai tính đến thời điểm commit file này: xem mục "Implementation phases" ở trên — Phase
1-3 ĐÃ XONG và đã push (commit mới nhất `500f483`, xem `git log --oneline`). Phase 3 đã verify TĨNH
(`./gradlew compileJava` + `npx tsc --noEmit` sạch) nhưng **CHƯA** chạy thật trên thiết bị/Anthropic API —
cần chạy QA thủ công trên Android emulator trước khi coi Phase 3 là "done" theo đúng nghĩa (checklist chi
tiết đã gửi riêng cho user, không nằm trong file này). Việc tiếp theo: Phase 4 (Spec 2 Backend —
`ProductionSummaryController`/`Service`) CHƯA bắt đầu.
