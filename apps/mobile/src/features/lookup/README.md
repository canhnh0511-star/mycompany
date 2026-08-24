# features/lookup

Trước đây là tab "Tra cứu" (browse phẳng production_records/latex_sales kể cả DRAFT, filter loại
phiếu/Tổ/status/khoảng ngày). **`LookupScreen.tsx` đã bị XÓA (Phase 5, 2026-08-24)** — tab "Sản lượng"
giờ dùng `features/production-summary/ProductionSummaryScreen.tsx` (dashboard tổng hợp Official
Production theo Spec 2, docs/specs/spec-2-san-luong-v2.md), không còn cho browse DRAFT ở đây nữa (xem
javadoc ProductionSummaryScreen — DRAFT giờ chỉ xem/sửa qua luồng "Phiếu"). 2 màn dưới đây vẫn còn dùng
— `record-detail` là route CHUNG cho drill-down từ cả Batch Review lẫn Sản lượng v2:

- [x] **ProductionRecordDetailScreen.tsx** + **LatexSaleDetailScreen.tsx** (2026-08-10) — route riêng
  full-screen (`app/record-detail/production/[id].tsx`, `app/record-detail/latex-sale/[id].tsx`): ảnh
  gốc (nếu có), bảng khối lượng theo loại mủ + tổng, ghi chú, Hủy bản ghi (2 bước xác nhận, không hard
  delete — CLAUDE.md §4), lịch sử chỉnh sửa (`edit_history`, `EditHistoryTableName` khớp
  `EditHistoryService.VALID_TABLE_NAMES` ở backend).
- [x] Xem chi tiết `oldData`/`newData` của từng lần sửa (2026-08-10) — chốt hiện dạng **diff**
  (`features/edit-history/diff.ts`: `diffSnapshots()` so sánh field-by-field + `items[]` theo
  `latexTypeCode`, chỉ hiện field thực sự đổi, dạng "Nhãn: trước → sau"). Bỏ field không có ý nghĩa với
  người xem (id/createdBy/createdAt/ocrCallLogId/photoUrl/status).
