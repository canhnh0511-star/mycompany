# features/latex-sales

Bán mủ theo TỔ (không có `employee_id` — chỉ `buyer_name`/`seller_signed_by` text, CLAUDE.md §4).

- [x] **Nhập tay nhanh** (`api.ts`, `useLatexSalesBatch.ts`, `QuickEntryForm.tsx`, 2026-08-09) — cùng
  pattern với `features/production-records/QuickEntryForm.tsx` (react-hook-form + `useFieldArray`,
  ADR-0013), khác ở chỗ chọn Tổ thay vì Nhân viên + có `buyerName`/`sellerSignedBy` text. Route:
  `app/(tabs)/quick-entry/index.tsx` (tab "Bán mủ").
- [ ] Bảng review OCR (ADR-0012) — chưa build, chờ `features/ocr-capture`.
- [ ] Tra cứu/chi tiết record — chưa build (Tuần 5).
