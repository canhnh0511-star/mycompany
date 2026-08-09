# Build/deploy target frontend — Expo Go trước, EAS Build khi cần cài thật

Cần chốt dùng Expo Go suốt quá trình dev hay cần custom dev client ngay từ đầu, và deploy mobile/web bằng
gì.

**Quyết định:** vì ADR-0011 chọn bỏ document-scanner native module, **Expo Go đủ dùng** cho suốt Phase
1–2 (form + camera cơ bản qua `expo-camera`/`expo-image-picker`, cả hai chạy được Expo Go). Khi cần build
thật để cài lên điện thoại Admin dùng thực địa (ngoài Expo Go), dùng **EAS Build** — không tự setup
native toolchain (Xcode/Android Studio) thủ công. Deploy web (`expo export --platform web` ra static
site) — **nơi host chưa chốt**, quyết định khi tới phase báo cáo/web vì chưa cấp thiết ở tuần 1–2.

**Lý do:** giữ vòng lặp dev nhanh nhất có thể ở giai đoạn đầu (Expo Go không cần build); EAS Build tránh
phải tự quản lý pipeline build native khi cần bản cài thật.

**Cập nhật (2026-08-09) — chốt SDK 54, không dùng 57:** scaffold ban đầu tạo bằng SDK 57 (npm registry
đã publish `expo@57.0.11` ổn định), nhưng **Expo Go client hiện tại chưa hỗ trợ SDK 57** — publish trên
npm không đồng nghĩa app Expo Go (bản cài trên điện thoại Admin) đã cập nhật theo kịp, và ADR này đã
chọn Expo Go làm kênh dev chính. Đã hạ toàn bộ `expo`/`expo-*` trong `apps/mobile/package.json` về
**SDK 54** (`npx expo install --fix` tự chỉnh version từng package con khớp SDK) để không bị chặn dev
bằng Expo Go. Khi Expo Go cập nhật hỗ trợ SDK mới hơn, cân nhắc nâng lại — không có gì trong code phụ
thuộc cứng vào số SDK cụ thể.
