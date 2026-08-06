-- =====================================================================
-- Seed tài khoản Admin đầu tiên cho release 1 (Admin-only — docs/adr/0001-admin-only-v1-scope.md)
-- Không có endpoint đăng ký công khai (docs/adr/0004-auth-simplified-for-v1.md) — đây là cách DUY NHẤT
-- để có tài khoản đầu tiên đăng nhập; Admin tiếp theo tạo qua API nội bộ sau khi đã đăng nhập.
--
-- crypt(..., gen_salt('bf', 10)) sinh bcrypt hash tương thích với Spring Security BCryptPasswordEncoder
-- (cùng thuật toán $2a$) — pgcrypto đã bật sẵn từ 001_init_schema.sql.
--
-- ĐỔI MẬT KHẨU NÀY NGAY SAU LẦN ĐĂNG NHẬP ĐẦU TIÊN Ở MỌI MÔI TRƯỜNG NGOÀI LOCAL DEV.
-- =====================================================================

INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES (
    'Admin',
    'admin@mycompany.local',
    crypt('changeme123!', gen_salt('bf', 10)),
    'admin',
    true
);
