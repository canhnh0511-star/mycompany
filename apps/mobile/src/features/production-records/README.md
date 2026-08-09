# features/production-records

Sản lượng CÁ NHÂN theo ngày (CLAUDE.md §4).

- [x] **Nhập tay nhanh** (`api.ts`, `useProductionRecordsBatch.ts`, `QuickEntryForm.tsx`, 2026-08-09) —
  react-hook-form + `useFieldArray` cho rows (ADR-0013), mỗi dòng render field theo TOÀN BỘ danh mục
  `LatexType` đã fetch (không hardcode 4 loại — danh mục MỞ, ADR-0002). Validate rẻ ở client (nhân viên
  bắt buộc, ≥1 loại mủ > 0/dòng); lỗi từ `BatchResult` map ngược theo `index` vào đúng dòng
  (`submitStatus`/`submitError`), không alert chung. Route: `app/(tabs)/quick-entry/index.tsx` (tab
  "Sản lượng").
- [ ] Bảng review OCR (ADR-0012) — chưa build, chờ `features/ocr-capture`.
- [ ] Tra cứu/chi tiết record — chưa build (Tuần 5).
