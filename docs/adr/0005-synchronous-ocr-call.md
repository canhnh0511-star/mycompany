# Gọi Claude API (OCR) đồng bộ cho v1

Khi Admin upload ảnh phiếu, backend gọi Claude vision API để đọc dữ liệu. **Quyết định: gọi đồng bộ** — request HTTP từ frontend chờ tới khi Claude trả kết quả rồi response luôn, thay vì nhận ảnh → trả job id → frontend poll kết quả sau.

Lý do: đơn giản hơn nhiều để build và debug (không cần hàng đợi job, bảng trạng thái job, hay polling ở frontend); khối lượng ảnh xử lý đồng thời của một trại là thấp (không phải hệ thống nhiều người dùng cùng lúc), nên rủi ro timeout/nghẽn request ở v1 là chấp nhận được. Cần xem lại nếu thời gian phản hồi của Claude API gây timeout hoặc trải nghiệm xấu trong thực tế.
