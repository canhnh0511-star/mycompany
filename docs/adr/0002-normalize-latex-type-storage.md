# Chuẩn hóa lưu trữ khối lượng theo loại mủ ngay từ release 1

`production_records` và `latex_sales` ban đầu dùng cột cố định (`water_kg`, `cup_kg`, `strip_kg`, `coagulated_kg`) cho từng loại mủ, dù `latex_types` đã là bảng danh mục. Cách này đã gây ra ít nhất một lỗi thực tế: `latex_sales` bị thiếu `coagulated_kg` so với `production_records` — hệ quả trực tiếp của việc phải đồng bộ cột cố định thủ công giữa nhiều bảng.

**Quyết định:** chuẩn hóa thành bảng con `production_record_items (production_record_id, latex_type_id, kg, drc_percent)` và `latex_sale_items (latex_sale_id, latex_type_id, kg, drc_percent)`, tham chiếu `latex_types`, thay cho cột cố định trên `production_records`/`latex_sales`. `drc_percent` chỉ có giá trị khi `latex_type = water` (DRC chỉ đo cho mủ nước, theo xác nhận nghiệp vụ).

**Lý do:** 4 loại mủ hiện tại cố định nhưng không đảm bảo vĩnh viễn. Chuẩn hóa ngay từ release 1 — trước khi có dữ liệu sản xuất thật — rẻ hơn nhiều so với migrate schema và viết lại query/report/form sau khi hệ thống đã vận hành. Đồng thời loại bỏ tận gốc lớp lỗi "thiếu cột" đã gặp ở `latex_sales`, và áp dụng nhất quán một mô hình cho cả 2 luồng nghiệp vụ (sản lượng cá nhân + bán mủ theo Tổ).

**Hệ quả:** `production_records`/`latex_sales` trở thành bảng "header" (ngày, nhân viên/tổ, trạng thái, nguồn dữ liệu, ảnh gốc...); mọi khối lượng theo loại mủ nằm ở bảng con. Form nhập liệu, mapping kết quả OCR, và báo cáo tổng hợp cần join qua `latex_type_id` thay vì đọc cột trực tiếp.
