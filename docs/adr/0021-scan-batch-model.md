# Scan Session/Batch model cho luồng quét ảnh hằng ngày (v2)

Luồng OCR v1 (ADR-0005/0006/0011) không có khái niệm nhóm nhiều ảnh: mỗi `POST /ocr/capture` độc lập, 1 ảnh → N draft row rời rạc, không chặn 2 phiên chụp trùng cùng Tổ/ngày/loại phiếu, không xử lý được trường hợp ngày trên phiếu giấy khác ngày phiên quét. Spec "Luồng nghiệp vụ quét ảnh hằng ngày (v2)" (chuẩn hóa từ buổi grilling, xem lịch sử trao đổi — không có file spec gốc trong repo, `docs/module-1-chi-phi-san-luong-spec.md` đang trống) yêu cầu 1 state machine đầy đủ cho việc này.

**Quyết định — entity mới:**
- `ScanBatch`: 1 "phiên quét" cho 1 `LogicalBatchKey` (`documentType + workDate + teamId`). `batchType = PRIMARY | SUPPLEMENT`; `status` là state machine riêng (`BatchStatus`), KHÔNG dùng chung `RecordStatus` của `production_records`/`latex_sales` — vòng đời pipeline xử lý ảnh (upload→OCR→review→approve) khác bản chất vòng đời 1 dòng dữ liệu đã persist, và record nhập tay (ADR-0007) không đi qua Scan Session nên không có batch để gán.
- `ScanImage`: 1 ảnh, first-class — thay `photo_url` string rời rạc copy trên từng record. `clientImageId` dedup retry-upload, `ocrRunId` dedup retry-OCR, `replacesImage` cho ảnh chụp lại (không xóa vật lý ảnh cũ).
- `ScanBatchConflict`: ledger chuẩn hóa cho mọi loại blocking conflict (date mismatch, duplicate ảnh, unknown employee, ...) — nguồn duy nhất tính `canApprove`.
- `ScanBatchAuditLog`: action-log riêng, KHÔNG tái dùng `edit_history` (bảng đó là snapshot diff record-level polymorphic, khác mục đích).

**DB uniqueness — 2 điều kiện khác nhau, không nhầm lẫn:**
- Runtime `uniquenessScope` (quyết định UI merge/chặn) = `ACTIVE/MERGEABLE ∪ {FAILED}`.
- DB constraint thực tế cho PRIMARY = `(batch_type='primary' AND status<>'cancelled')` — **rộng hơn** uniquenessScope, bao gồm cả `APPROVED` (chặn vĩnh viễn PRIMARY thứ 2 cho cùng key). Nếu implement constraint theo đúng uniquenessScope runtime, `APPROVED` sẽ lọt khỏi index và cho phép PRIMARY thứ 2 song song — sai.
- Supplement: `(batch_type='supplement' AND status IN ACTIVE_SUPPLEMENT_STATUSES)` theo `originalBatchId` — tối đa 1 Supplement active/PRIMARY tại 1 thời điểm, dù lịch sử có thể có nhiều Supplement đã terminal.

**`production_records`/`latex_sales` thêm `scan_image_id`/`scan_batch_id` (nullable, migration 005):** trace record → ảnh nguồn thật thay vì so `photo_url` string thủ công. NULL cho record `manual` và toàn bộ dữ liệu tạo trước migration này — **không backfill** (suy luận LogicalBatchKey + gom nhóm theo `photo_url` cho dữ liệu cũ là suy diễn, không phản ánh lịch sử thật). Sản lượng v2 coi `scan_batch_id IS NULL` là "không có thông tin batch", không phải lỗi.

**PENDING_MOVE sống ở `ScanImage.status`, không thêm giá trị vào `RecordStatus`:** record dưới ảnh đang chờ chuyển ngày (target đã APPROVED) giữ nguyên `DRAFT`, loại khỏi tổng kg qua điều kiện join theo `ImageStatus` ở tầng query — nhất quán nguyên tắc "batch/image state, không phải record state".

**`RecordStatus.CONFIRMED` đổi tên thành `APPROVED`** (migration 006) — nhất quán thuật ngữ với `ScanBatch.status APPROVED` (cùng nghĩa "đã khóa, immutable"), tránh 2 từ khác nhau cho cùng 1 khái niệm. Endpoint `/confirm` đổi thành `/approve`. `attendance_records` KHÔNG bị ảnh hưởng — xem ADR-0022 (tách `AttendanceRecordStatus` riêng TRƯỚC khi rename, vì `RecordStatus` trước đó bị dùng chung cho cả 3 entity dù comment chỉ nhắc 2).

**Ngoài scope migration này:** wiring `ScanBatchService`/`ScanBatchController` (create/merge/approve/cancel/retry, date verification, conflict detection) — đây mới là phần entity/migration nền tảng, additive, không đổi runtime OCR hiện tại cho tới khi API mới nối vào (xem plan implementation phases).
