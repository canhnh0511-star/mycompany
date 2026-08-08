# Frontend: lưu JWT — SecureStore trên native, localStorage trên web

`expo-secure-store` không chạy trên web, nhưng app phải chạy được cả web (CLAUDE.md §3) — cần 1 chiến
lược lưu token hoạt động trên cả 2 nền tảng.

**Quyết định:** abstraction `lib/auth/tokenStorage.ts` — native dùng `expo-secure-store`, web dùng
`localStorage`. Chấp nhận rủi ro XSS ở nhánh web thấp hơn mức cần lo ở v1, vì: chỉ 1 vai trò Admin đăng
nhập (ADR-0001), token hết hạn ngắn — 1 ngày, không refresh (ADR-0004), và app không render lại nội dung
HTML từ input người dùng khác.

**Lý do:** không có lựa chọn "an toàn tuyệt đối" nào chạy được trên cả native lẫn web trong Expo managed
workflow ở v1 — đây là đánh đổi có chủ đích, không phải bỏ sót.

**Hệ quả:** nếu sau này mở thêm vai trò đăng nhập khác (Tổ trưởng — release sau, ADR-0001) hoặc thêm nội
dung do người dùng khác nhập được render lại trên web, cần đánh giá lại rủi ro XSS của nhánh `localStorage`
này.
