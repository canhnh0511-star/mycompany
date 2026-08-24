# Spec chuẩn hóa — Luồng nghiệp vụ quét ảnh hằng ngày (v2)
> Bản này thay thế các mục 7, 8, 19, 25, 26, 33, 35, 37, 40 và 43 của spec gốc, dựa trên các quyết định nghiệp vụ đã chốt. Các mục khác của spec gốc (1–6, 9–18, 20–24, 27–32, 34, 36, 38, 39, 41, 42, 44) giữ nguyên hiệu lực trừ khi bị override rõ ràng bên dưới.
---
## 1. Batch status — mô hình chuẩn hóa
Thay thế mục 26 (Batch status đề xuất):
```text
ACTIVE / MERGEABLE (được coi là "batch còn sống", chặn tạo PRIMARY batch mới,
                     upload/scan mới sẽ merge vào đây):
    DRAFT
    UPLOADING
    PROCESSING
    NEED_REVIEW
    READY_TO_APPROVE
    PARTIAL_FAILED
RECOVERABLE BUT NOT AUTO-MERGE (vẫn chặn tạo batch mới, nhưng không tự
                     nhận thêm ảnh mới — user phải chọn hành động trước):
    FAILED
TERMINAL (không nhận thêm thao tác merge/upload thông thường):
    APPROVED
    CANCELLED
```
### Quy tắc chuyển trạng thái quan trọng
- `PARTIAL_FAILED`: batch vẫn giữ nguyên `LogicalBatchKey`, tiếp tục nhận ảnh mới bình thường (merge). User retry ảnh lỗi độc lập với upload ảnh mới.
- `FAILED`: **không** tự động cho tạo batch mới, và **không** tự động merge ảnh mới vào. User bắt buộc chọn một trong hai hành động:
  - `Thử lại` → quay lại trạng thái xử lý (PROCESSING/UPLOADING tùy điểm lỗi).
  - `Hủy phiên này` → status chuyển sang `CANCELLED`.
- Chỉ khi batch đạt `CANCELLED` thì `LogicalBatchKey` mới được giải phóng để tạo PRIMARY batch mới.
- `APPROVED` là immutable (RULE 10) — mọi thay đổi sau đó đi qua flow Supplement/Revision (mục 21 spec gốc).
### UI khi gặp batch FAILED
```text
Tổ 2 · 22/08/2026
Phiên trước xử lý thất bại
[ Thử lại ]
[ Hủy phiên này ]
```
Không cho phép "Chụp bổ sung" trực tiếp trên batch FAILED cho đến khi user chọn một trong hai hành động trên.
---
## 2. Rule kiểm tra & merge batch (thay mục 7 + mục 8)
```text
RULE MERGE (chuẩn hóa):
if LogicalBatchKey (documentType + workDate + teamId) đang có batch:
    if batch.status in ACTIVE/MERGEABLE:
        → merge ảnh mới vào batch hiện tại
        → không tạo batch mới
    if batch.status == FAILED:
        → KHÔNG merge tự động
        → hiển thị UI "Thử lại / Hủy phiên"
        → chỉ sau khi CANCELLED mới cho tạo batch mới
    if batch.status == APPROVED:
        → không cho ghi đè/merge trực tiếp
        → hiển thị flow "Xem dữ liệu / Bổ sung phiếu" (mục 20–21 spec gốc)
    if batch.status == CANCELLED:
        → coi như "chưa có batch" cho key này
        → cho phép tạo PRIMARY batch mới
else:
    → CREATE new batch, status = DRAFT
```
---
## 3. Phạm vi enforce uniqueness (thay mục 37, cập nhật mục 36)
```text
uniquenessScope (backend phải chặn tạo PRIMARY batch mới nếu tồn tại
                  batch ở phạm vi này cho cùng LogicalBatchKey):
    ACTIVE/MERGEABLE  ∪  { FAILED }
```
Lưu ý quan trọng: `FAILED` **vẫn nằm trong phạm vi chặn** concurrency, dù không tự động merge. Nghĩa là:
- Backend concurrency check (mục 36 spec gốc) khi nhận request tạo batch mới phải tìm cả batch `FAILED` cho cùng key, không chỉ nhóm ACTIVE/MERGEABLE.
- Nếu tìm thấy batch `FAILED` → từ chối tạo mới, trả về batch đó kèm trạng thái để frontend hiển thị UI "Thử lại / Hủy phiên".
**`CANCELLED` vs `APPROVED` — hai trạng thái này KHÔNG tương đương nhau về việc "giải phóng key":**
```text
CANCELLED
    → key được giải phóng hoàn toàn
    → cho phép tạo PRIMARY batch mới cho cùng LogicalBatchKey
APPROVED (PRIMARY)
    → key KHÔNG bao giờ được giải phóng cho một PRIMARY batch khác
    → đây là trạng thái chung cuộc (terminal) của PRIMARY batch
    → mọi dữ liệu bổ sung sau đó bắt buộc đi qua Supplement flow
      (batchType = SUPPLEMENT, originalBatchId trỏ về PRIMARY đã approved),
      KHÔNG tạo PRIMARY thứ hai
```
Nói cách khác: `uniquenessScope` chặn tạo PRIMARY mới; còn `APPROVED` không nằm trong scope này vì lý do khác hẳn — không phải vì nó "được coi như còn trống", mà vì đối với `LogicalBatchKey` đó, slot PRIMARY đã dùng vĩnh viễn và không bao giờ mở lại.
### 3.1 DB uniqueness — KHÔNG được implement trực tiếp theo `uniquenessScope` runtime (điểm quan trọng)
`uniquenessScope` (mục 3, phần trên) mô tả logic xử lý **runtime** — dùng để quyết định UI/flow khi user thao tác (merge, chặn tạo mới, gợi ý Thử lại/Hủy phiên...). Đây **không phải** là điều kiện đúng để dùng làm DB constraint (partial unique index).
**Cảnh báo:** Nếu implement partial unique index đúng theo `uniquenessScope` (chỉ gồm ACTIVE/MERGEABLE ∪ FAILED), `APPROVED` sẽ **không nằm trong index** — dẫn đến DB có thể chấp nhận:
```text
PRIMARY #1 · 22/08 + Tổ 2 · APPROVED
PRIMARY #2 · 22/08 + Tổ 2 · DRAFT      ← DB KHÔNG chặn được, SAI
```
vì bản ghi APPROVED không còn nằm trong phạm vi unique index đó — vi phạm trực tiếp nguyên tắc "APPROVED không bao giờ giải phóng key cho PRIMARY thứ hai".
**Rule DB uniqueness đúng — phải khác `uniquenessScope` runtime:**
```text
Đối với PRIMARY: tối đa 1 PRIMARY chưa CANCELLED cho mỗi LogicalBatchKey.
UNIQUE (documentType, workDate, teamId)
WHERE
    batchType = 'PRIMARY'
    AND status <> 'CANCELLED'
```
Diễn giải theo từng status:
```text
DRAFT             → nằm trong index, block PRIMARY mới
UPLOADING         → nằm trong index, block
PROCESSING        → nằm trong index, block
NEED_REVIEW       → nằm trong index, block
READY_TO_APPROVE  → nằm trong index, block
PARTIAL_FAILED    → nằm trong index, block
FAILED            → nằm trong index, block
APPROVED          → nằm trong index, block VĨNH VIỄN
CANCELLED         → KHÔNG nằm trong index, không block
```
Vẫn có thể lưu lịch sử nhiều bản PRIMARY đã CANCELLED cho cùng key:
```text
PRIMARY #1  CANCELLED
PRIMARY #2  CANCELLED
PRIMARY #3  APPROVED      ← chỉ 1 bản không-CANCELLED tồn tại tại một thời điểm
```
nhưng không bao giờ có 2 bản ghi cùng tồn tại mà cả hai đều `status <> CANCELLED` (kể cả khi một trong hai là APPROVED và một là DRAFT).
**Kết luận wording:** `uniquenessScope` (ACTIVE/MERGEABLE ∪ FAILED) chỉ dùng cho logic xử lý trạng thái runtime (quyết định UI hiển thị gì, có merge được không). DB uniqueness của PRIMARY phải enforce trên điều kiện rộng hơn: `status <> CANCELLED`, bao gồm cả `APPROVED`. Đây là 2 khái niệm khác nhau, không dùng lẫn cho nhau khi viết migration.
Không dùng `UNIQUE(documentType, workDate, teamId)` đơn giản ở DB (vẫn giữ nguyên cảnh báo ở mục 37 gốc). Điều kiện lọc đúng cho PRIMARY là `batchType = 'PRIMARY' AND status <> 'CANCELLED'` (xem mục 3.1 ngay trên) — **không** phải `status IN uniquenessScope`.
---
## 3.2 Concurrency cho Supplement (gap bổ sung — không phải mâu thuẫn, nhưng dễ sinh lỗi nếu bỏ qua)
Spec hiện có `targetSupplement = create-or-reuse SupplementBatch`, nhưng chưa định nghĩa rõ: một PRIMARY đã `APPROVED` có được phép tồn tại **nhiều Supplement đang xử lý cùng lúc** không?
**Trả lời: Không.** Nếu cho phép, sẽ xảy ra tình huống khó hiểu:
```text
PRIMARY B001 · APPROVED
├─ SUPPLEMENT S001 · NEED_REVIEW
├─ SUPPLEMENT S002 · DRAFT
└─ SUPPLEMENT S003 · PROCESSING
```
User (và cả hệ thống) không biết "dữ liệu bổ sung mới nhất" đang nằm ở supplement nào, dễ tạo dữ liệu rải rác/trùng lặp.
### Rule chuẩn hóa
```text
Một PRIMARY APPROVED có thể có NHIỀU Supplement trong lịch sử
(đã APPROVED hoặc CANCELLED/REJECTED),
nhưng tại một thời điểm chỉ được có TỐI ĐA 1 Supplement đang active.
```
```text
ACTIVE_SUPPLEMENT_STATUSES =
    DRAFT
    UPLOADING
    PROCESSING
    NEED_REVIEW
    READY_TO_APPROVE
    PARTIAL_FAILED
    FAILED
```
(Cùng nhóm status với PRIMARY, áp dụng logic tương tự — trừ APPROVED/CANCELLED/REJECTED không còn "active".)
### Ví dụ
```text
PRIMARY B001 · APPROVED
SUPPLEMENT S001 · APPROVED
SUPPLEMENT S002 · APPROVED
SUPPLEMENT S003 · NEED_REVIEW   ← active duy nhất
```
Nếu user tiếp tục chọn "Bổ sung phiếu" trong lúc S003 đang active:
```text
→ reuse S003
→ KHÔNG tạo S004
```
Chỉ khi S003 đạt trạng thái terminal (`APPROVED` hoặc `CANCELLED`/`REJECTED`) thì lần "Bổ sung phiếu" tiếp theo mới được tạo Supplement mới (S004).
### DB uniqueness cho Supplement
Tương tự PRIMARY, cần constraint riêng cho Supplement, theo `originalBatchId` (không theo `LogicalBatchKey` vì nhiều supplement lịch sử dùng chung key/ngày với PRIMARY gốc):
```text
UNIQUE (originalBatchId)
WHERE
    batchType = 'SUPPLEMENT'
    AND status IN ACTIVE_SUPPLEMENT_STATUSES
```
Backend concurrency check khi tạo/reuse Supplement (tương tự mục 36 áp dụng cho PRIMARY) phải:
1. Tìm Supplement active hiện có cho `originalBatchId` này.
2. Nếu có → reuse (merge target vào đó theo logic tương tự mục 2, áp dụng ở cấp Supplement).
3. Nếu không có → tạo Supplement mới, bảo vệ bằng transaction/unique constraint để tránh 2 request đồng thời tạo 2 Supplement (S003a, S003b) cùng lúc cho cùng `originalBatchId`.
---
## 4. OCR date verification — không đổi so với đã chốt
Giữ nguyên mục 12–18 spec gốc, bổ sung rõ:
### NOT_DETECTED (mục 13)
```text
sessionWorkDate = 22/08/2026
ocrDetectedDate = null
→ effectiveWorkDate = sessionWorkDate
→ dateVerificationStatus = NOT_DETECTED
→ dateResolution = FALLBACK_SESSION_DATE   (hệ thống tự set)
→ blocking = false
```
**Không yêu cầu user bấm "Chấp nhận".** UI chỉ hiển thị warning nhẹ, không chặn approve (xem mục 6 bên dưới).
### MISMATCH (mục 14–18) — không đổi, vẫn cần user quyết định thủ công.
---
## 5. Case target đã APPROVED khi resolve mismatch (thay mục 19)
```text
Khi user chọn "Chuyển sang ngày OCR" và target date đã APPROVED:
1. targetSupplement = create-or-reuse SupplementBatch cho target key
2. sourceImage.status = PENDING_MOVE
   (ảnh VẪN Ở LẠI source batch, KHÔNG bị gỡ ngay)
3. Dữ liệu ảnh được tham chiếu/copy sang supplement để user review & approve
Khi supplement được APPROVED:
    sourceImage.status         = MOVED
    source OCR result          = deactivate
    target supplement          = chính thức có hiệu lực
    → source batch có thể APPROVE bình thường (không còn PENDING_MOVE)
Nếu supplement bị REJECTED / CANCELLED:
    sourceImage.status          = ACTIVE
    dateVerificationStatus      = MISMATCH   (khôi phục, KHÔNG giữ MATCH/resolved)
    dateResolution               = UNRESOLVED (KHÔNG giữ CHANGE_DATE)
    → user bắt buộc chọn lại:
        [ Giữ ngày phiên quét ]
        hoặc
        [ Chuyển ngày ]
    → source batch tiếp tục bị block approve cho đến khi resolve lại
```
**Lý do:** tránh trạng thái "ảnh không thuộc batch nào" nếu supplement thất bại hoặc chưa được duyệt — nhất quán với RULE 10 (APPROVED data immutable) và nguyên tắc supplement chỉ có hiệu lực sau khi approve.
### 5.1 PENDING_MOVE là blocking state đối với source batch (bổ sung quan trọng)
`PENDING_MOVE` không chỉ là trạng thái hiển thị — nó phải **chặn approve của source batch**. Nếu không, có thể xảy ra kịch bản nguy hiểm:
```text
22/08 source batch
    IMG01 → PENDING_MOVE sang 21/08
21/08 Supplement đang NEED_REVIEW
↓ (nếu không chặn) 22/08 source batch được APPROVED
↓ sau đó Supplement 21/08 bị CANCELLED
↓ IMG01 phải quay lại ACTIVE ở 22/08
→ NHƯNG 22/08 đã APPROVED và immutable → mâu thuẫn với RULE 10
```
**Invariant bắt buộc:**
```text
Source batch KHÔNG được APPROVE nếu còn ít nhất một
ScanImage.status = PENDING_MOVE.
```
Bổ sung vào `canApprove` (xem mục 6):
```text
AND no unresolved PENDING_MOVE
```
Tóm tắt vòng đời liên quan đến approve của source batch:
```text
targetSupplement APPROVED
    → sourceImage = MOVED
    → source batch hết điều kiện PENDING_MOVE → có thể approve
targetSupplement REJECTED / CANCELLED
    → sourceImage = ACTIVE, dateVerificationStatus = MISMATCH,
      dateResolution = UNRESOLVED
    → source batch tiếp tục bị block cho đến khi user resolve lại
      (giữ hoặc chuyển ngày lần nữa)
```
### 5.2 Recompute batch status khi append ảnh mới (bổ sung quan trọng)
Khi một batch đã ở `READY_TO_APPROVE` (hoặc `NEED_REVIEW`) và user "Chụp bổ sung" thêm ảnh mới, batch **không được giữ nguyên** `READY_TO_APPROVE` trong lúc ảnh mới chưa upload/OCR xong — vì như vậy sẽ cho phép approve một batch có ảnh chưa xử lý.
**Rule bắt buộc:**
```text
Mỗi khi có ảnh được thêm/thay đổi trạng thái trong một batch
ACTIVE/MERGEABLE, batch status PHẢI được recompute từ trạng thái
tổng hợp của các ScanImage hiện có (không giữ status cũ).
```
Precedence khi recompute (từ cao xuống thấp, dừng ở điều kiện đầu tiên khớp):
```text
1. Có image đang UPLOADING
   → batch = UPLOADING
2. Có image đang PROCESSING (OCR)
   → batch = PROCESSING
3. Có image FAILED (không phải toàn bộ batch fail)
   → batch = PARTIAL_FAILED
4. Có ít nhất 1 unresolved blocking conflict
   (theo bảng mục 6: date mismatch, duplicate, unknown employee,
   invalid quantity/DRC, potential duplicate OCR row,
   PENDING_MOVE, image quality/OCR failed chưa xử lý...)
   → batch = NEED_REVIEW
5. Tất cả active images hợp lệ, không còn blocking issue
   → batch = READY_TO_APPROVE
```
Việc recompute này chạy lại **mỗi lần** có sự kiện: thêm ảnh, upload xong, OCR xong, retry, resolve conflict, ảnh chuyển PENDING_MOVE/MOVED/ACTIVE. Không có trạng thái nào được set thủ công/tĩnh mà bỏ qua recompute.
### Xử lý số liệu khi ảnh ở trạng thái PENDING_MOVE (bổ sung mới)
Ở màn hình summary trước approve (mục 34 spec gốc):
- Ảnh `PENDING_MOVE` **không tính vào** tổng kg/số dòng của **source batch** (vì đang chờ chuyển đi).
- Ảnh `PENDING_MOVE` **không tính vào** tổng của **target supplement** cho đến khi supplement được APPROVED.
- Nút xác nhận (`Xác nhận dữ liệu`) của **source batch bị disable** trong khi còn ảnh PENDING_MOVE (xem mục 5.1 — đây là blocking condition trong `canApprove`, không chỉ là vấn đề hiển thị số liệu).
- UI nên hiển thị riêng một dòng trạng thái cho ảnh đang pending-move, tránh để user hiểu nhầm là mất dữ liệu, đồng thời giải thích lý do batch chưa xác nhận được:
```text
5 ảnh · 20 dòng dữ liệu · 1.150 kg (đã xác nhận)
1 ảnh đang chờ chuyển sang 21/08 (chưa tính vào batch nào)
⚠ Chưa thể xác nhận dữ liệu ngày 22/08 cho đến khi
   phiếu chuyển ngày ở trên được xử lý xong.
[ Xác nhận dữ liệu ]   (disabled)
```
---
## 6. Bảng blocking conflict — thay mục 25 và mục 33
| Conflict | Blocking approve? | Cách xử lý |
|---|---|---|
| Exact duplicate image | Có | Bỏ duplicate hoặc explicit override |
| Image quality kém / không đọc được (gộp chung với "OCR image failed") | Có, nếu ảnh không đáng tin cậy để OCR | Retry / chụp lại / thay thế |
| `NOT_DETECTED` date | Không | Auto fallback session date |
| `MISMATCH` date | Có | Giữ session date hoặc chuyển ngày (resolve) |
| Unknown employee | Có | Map đúng nhân viên hoặc bỏ dòng |
| Invalid quantity / DRC | Có | Sửa dữ liệu |
| Potential duplicate OCR row | Có, cho đến khi user resolve | Giữ cả hai / bỏ dòng mới |
| `PENDING_MOVE` (ảnh đang chờ supplement target được approve) | **Có**, cho đến khi supplement APPROVED (→ MOVED) hoặc REJECTED/CANCELLED (→ quay lại ACTIVE + MISMATCH/UNRESOLVED) | Chờ kết quả supplement; không thao tác trực tiếp trên ảnh này |
| Batch-level inconsistency khác | Có | Resolve trước approve |
> **Lưu ý gộp rule:** "Image quality kém" và "OCR image failed" trước đây là hai dòng riêng nhưng cùng bản chất (ảnh không đủ tin cậy để OCR ra kết quả dùng được). Chuẩn hóa thành **một** rule/code path duy nhất để tránh hai nơi xử lý khác nhau cho cùng một tình huống.
### Điều kiện approve (thay mục 33)
```text
canApprove =
    no unresolved DATE_MISMATCH
    AND no unresolved DUPLICATE_IMAGE (chưa override)
    AND no blocking IMAGE_QUALITY / OCR_FAILED (ảnh bắt buộc)
    AND no unresolved UNKNOWN_EMPLOYEE
    AND no invalid BUSINESS_VALUE (quantity/DRC)
    AND no unresolved POTENTIAL_DUPLICATE_OCR_ROW
    AND no unresolved PENDING_MOVE          // xem mục 5.1 — chặn source
                                             // batch approve khi còn ảnh
                                             // đang chờ supplement resolve
    AND no other batch-level blocking validation
// KHÔNG nằm trong điều kiện block:
//   dateVerificationStatus == NOT_DETECTED (auto-resolved, không cần user act)
```
### Thứ tự xử lý cảnh báo trên UI (giữ tinh thần mục 25, không phải điều kiện blocking)
```text
1. Upload/image duplicate
2. Image quality / OCR failed
3. Date mismatch
4. Unknown employee
5. Business validation (quantity/DRC)
6. Potential duplicate OCR row
7. Batch-level validation khác
```
Đây là thứ tự **hiển thị conflict cho user xử lý**, tách biệt với danh sách blocking approve ở trên — dùng để tránh user sửa business data trước rồi mới phát hiện ảnh sai ngày.
---
## 7. Audit trail — bổ sung field phân biệt system vs user (mở rộng mục 35)
```text
action
performedBy        // giá trị đặc biệt "SYSTEM" cho các resolution tự động
                    // (vd: dateResolution = FALLBACK_SESSION_DATE),
                    // để phân biệt với resolution do user thao tác
                    // (KEEP_SESSION_DATE / CHANGE_DATE)
performedAt
oldValue
newValue
sourceBatchId
targetBatchId
```
Danh sách action giữ nguyên như mục 35 gốc, bổ sung:
```text
batch marked FAILED
batch cancelled (FAILED → CANCELLED)
image marked PENDING_MOVE
image moved (MOVED, sau khi supplement approved)
supplement rejected → image reverted to ACTIVE
```
---
## 8. Invariant tổng hợp — thay mục 40
```text
RULE 1   Ngày làm việc lấy từ Scan Session (sessionWorkDate là nguồn chính).
RULE 2   OCR date chỉ để verify, không tự ghi đè workDate.
RULE 3   Cùng ngày + tổ + loại phiếu, nếu batch status thuộc
         ACTIVE/MERGEABLE → merge vào batch hiện tại.
RULE 3b  Nếu batch status == FAILED → không tự merge, không tự tạo mới;
         user phải Thử lại hoặc Hủy phiên (→ CANCELLED) trước.
RULE 4   Retry upload không tạo duplicate (clientImageId/contentHash).
RULE 5   Retry OCR không tạo duplicate row (ocrRunId, replace/deactivate
         run cũ).
RULE 6   Ảnh chụp lại phải replace/deactivate ảnh cũ (không xóa vật lý).
RULE 7   Date mismatch không tự đổi ngày — cần user resolve thủ công.
RULE 8   Nếu chuyển ngày và target có working batch (ACTIVE/MERGEABLE)
         → merge vào target.
RULE 9   Nếu target đã APPROVED → tạo supplement/revision, KHÔNG merge
         trực tiếp; ảnh nguồn giữ trạng thái PENDING_MOVE cho đến khi
         supplement được approve.
RULE 10  APPROVED data không overwrite trực tiếp (immutable).
RULE 11  Một ảnh lỗi không làm mất kết quả ảnh khác trong cùng batch.
RULE 12  Không tự xóa potential duplicate OCR record — chỉ flag để
         user review.
RULE 13  NOT_DETECTED không block approve, không cần user xác nhận
         thủ công — hệ thống tự resolve bằng session date
         (performedBy = SYSTEM trong audit).
RULE 14  uniquenessScope cho LogicalBatchKey = ACTIVE/MERGEABLE ∪ {FAILED};
         hai trạng thái này chặn tạo PRIMARY batch mới.
         CANCELLED → giải phóng key, cho phép tạo PRIMARY mới.
         APPROVED (PRIMARY) → KHÔNG bao giờ giải phóng key cho PRIMARY
         thứ hai; mọi dữ liệu thêm bắt buộc đi qua Supplement flow.
RULE 15  PENDING_MOVE là blocking state đối với source batch: source
         batch không được APPROVE khi còn ảnh ở trạng thái PENDING_MOVE.
         Nếu supplement target bị REJECTED/CANCELLED, ảnh quay lại
         ACTIVE với dateVerificationStatus = MISMATCH và
         dateResolution = UNRESOLVED (không giữ resolution cũ), buộc
         user resolve lại từ đầu.
RULE 16  Batch status của một ACTIVE/MERGEABLE batch phải được recompute
         (không giữ tĩnh) mỗi khi có ảnh được thêm/thay đổi trạng thái,
         theo precedence: UPLOADING > PROCESSING > PARTIAL_FAILED >
         NEED_REVIEW > READY_TO_APPROVE.
RULE 17  DB uniqueness của PRIMARY enforce trên
         (batchType='PRIMARY' AND status<>'CANCELLED'), bao gồm cả
         APPROVED — KHÔNG được implement theo uniquenessScope runtime
         (RULE 14), vì uniquenessScope không chứa APPROVED và sẽ để
         lọt PRIMARY thứ hai song song với PRIMARY đã APPROVED.
RULE 18  Một PRIMARY APPROVED chỉ được có tối đa 1 Supplement đang
         ACTIVE_SUPPLEMENT_STATUSES tại một thời điểm; "Bổ sung phiếu"
         khi đã có Supplement active phải reuse, không tạo Supplement
         mới. DB uniqueness cho Supplement enforce trên
         (originalBatchId, batchType='SUPPLEMENT',
         status IN ACTIVE_SUPPLEMENT_STATUSES).
```
---
## 9. Test plan bổ sung — thêm vào mục 43 spec gốc
### Case 17
```text
Batch status = FAILED
→ user mở camera cho cùng LogicalBatchKey
→ hệ thống KHÔNG tạo batch mới, KHÔNG auto-merge
→ hiển thị UI "Thử lại / Hủy phiên"
```
### Case 18
```text
Batch FAILED → user chọn "Hủy phiên"
→ status = CANCELLED
→ user mở camera lại cho cùng key
→ cho phép tạo PRIMARY batch mới
```
### Case 19
```text
2 request đồng thời tạo batch cho key đang có batch FAILED
→ backend chặn tạo mới cho cả hai
  (kiểm tra dựa trên uniquenessScope bao gồm FAILED)
```
### Case 20
```text
MISMATCH → user chọn chuyển target date đã APPROVED
→ supplement được tạo
→ sourceImage.status = PENDING_MOVE
→ số liệu source batch KHÔNG cộng ảnh này
→ số liệu target supplement KHÔNG cộng ảnh này (chưa approved)
→ source batch KHÔNG được approve trong khi còn PENDING_MOVE
  (nút "Xác nhận dữ liệu" của source batch bị disable)
```
### Case 21
```text
Supplement (từ Case 20) được APPROVED
→ sourceImage.status = MOVED
→ source OCR result deactivate
→ target supplement số liệu chính thức bao gồm ảnh này
→ source batch hết điều kiện PENDING_MOVE → có thể approve bình thường
```
### Case 22
```text
Supplement (từ Case 20) bị REJECTED/CANCELLED
→ sourceImage.status quay lại ACTIVE
→ dateVerificationStatus quay lại MISMATCH (không giữ trạng thái resolved)
→ dateResolution = UNRESOLVED (không giữ CHANGE_DATE cũ)
→ ảnh tính lại vào số liệu source batch
→ source batch vẫn bị block approve cho đến khi user resolve lại
  MISMATCH (chọn lại "Giữ ngày phiên quét" hoặc "Chuyển ngày")
```
### Case 23
```text
Ảnh có dateVerificationStatus = NOT_DETECTED, user không thao tác gì
→ batch vẫn được phép approve (không blocking)
→ audit ghi performedBy = SYSTEM, resolution = FALLBACK_SESSION_DATE
```
### Case 24 (mới)
```text
Batch = READY_TO_APPROVE
→ user chọn "Chụp bổ sung", thêm 1 ảnh mới
→ batch status PHẢI recompute ngay, không giữ READY_TO_APPROVE
→ trong lúc ảnh mới đang UPLOADING/PROCESSING, batch = UPLOADING/PROCESSING
→ nút "Xác nhận dữ liệu" bị disable cho đến khi ảnh mới xử lý xong
  và batch recompute lại thành READY_TO_APPROVE (nếu không còn
  blocking issue nào khác)
```
### Case 25 (mới)
```text
22/08 source batch có IMG01 = PENDING_MOVE (chờ supplement 21/08)
→ user cố gắng approve 22/08 trong lúc supplement 21/08 vẫn NEED_REVIEW
→ hệ thống TỪ CHỐI approve, canApprove = false
   (do "no unresolved PENDING_MOVE" không thỏa)
→ ngăn được kịch bản: 22/08 approved trước, sau đó supplement 21/08 bị
  cancel, IMG01 phải quay ACTIVE nhưng 22/08 đã immutable
```
### Case 26 (mới)
```text
PRIMARY B001 = APPROVED
→ user chọn "Bổ sung phiếu" lần 1 → tạo SUPPLEMENT S001, status NEED_REVIEW
→ user chọn "Bổ sung phiếu" lần 2 (trong lúc S001 vẫn NEED_REVIEW)
→ hệ thống KHÔNG tạo S002
→ reuse S001, ảnh mới được merge vào S001
```
### Case 27 (mới)
```text
PRIMARY B001 = APPROVED
SUPPLEMENT S001 = APPROVED (đã xong)
→ user chọn "Bổ sung phiếu" lần tiếp theo
→ S001 không còn active (đã APPROVED)
→ hệ thống tạo SUPPLEMENT S002 mới (không reuse S001)
```
### Case 28 (mới — DB constraint cho PRIMARY)
```text
PRIMARY B001 · 22/08 + Tổ 2 · APPROVED
→ 2 request đồng thời cố gắng tạo PRIMARY mới cho cùng LogicalBatchKey
  (giả lập trường hợp code có lỗi/quên check trước khi insert)
→ DB unique constraint (batchType='PRIMARY' AND status<>'CANCELLED')
  PHẢI chặn cả hai insert, không cho phép PRIMARY DRAFT thứ hai tồn
  tại song song với PRIMARY APPROVED
```
---
## 10. Danh sách mục spec gốc cần cập nhật khi viết lại tài liệu chính thức
```text
Mục 7    → thay bằng "Rule kiểm tra & merge batch" (mục 2 tài liệu này)
Mục 8    → gộp vào mục 2 tài liệu này
Mục 19   → thay bằng mục 5 + 5.1 tài liệu này (bổ sung PENDING_MOVE
           blocking + rollback về MISMATCH/UNRESOLVED khi supplement fail)
Mục 25   → thay bằng phần "thứ tự hiển thị" trong mục 6 tài liệu này
Mục 26   → thay bằng mục 1 tài liệu này (thêm CANCELLED)
Mục 33   → thay bằng "Điều kiện approve" trong mục 6 tài liệu này
           (đã thêm điều kiện "no unresolved PENDING_MOVE")
Mục 34   → bổ sung cách hiển thị PENDING_MOVE + disable nút xác nhận
           khi còn PENDING_MOVE (mục 5.1 tài liệu này)
Mục 35   → bổ sung field/action mới (mục 7 tài liệu này)
Mục 36   → bổ sung: concurrency check phải bao gồm cả FAILED (mục 3),
           và concurrency riêng cho Supplement (mục 3.2)
Mục 37   → thay bằng "Phạm vi enforce uniqueness" (mục 3 tài liệu này),
           làm rõ APPROVED không giải phóng key cho PRIMARY mới;
           đồng thời DB uniqueness thực tế PHẢI theo mục 3.1
           (status <> CANCELLED), KHÔNG theo uniquenessScope runtime
Mục 40   → thay bằng "Invariant tổng hợp" (mục 8 tài liệu này),
           bổ sung RULE 14–18
Mục 43   → bổ sung Case 17–28 (mục 9 tài liệu này)
(mới)    → mục 3.1: DB uniqueness đúng cho PRIMARY (status <> CANCELLED,
           bao gồm APPROVED) — khác uniquenessScope runtime
(mới)    → mục 3.2: concurrency & DB uniqueness cho Supplement
           (tối đa 1 Supplement active trên mỗi originalBatchId)
(mới)    → mục 5.2: recompute batch status khi append ảnh vào batch
           đang ACTIVE/MERGEABLE (state machine khép kín)
```
---
## 11. Bước tiếp theo
Theo mục 41–44 của spec gốc, agent vẫn cần thực hiện **audit source code hiện tại trước khi code**, đối chiếu với bản spec chuẩn hóa này, và trả về đầy đủ:
1. Audit luồng hiện tại (đối chiếu domain, đặc biệt là enum status hiện có vs. mô hình `ACTIVE/MERGEABLE / FAILED / TERMINAL` mới).
2. Gap analysis.
3. Xung đột với domain hiện tại.
4. Đề xuất model/status cụ thể (bao gồm `CANCELLED`, `PENDING_MOVE`, `SupplementBatch`, `ACTIVE_SUPPLEMENT_STATUSES`).
5. Chi tiết thuật toán create/reuse/merge (theo mục 2–3 tài liệu này).
6. Chi tiết conflict resolution (theo mục 4–6 tài liệu này).
7. API cần sửa/thêm.
8. DB migration dự kiến (bắt buộc gồm 2 unique constraint riêng biệt:
   PRIMARY theo mục 3.1 và Supplement theo mục 3.2 — không gộp chung).
9. Test plan đầy đủ (mục 43 gốc + Case 17–28).
10. Implementation phases.
11. Danh sách file dự kiến thay đổi.
> **Dừng lại và chờ xác nhận trước khi bắt đầu implement.**
