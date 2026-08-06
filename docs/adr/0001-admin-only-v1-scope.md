# Release 1: chỉ Admin thao tác hệ thống, Tổ trưởng chưa đăng nhập

Bảng phân quyền ban đầu (CLAUDE.md mục 2) cho Tổ trưởng quyền nhập liệu (form/ảnh) trực tiếp cho tổ mình. Tuy nhiên, ở **Module 1 release 1**, chỉ vai trò **Admin** thực sự thao tác trên ứng dụng — Admin nhập liệu (form/ảnh) và xác nhận OCR **hộ cho tất cả các Tổ**, thay thế vai trò "người số hóa sổ giấy" mà Admin vốn đã làm thủ công. Tổ trưởng tiếp tục ghi sổ giấy tay như hiện tại; việc đăng nhập và tự nhập liệu của Tổ trưởng là tính năng của **release sau**, chưa thuộc phạm vi Module 1 lần 1.

Lý do: thu hẹp phạm vi để release v1 nhanh hơn với bề mặt auth/phân quyền đơn giản hơn (chỉ một vai trò thực sự hoạt động), trong khi schema (`users.role` đã có `team_lead`) và code không cần viết lại khi mở tính năng này ở release sau.

**Hệ quả liên quan:** vì Tổ trưởng vẫn trực tiếp cạo mủ, họ vẫn cần một dòng `employees` cho sản lượng riêng của mình — sẽ thêm `employees.user_id` (nullable FK) để nối `User` (khi Tổ trưởng có tài khoản) với `Employee` tương ứng.
