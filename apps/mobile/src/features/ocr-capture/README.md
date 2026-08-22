# features/ocr-capture

Luồng Chụp ảnh/OCR (CLAUDE.md §5, ADR-0005, ADR-0006, ADR-0011).

- [x] **Chụp ảnh** (2026-08-09, viết lại 2026-08-22 theo 0021-scan-batch-model) — `CaptureScreen.tsx`
  (seg control Sổ ghi mủ/Sổ bán mủ, `sessionWorkDate` + Tổ BẮT BUỘC cho cả 2 loại phiếu qua `store.ts`
  Zustand không persist, `expo-camera` viewfinder + shutter, `expo-image-picker` chọn nhiều ảnh thư
  viện). Gọi `GET /scan-batches/lookup` trước khi mở camera — chặn tại chỗ nếu key
  (documentType+teamId+workDate) đang FAILED/APPROVED. `useOcrQueue.ts` — hàng đợi trong bộ nhớ
  `uploading → processing → done/error`, semaphore tối đa 2 xử lý song song (ADR-0011), mỗi ảnh sinh
  `clientImageId` gửi kèm `POST /scan-batches/images` (thay `POST /ocr/capture` cũ), trả về TOÀN BỘ
  `ScanBatchResponse`. Banner lỗi/`type_mismatch` không chặn thao tác tiếp.
- [x] **Batch Review** (2026-08-22, ADR-0021, thay thế "Bảng review OCR"/`OcrReviewScreen.tsx` cũ) —
  `BatchReviewScreen.tsx`, route riêng full-screen `app/scan-batch-review/[batchId].tsx` (ADR-0019 mục
  1, KHÔNG modal). Đọc TRỰC TIẾP từ `GET /scan-batches/{id}` (ảnh + conflict, sort theo `displayOrder`
  backend trả) + `GET production-records|latex-sales?scanBatchId=` cho draft record thật (ADR-0012 —
  không state tạm client). Banner FAILED/PARTIAL_FAILED có [Thử lại]/[Hủy phiên]. Mỗi loại conflict có
  hành động riêng (DATE_MISMATCH → giữ/đổi ngày, UNKNOWN_EMPLOYEE → chọn nhân viên, còn lại →
  OVERRIDE/DISCARD). Sửa kg/DRC từng dòng (chỉ ô OCR không chắc mới cho sửa, cùng pattern bảng cũ) rồi
  "Lưu" từng dòng (PATCH aggregate riêng, không đổi status). Nút "Xác nhận dữ liệu" ở cuối gọi
  `POST /scan-batches/{id}/approve` (bulk-approve cả batch) — gate theo `canApprove` backend tính sẵn.
  **Chưa test trên thiết bị thật với `ANTHROPIC_API_KEY` thật/data thật** — chỉ verify build/type qua
  `tsc`.
- [ ] Crop thủ công đơn giản qua `expo-image-manipulator` (Admin tự kéo khung, ADR-0011) — CHƯA build,
  ảnh hiện gửi thẳng nguyên gốc lên OCR.
