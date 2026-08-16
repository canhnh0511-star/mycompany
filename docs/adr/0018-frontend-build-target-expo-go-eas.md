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

## Cập nhật 2026-08-16 — branch thử nghiệm hạ SDK 57→54 để test qua Expo Go (lần 3)

User chủ động yêu cầu test nhanh trên iPhone thật mà KHÔNG cần đợi Apple Developer Program (99 USD/năm) +
build EAS (~10-20 phút/lần) — dùng thẳng Expo Go (miễn phí, có sẵn trên App Store, chỉ cần quét QR).
Khác 2 lần trước (2026-08-09 làm rồi revert 4 phút sau không rõ lý do; 2026-08-11 cân nhắc rồi chọn hẳn
nhánh EAS dev client ở trên) — lần này làm **trên branch riêng `test/expo-sdk54-iphone`**, không đụng
`main`, đúng tinh thần "thử nghiệm có kiểm soát" thay vì đổi quyết định kiến trúc đã chốt.

- `npx expo install expo@^54.0.0` rồi `npx expo install --fix` — tự động hạ toàn bộ 27 package
  `expo-*`/`react`/`react-native`/`react-native-*` về đúng version khớp SDK 54 (không chỉnh tay từng
  package, tránh lệch version nội bộ giữa các module native).
- **Gotcha phát hiện + fix**: `npx expo export --platform web` lỗi `PluginError: Unable to resolve a
  valid config plugin for expo-sharing` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` khi Node cố resolve
  entry point gói để tìm config plugin). Nguyên nhân: `app.json` liệt `"expo-sharing"` vào mảng `plugins`
  dù gói này **không có config plugin thật** (đã ghi nhận từ Tuần 6, `docs/TASKS.md` — lúc cài package
  gốc, script auto-add-config-plugin của Expo CLI từng lỗi và bị bỏ qua an toàn, nhưng entry `plugins` vẫn
  sót lại trong `app.json`). Trên SDK 57 việc này vô hại (resolver không strict), nhưng resolver SDK 54 cố
  `require` thẳng file chính của gói để tìm plugin và va phải 1 file TypeScript nằm trong
  `node_modules/expo-modules-core` mà Node (chạy trực tiếp, không qua Metro) không strip type được. Xóa
  entry `"expo-sharing"` khỏi `plugins` (gói vẫn hoạt động bình thường không cần entry này, đúng ghi chú
  cũ) — không phải lỗi riêng của SDK 54, chỉ là bug tiềm ẩn từ trước lộ ra khi đổi resolver.
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công (1745 module).
  **Chưa merge vào `main`** — branch này chỉ để user tự `npx expo start` (không `--dev-client`) và quét QR
  bằng app Expo Go trên iPhone thật để test. Nếu test ổn và muốn giữ SDK 54 lâu dài, cần bàn lại có nên
  merge (đánh đổi ngược lại EAS dev client đã chọn) hay chỉ dùng branch này cho việc test nhanh rồi bỏ.

### Test thật trên iPhone qua Expo Go — 2 bug phát hiện (2026-08-16)

Chạy `npx expo start` + Expo Go trên iPhone thật, app "build xong" nhưng đứng yên ở màn spinner trắng.
Debug bằng cách thêm log tạm (`console.log`) vào `app/_layout.tsx`/`lib/api/client.ts` rồi đọc log trực
tiếp qua terminal Metro (mọi `console.*` từ thiết bị tự gửi ngược về đây) — tìm ra 2 nguyên nhân khác
nhau:

1. **Bug do SDK 54 (đặc thù branch này)**: `app.json` có `experiments.reactCompiler: true` — log cho
   thấy `RootLayout`/`AuthGate` render/hydrate lặp lại liên tục không dừng (crash-loop, dòng log còn bị
   cắt giữa chừng do app tự khởi động lại). Nghi React Compiler (babel-preset-expo, tính năng thực
   nghiệm) auto-memo sai trên tổ hợp SDK 54/React Native mới hạ, gây `useEffect` re-fire vô hạn. **Tắt
   `reactCompiler: false`** → vòng lặp hết ngay, app khởi động ổn định 1 lần duy nhất. Chưa report lên
   Expo/điều tra sâu nguyên nhân gốc — chỉ tắt để test được, KHÔNG bật lại `reactCompiler: true` trên
   branch này cho tới khi biết chắc SDK nào ổn định với nó.
2. **Bug thật của app, CÓ TRÊN CẢ `main`, không liên quan SDK 54** (`app/_layout.tsx`, `AuthGate`):
   sau khi tắt reactCompiler, app hết crash-loop nhưng vẫn đứng yên ở màn spinner trung chuyển
   (`app/index.tsx`). Log cho thấy `status` chuyển đúng thành `authenticated` nhưng `segments=[]` (đang ở
   route gốc `"/"`, chưa vào group `(tabs)`/`(auth)` nào) — logic điều hướng cũ chỉ xử lý 2 case
   (`unauthenticated` + không ở `(auth)` → về login; `authenticated` + đang ở `(auth)` → vào `(tabs)`),
   **thiếu case `authenticated` + đang ở route trung chuyển gốc `segments=[]`** → không bao giờ
   `router.replace('/(tabs)')`, kẹt vĩnh viễn ở spinner. Có lẽ trước đây không lộ ra vì test trên Android
   emulator (2026-08-13, `docs/module-1-1-frontend-redesign-progress.md`) tình cờ có timing khác khiến
   route resolve nhanh hơn native splash ẩn. **FIXED**: thêm nhánh `atRoot = segments.length === 0` vào
   điều kiện redirect `authenticated`. Verify: `tsc --noEmit` sạch, `expo export --platform web` build
   OK, test lại thật trên iPhone qua Expo Go — vào thẳng Home, không còn kẹt spinner.
   **Cần cherry-pick fix này (chỉ đoạn sửa logic, KHÔNG kèm phần hạ SDK 54) sang `main`** — đây là bug
   thật ảnh hưởng mọi SDK, không phải đặc thù của branch thử nghiệm này.
