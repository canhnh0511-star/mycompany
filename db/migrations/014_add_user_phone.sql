-- Cho phép đăng nhập/định danh bằng Số điện thoại (mục "API còn thiếu #1",
-- docs/plans/0022-profile-8-screens-plan.md). Nullable + UNIQUE: dữ liệu cũ (admin seed qua email) không
-- có SĐT, không backfill suy diễn; ràng buộc UNIQUE chỉ áp dụng khi có giá trị (Postgres cho phép nhiều
-- NULL cùng lúc trong cột UNIQUE).
ALTER TABLE users ADD COLUMN phone VARCHAR(15) UNIQUE;
