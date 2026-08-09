# Wireframe (claude.ai/design) — 5 điểm layout/scope cần chốt, đã duyệt 2026-08-09

Wireframe mid-fidelity dựng ở claude.ai/design (10 màn hình: Đăng nhập, Chụp ảnh, Bảng review OCR, Nhập
tay nhanh, Tra cứu, Chi tiết record, Hồ sơ, Quản lý danh mục, Báo cáo, Theo dõi OCR) tự đánh dấu sẵn 5
điểm "cần chốt" (mỗi điểm đã có 1 lựa chọn mặc định ngay trong wireframe). Ghi lại quyết định ở đây để
`docs/TASKS.md`/`docs/frontend-grilling-plan.md` không phải lặp lại, và để feature code sau này tham
chiếu đúng 1 nguồn.

## 1. Bảng review OCR — route riêng full-screen hay modal/bottom-sheet?

**Quyết định:** route riêng full-screen (đúng theo wireframe). **Lý do:** review có sửa nhiều field (gõ
tay, chọn dropdown fuzzy-match) — chật nếu làm sheet nổi trên màn Chụp ảnh, nhất là trên điện thoại.

## 2. Tra cứu — danh sách dạng card hay bảng compact nhiều cột?

**Quyết định:** card (đúng theo wireframe). **Lý do:** phù hợp thao tác quét nhanh ngoài thực địa trên
điện thoại hơn bảng nhiều cột (CLAUDE.md §5 — Admin dùng tab Tra cứu chủ yếu bằng điện thoại).

## 3. Quản lý danh mục — 1 trang dùng chung rail con bên trái hay 5 route riêng có nav top?

**Quyết định:** 1 trang, rail con bên trái điều hướng giữa 5 danh mục (đúng theo wireframe) — khớp
`features/admin-catalog` đã scaffold (dùng chung layout dạng bảng, CLAUDE.md §5). **Lý do:** Admin hay
bấm qua lại giữa các danh mục lúc cấu hình đầu kỳ, rail con đỡ mất ngữ cảnh hơn 5 route rời rạc.

**Lưu ý triển khai:** `TeamsScreen` đã build (2026-08-09, xem TASKS.md) hiện là 1 route độc lập
(`app/(web)/admin-catalog/teams.tsx`) theo cấu trúc thư mục §3 gốc — CHƯA áp dụng layout rail con này.
Cần refactor khi build tiếp Employees/LatexTypes/RateConfigs/AllowanceConfigs: dựng 1 layout cha
`(web)/admin-catalog/_layout.tsx` với rail con, các resource còn lại là nội dung bên phải; cân nhắc gộp
lại `teams.tsx` vào layout mới cùng lúc để nhất quán, không để Teams lẻ loi 1 kiểu điều hướng khác.

## 4. Theo dõi OCR — có làm ở v1 không?

**Quyết định: CÓ, làm ở v1** (đã hỏi lại Admin 2026-08-09, khác với băn khoăn ban đầu trong wireframe).
**Lý do:** backend đã có sẵn `GET /ocr-call-logs` + `/stats` (Phase 4, xong 2026-08-07) — chỉ còn phần
frontend, không phát sinh việc backend mới. Thêm vào kế hoạch Tuần 6 (cùng đợt với Báo cáo) trong
`docs/TASKS.md`.

## 5. Báo cáo — chỉ bảng số liệu hay có thêm biểu đồ tổng hợp theo tháng?

**Quyết định: chỉ bảng ở v1** (đã hỏi lại Admin 2026-08-09, đúng theo mặc định wireframe). **Lý do:** đúng
tinh thần ưu tiên must-have trước polish (CLAUDE.md §9) — biểu đồ tốn công dựng hơn nhiều so với bảng, để
lại sau khi có dữ liệu thật để biết cần biểu đồ dạng gì. Không chặn việc thêm sau này (không phải quyết
định one-way).
