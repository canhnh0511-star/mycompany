# OCR ghi draft row ngay khi gọi, không giữ ở client

CLAUDE.md §5 (bản gốc) mô tả — theo đúng câu chữ — chỉ có 1 lần ghi DB, xảy ra khi Admin bấm "Lưu" ở cuối luồng OCR, ghi thẳng `status = confirmed`. Điều này mâu thuẫn với việc `production_records`/`latex_sales` đã có sẵn trạng thái `draft` dành riêng cho luồng OCR (đã xác nhận trong buổi grilling DB).

**Quyết định:** Khi backend gọi Claude API và nhận kết quả, ghi **ngay** (các) row `production_records`/`latex_sales` với `status = draft` kèm `photo_url` — 1 ảnh phiếu có thể tạo nhiều draft row nếu có nhiều nhân viên trên cùng 1 phiếu. Frontend hiển thị bảng sửa được, đọc trực tiếp từ các draft row này (không phải state tạm ở client). Admin sửa bằng `PATCH` lên draft row — có thể làm nhiều lần, bỏ dở rồi quay lại sau. Bấm "Lưu" → `PATCH` đổi `status` → `confirmed`.

**Lý do:** khớp đúng ý nghĩa của `draft` đã có sẵn trong schema; chống mất dữ liệu nếu Admin bị gián đoạn (mất mạng, thoát app) sau khi đã chụp nhiều ảnh nhưng chưa kịp xác nhận hết.
