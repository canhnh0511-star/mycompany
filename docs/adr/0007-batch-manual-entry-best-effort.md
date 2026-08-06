# Nhập liệu thủ công dạng batch, xử lý best-effort theo từng dòng

Form nhập tay hỗ trợ "nhanh, nhiều dòng/tổ/ngày" (CLAUDE.md §1), cho cả `production_records` và `latex_sales`.

**Quyết định:** API nhận 1 request dạng mảng nhiều dòng (`POST .../batch`), xử lý **best-effort theo từng dòng** — dòng nào lỗi (vd trùng `UNIQUE(record_date, employee_id)`, validation fail) thì dòng đó fail, các dòng khác trong cùng request vẫn được lưu bình thường; không rollback toàn bộ vì 1 dòng lỗi. Response trả về mảng kết quả `{index, success, error?}` để frontend highlight đúng dòng lỗi mà không mất các dòng đã nhập đúng.

**Lý do:** tốc độ nhập là mục tiêu chính của form này (Admin có thể gõ 20–30 dòng/lần) — rollback toàn bộ vì 1 lỗi nhỏ sẽ buộc Admin gõ lại từ đầu, phản tác dụng.
