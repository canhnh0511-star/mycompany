# Route-guard theo role trên frontend — tối thiểu ở v1

Release 1 chỉ vai trò Admin thực sự đăng nhập (ADR-0001) — cần chốt frontend có viết logic ẩn/hiện màn
hình theo `role` ngay từ đầu hay không.

**Quyết định:** đọc `role` từ `LoginResponse`/`GET /users/me` và lưu trong auth store qua 1 hook
`useAuth()`, nhưng **KHÔNG viết logic ẩn/hiện theo `team_lead`** ở v1 (chưa có ai đăng nhập bằng role đó).
Tổ chức code sao cho thêm 1 role sau này chỉ cần thu hẹp qua `useAuth()` ở đúng những nơi cần, không phải
viết lại route/layout từ đầu.

**Lý do:** khớp tinh thần ADR-0001 ("không cần viết lại code khi mở tính năng release sau") mà không tốn
công xây route-guard cho 1 use case chưa tồn tại ở v1.
