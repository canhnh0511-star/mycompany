# Auth đơn giản hóa cho v1: access-token 1 ngày, không refresh token, tài khoản Admin seed sẵn

Vì release 1 chỉ có Admin (1–2 tài khoản nội bộ, xem `docs/adr/0001-admin-only-v1-scope.md`) thao tác hệ thống, auth được đơn giản hóa tối đa cho v1:

- **JWT chỉ có access token**, hết hạn sau 1 ngày — không có refresh token. Khi hết hạn, người dùng đăng nhập lại.
- **Không có endpoint đăng ký công khai** (`POST /auth/register`). Tài khoản Admin được seed sẵn qua migration (Flyway). Muốn thêm Admin mới, một Admin đã đăng nhập gọi API nội bộ để tạo — không có luồng self-service signup.

Lý do: rủi ro bảo mật của "phải đăng nhập lại mỗi ngày, không refresh token" và "không cho tự đăng ký" là chấp nhận được với một nhóm nhỏ người dùng nội bộ đã biết trước — đổi lại giảm đáng kể lượng code auth cần viết cho v1. Đây là điểm cần xem lại nếu/khi Tổ trưởng được cấp quyền đăng nhập ở release sau (nhiều tài khoản hơn, ít kiểm soát trực tiếp hơn).
