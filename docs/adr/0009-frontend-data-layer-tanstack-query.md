# Frontend: TanStack Query + apiClient tập trung xử lý 401

Frontend cần cache/retry/dedupe cho các lời gọi GET (list/filter/report), và một điểm xử lý nhất quán cho
lỗi xác thực — thay vì mỗi màn hình tự try/catch riêng.

**Quyết định:** dùng **TanStack Query** (`@tanstack/react-query`) cho toàn bộ GET (list/filter/report —
có cache, refetch, retry tự nhiên, hợp với UX "mất mạng thực địa" ở CLAUDE.md §9) và cho mutation
(POST/PATCH batch, OCR capture, confirm) qua `useMutation`, invalidate query liên quan sau khi thành
công. Toàn bộ request đi qua 1 `apiClient` mỏng dựng trên `fetch` (không dùng axios) — gắn
`Authorization` header, và là **điểm duy nhất** xử lý 401: bất kỳ response 401 nào → clear token (xem
ADR-0010), điều hướng về màn login, hiện toast "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại". Không
mất dữ liệu đã lưu trước đó vì luồng OCR ghi draft ngay theo ADR-0006 — chỉ ảnh đang xử lý dở khi 401 xảy
ra mới cần chụp lại.

**Lý do:** TanStack Query là pattern chuẩn cho RN+web, tránh tự viết cache/retry tay; tập trung xử lý 401
ở 1 chỗ tránh rải rác/thiếu sót ở từng màn hình gọi API riêng lẻ.

**Hệ quả:** mọi lời gọi API trong `features/*` phải đi qua `lib/api/client.ts`, không gọi `fetch` trực
tiếp rải rác trong component.
