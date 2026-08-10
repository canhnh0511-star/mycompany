# features/ocr-capture

Luồng Chụp ảnh/OCR (CLAUDE.md §5, ADR-0005, ADR-0006, ADR-0011).

- [x] **Chụp ảnh** (2026-08-09) — `CaptureScreen.tsx` (seg control Sổ ghi mủ/Sổ bán mủ, chip Tổ đang làm
  việc + "Đổi Tổ" qua `store.ts` Zustand không persist, `expo-camera` viewfinder + shutter, `expo-image-
  picker` chọn nhiều ảnh thư viện). `useOcrQueue.ts` — hàng đợi trong bộ nhớ `uploading → processing →
  done/error`, semaphore tối đa 2 xử lý song song (ADR-0011). `api.ts` — `POST /ocr/upload-url` → PUT
  thẳng Supabase Storage (không qua backend) → `POST /ocr/capture`. Banner lỗi/`type_mismatch` không
  chặn thao tác tiếp (đóng được, hiện dưới dạng đếm số ảnh lỗi + thông báo mới nhất).
- [x] **Bảng review OCR** (2026-08-10, ADR-0012) — `OcrReviewScreen.tsx`, route riêng full-screen
  `app/ocr-review/[logId].tsx` (ADR-0019 mục 1, KHÔNG modal). Đọc TRỰC TIẾP từ response `capture` qua
  `reviewStore.ts` (Zustand — route param URL không mang được object, chỉ truyền `ocrCallLogId`; mất
  entry ở đây do app bị kill không mất dữ liệu, draft vẫn nằm trên server, ADR-0006). Sửa item/notes rồi
  bấm "Lưu tất cả" → PATCH aggregate + POST confirm từng dòng (không gom batch — sửa aggregate ĐÃ TỒN
  TẠI, khác Phase 2). Highlight `lowConfidenceFields` (parse JSON `{"fields":[...]}`, hiển thị ở mức
  DÒNG — khớp granularity backend trả). `unmatchedLines` hiện banner hướng Admin sang tab Nhập tay nhanh
  (KHÔNG có UI chọn nhân viên thủ công ngay tại đây ở v1 — xử lý qua batch endpoint sẵn có). Nút "Xem
  lại" xuất hiện ở hàng đợi Chụp ảnh khi item `done`.
  **Cần `ANTHROPIC_API_KEY` thật + test trên thiết bị thật để verify end-to-end** (xem `docs/TASKS.md`
  Phase 3 — vẫn treo) — chưa test được với data thật, chỉ verify build/type qua `tsc`/`expo export`.
- [ ] Crop thủ công đơn giản qua `expo-image-manipulator` (Admin tự kéo khung, ADR-0011) — CHƯA build,
  ảnh hiện gửi thẳng nguyên gốc lên OCR.
