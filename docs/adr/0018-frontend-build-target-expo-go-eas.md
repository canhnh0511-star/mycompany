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
