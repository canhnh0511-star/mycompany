# features/reports

2 báo cáo JSON (sản lượng cá nhân, bán mủ theo Tổ) + export Excel/PDF — chỉ tính CONFIRMED. Tải file
khác nhau theo platform (docs/adr/0014-report-export-delivery-per-platform.md, `lib/api/download.ts`).
Chỉ bảng số liệu ở v1, không biểu đồ (ADR-0019 mục 5). Route: `(web)/reports/_layout.tsx` (rail con,
cùng pattern admin-catalog) + `production-records.tsx`/`latex-sales.tsx`/`ocr-monitoring.tsx` (feature
thật ở `features/ocr-monitoring/`, gộp chung rail vì cùng nhóm "Báo cáo & theo dõi").
