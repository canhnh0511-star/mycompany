# features/attendance-records

Công/chuyên cần theo ngày — nhập tay ghi thẳng `status=confirmed` (không qua draft, khác OCR flow của
2 feature kia).

- [x] **Nhập tay nhanh** (`api.ts`, `useAttendanceRecordsBatch.ts`, `QuickEntryForm.tsx`, 2026-08-10) —
  data shape khác hẳn production-records/latex-sales (không có danh sách loại mủ, mỗi dòng chỉ 1
  `attendanceType` + `quantity`) nên KHÔNG dùng chung layout multi-item, nhưng vẫn cùng tinh thần
  ADR-0007/ADR-0013 (batch best-effort, react-hook-form + useFieldArray). 4 loại: `TAPPING_WORK`
  (công xã miệng), `ATTENDANCE` (chuyên cần), `STORM_ALLOWANCE` (trợ cấp mưa bão), `MEDICATION` (bôi
  thuốc) — `lighting` (tiền đèn) cố ý KHÔNG có, là phụ cấp cố định/tháng (CLAUDE.md §4). Route:
  `app/(tabs)/quick-entry/index.tsx` (tab "Chuyên cần").
- [ ] Tra cứu/chi tiết record — chưa build (Tuần 5).
