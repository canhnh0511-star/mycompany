# Mycompany — Quản lý chi phí / sản lượng trại cao su

Hệ thống số hóa quản lý chi phí và sản lượng cho trại cạo mủ cao su, thay thế sổ ghi tay (sổ ghi mủ, sổ bán mủ) và bảng lương Excel hiện tại.

## Language

**Tổ (Team)**:
Đơn vị tổ chức gồm nhiều công nhân cạo mủ, do một Tổ trưởng phụ trách. Sản lượng cá nhân và bán mủ đều được ghi nhận theo Tổ.

**Tổ trưởng (Team Lead)**:
Người phụ trách một Tổ. Vừa là một `User` tiềm năng (vai trò `team_lead`, đăng nhập hệ thống — tính năng của release sau) vừa là một `Employee` trên thực tế, vì họ trực tiếp cạo mủ và có sản lượng riêng như công nhân khác.
_Avoid_: coi Tổ trưởng thuần túy là người quản lý không cạo mủ.

**Employee (Công nhân)**:
Người trực tiếp cạo mủ, sản lượng được ghi vào `production_records`. Không nhất thiết có tài khoản đăng nhập (`User`).

**User**:
Tài khoản đăng nhập hệ thống, vai trò `team_lead` hoặc `admin`. Ở Module 1 release 1, chỉ vai trò `admin` thực sự thao tác trên app.
_Avoid_: đồng nhất User với Employee — hai khái niệm tách biệt, chỉ giao nhau khi một Tổ trưởng vừa có tài khoản vừa là công nhân cạo mủ.

**Admin**:
Vai trò duy nhất thao tác thực tế trên hệ thống ở release 1 — nhập liệu (form/ảnh) hộ cho tất cả các Tổ, xác nhận dữ liệu OCR, xuất báo cáo. Thay thế vai trò "người số hóa sổ giấy".

**Loại mủ (Latex Type)**:
Danh mục mở (`latex_types`) — hiện có 4 loại: mủ nước, mủ chén, mủ dây, mủ đông. Không được giả định là cố định vĩnh viễn; khối lượng theo loại mủ lưu ở bảng con tham chiếu `latex_type_id`, không phải cột cố định trên bảng cha.
_Avoid_: hardcode tên loại mủ thành cột riêng (`water_kg`, `cup_kg`, ...).

**DRC (Dry Rubber Content — hàm lượng cao su khô)**:
Tỷ lệ % cao su khô, chỉ đo cho mủ nước (mủ tươi vừa cạo, đo bằng tỷ trọng kế). Không đo DRC cho mủ chén/dây/đông (mủ đã đông từ trước).
_Avoid_: coi DRC là thuộc tính của cả bản ghi sản lượng/bán mủ nói chung — nó chỉ gắn với dòng mủ nước.
