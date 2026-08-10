# features/lookup

Tab "Tra cứu" — layout dạng card (ADR-0019 mục 2). Gộp chung Sản lượng cá nhân + Bán mủ theo Tổ trong 1
danh sách theo ngày (KHÔNG gộp attendance-records — wireframe chỉ có 2 loại phiếu ở đây).

- [x] **LookupScreen.tsx** (2026-08-10) — filter loại phiếu (Tất cả/Sổ ghi mủ/Sổ bán mủ), Tổ, status
  (Tất cả/Nháp/Đã xác nhận/Đã hủy — mặc định Tất cả, kể cả `DRAFT` theo CLAUDE.md §5), khoảng ngày (input
  text `yyyy-mm-dd`, chưa có date picker library). Card tap → điều hướng `record-detail`.
- [x] **ProductionRecordDetailScreen.tsx** + **LatexSaleDetailScreen.tsx** (2026-08-10) — route riêng
  full-screen (`app/record-detail/production/[id].tsx`, `app/record-detail/latex-sale/[id].tsx`): ảnh
  gốc (nếu có), bảng khối lượng theo loại mủ + tổng, ghi chú, Hủy bản ghi (2 bước xác nhận, không hard
  delete — CLAUDE.md §4), lịch sử chỉnh sửa (`edit_history`, `EditHistoryTableName` khớp
  `EditHistoryService.VALID_TABLE_NAMES` ở backend).
- [x] Xem chi tiết `oldData`/`newData` của từng lần sửa (2026-08-10) — chốt hiện dạng **diff**
  (`features/edit-history/diff.ts`: `diffSnapshots()` so sánh field-by-field + `items[]` theo
  `latexTypeCode`, chỉ hiện field thực sự đổi, dạng "Nhãn: trước → sau"). Bỏ field không có ý nghĩa với
  người xem (id/createdBy/createdAt/ocrCallLogId/photoUrl/status).
