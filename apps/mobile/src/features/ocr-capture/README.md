# features/ocr-capture

Luồng Chụp ảnh/OCR (CLAUDE.md §5, ADR-0005, ADR-0006, ADR-0011).

- [x] **Chụp ảnh** (2026-08-09) — `CaptureScreen.tsx` (seg control Sổ ghi mủ/Sổ bán mủ, chip Tổ đang làm
  việc + "Đổi Tổ" qua `store.ts` Zustand không persist, `expo-camera` viewfinder + shutter, `expo-image-
  picker` chọn nhiều ảnh thư viện). `useOcrQueue.ts` — hàng đợi trong bộ nhớ `uploading → processing →
  done/error`, semaphore tối đa 2 xử lý song song (ADR-0011). `api.ts` — `POST /ocr/upload-url` → PUT
  thẳng Supabase Storage (không qua backend) → `POST /ocr/capture`. Banner lỗi/`type_mismatch` không
  chặn thao tác tiếp (đóng được, hiện dưới dạng đếm số ảnh lỗi + thông báo mới nhất).
  **Cần `ANTHROPIC_API_KEY` thật ở backend để test end-to-end** (xem `docs/TASKS.md` Phase 3 — vẫn treo).
  Chưa test được trên thiết bị thật (camera/thư viện cần build native, không chạy hết trong Expo Go tuỳ
  quyền hệ điều hành — cần verify khi có thiết bị).
- [ ] Crop thủ công đơn giản qua `expo-image-manipulator` (Admin tự kéo khung, ADR-0011) — CHƯA build,
  ảnh hiện gửi thẳng nguyên gốc lên OCR.
- [ ] Bảng review OCR (đọc từ response `capture`, ADR-0012) — CHƯA build, đây là màn tiếp theo sau khi
  1 ảnh xử lý xong (`status: 'done'`), điều hướng từ item trong hàng đợi.
