# Tải file export (Excel/PDF) — khác nhau theo nền tảng

Endpoint export (`/reports/.../export/xlsx`|`pdf`) trả file nhị phân trực tiếp từ backend. Web có cơ chế
download built-in của trình duyệt; native (Expo) thì không có "Downloads" mặc định tương đương.

**Quyết định:** web dùng blob URL + `<a download>`. Native dùng `expo-file-system` (`downloadAsync`) tải
file về sandbox của app, rồi `expo-sharing` (`shareAsync`) mở share sheet hệ điều hành (lưu vào
Files/gửi Zalo/in...). Vì báo cáo chủ yếu dùng ở web/tablet (CLAUDE.md §5), nhánh native chỉ cần làm
best-effort, không phải ưu tiên polish.

**Lý do:** không có 1 API filesystem "Downloads" dùng chung được giữa web và native trong Expo — tách
nhánh theo platform (`Platform.OS`) là cách đơn giản nhất, không cần kéo thêm thư viện trừu tượng hóa
download phức tạp cho use case phụ.
