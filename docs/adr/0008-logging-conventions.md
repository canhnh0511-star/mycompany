# Logging: JSON có cấu trúc ra stdout + Request-ID xuyên suốt mỗi request

Chưa chốt nơi host backend, nhưng cần đảm bảo trace được lỗi ở production ngay từ v1 mà không phải thiết kế lại logging sau này.

**Quyết định:**
1. Log ở dạng **JSON có cấu trúc**, ghi ra **stdout** — không ghi file riêng, không phụ thuộc nơi host cụ thể.
2. Thêm 1 servlet filter sinh **Request/Correlation ID** (UUID) cho mỗi HTTP request, gắn vào SLF4J MDC và trả qua response header `X-Request-Id`.

**Lý do:** (1) hầu hết nền tảng hosting hiện đại tự động capture stdout, và JSON dễ cắm vào bất kỳ công cụ aggregate log nào sau này — không cần biết trước sẽ host ở đâu để chọn hướng này. (2) Request ID gần như không thể thêm "sạch" sau khi đã có nhiều code — phải rà lại toàn bộ log call để đảm bảo nằm trong đúng MDC scope; chi phí thêm ngay từ đầu gần như bằng 0 (1 filter) nhưng lợi ích trace lỗi rất lớn.

Xem quy ước log level chi tiết ở `CLAUDE.md` §7.
