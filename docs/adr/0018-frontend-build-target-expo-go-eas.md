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

## Cập nhật 2026-08-11 — chuyển sang EAS dev client (điểm "cần cài thật" đã tới)

Expo Go trên App Store chưa hỗ trợ SDK 57 (Expo package hiện tại của app, `apps/mobile/package.json`) —
không mở được app qua Expo Go trên iPhone thật nữa để test Face ID/camera OCR/share sheet export (đều
là tính năng native, không test được trên web). Trước đó (2026-08-09) từng thử hạ SDK 57→54 cho khớp
Expo Go nhưng bị revert lại 4 phút sau (không ghi lý do), nên lần này KHÔNG lặp lại hướng hạ SDK — đi
thẳng theo đúng nhánh đã chốt sẵn ở trên: build **EAS dev client** (`expo-dev-client`, đã cài), không
phụ thuộc Expo Go nữa.

- `apps/mobile/eas.json` (mới) — profile `development` (`developmentClient: true`, `distribution:
  internal`, `ios.simulator: false` — build cho thiết bị thật, không phải Simulator).
- `apps/mobile/scripts/eas-dev-client-setup.sh` (mới, wizard) — dẫn qua các bước CHỈ người dùng tự làm
  được (đăng nhập Expo, kiểm tra/đăng ký Apple Developer Program — bắt buộc trả phí để cài ad-hoc lên
  thiết bị thật, đăng ký UDID iPhone, kích hoạt build, cài lên máy). Chạy: `bash
  apps/mobile/scripts/eas-dev-client-setup.sh` từ đâu cũng được (script tự `cd` về `apps/mobile`).
- Sau khi có dev client cài trên máy: `npx expo start --dev-client` thay cho `npx expo start` thường —
  dev client tự kết nối, không qua Expo Go nữa.
