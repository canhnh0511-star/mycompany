# features/production-records

Sản lượng CÁ NHÂN theo ngày (CLAUDE.md §4).

- [x] **Nhập tay nhanh** (`api.ts`, `useProductionRecordsBatch.ts`, `QuickEntryForm.tsx`, 2026-08-09) —
  react-hook-form + `useFieldArray` cho rows (ADR-0013), mỗi dòng render field theo TOÀN BỘ danh mục
  `LatexType` đã fetch (không hardcode 4 loại — danh mục MỞ, ADR-0002). Validate rẻ ở client (nhân viên
  bắt buộc, ≥1 loại mủ > 0/dòng); lỗi từ `BatchResult` map ngược theo `index` vào đúng dòng
  (`submitStatus`/`submitError`), không alert chung. Route: `app/(tabs)/quick-entry/index.tsx` (tab
  "Sản lượng").
- [x] Bảng review OCR (ADR-0012, 2026-08-10) — build ở `features/ocr-capture/OcrReviewScreen.tsx`
  (dùng chung với latex-sales), `api.ts` thêm `update()`/`confirm()`.
- [x] Tra cứu/chi tiết record (2026-08-10) — `api.ts` thêm `list()`/`get()`/`cancel()`,
  `useProductionRecordsList.ts`. UI ở `features/lookup/` (dùng chung với latex-sales).
