# features/latex-sales

Bán mủ theo TỔ (không có `employee_id` — chỉ `buyer_name`/`seller_signed_by` text, CLAUDE.md §4).

- [x] **Nhập tay nhanh** (`api.ts`, `useLatexSalesBatch.ts`, `QuickEntryForm.tsx`, 2026-08-09) — cùng
  pattern với `features/production-records/QuickEntryForm.tsx` (react-hook-form + `useFieldArray`,
  ADR-0013), khác ở chỗ chọn Tổ thay vì Nhân viên + có `buyerName`/`sellerSignedBy` text. Route:
  `app/(tabs)/quick-entry/index.tsx` (tab "Bán mủ").
- [x] Batch Review (0021-scan-batch-model, 2026-08-22) — build ở `features/ocr-capture/BatchReviewScreen.tsx`
  (dùng chung với production-records), `api.ts` thêm `update()`/`confirm()`.
- [x] Tra cứu/chi tiết record (2026-08-10) — `api.ts` thêm `list()`/`get()`/`cancel()`,
  `useLatexSalesList.ts`. UI ở `features/lookup/` (dùng chung với production-records).
