# Cập nhật chức năng Hồ sơ — 8 màn hình (theo design Claude Design)

## Nguồn design
Đọc trực tiếp qua `claude_design` MCP (project `55a7676b-68b2-4a14-a355-f2ec6a0394d1`, file
`Nông trường cao su - Mobile.dc.html`, section "Turn 2 — Hồ sơ, 8 màn, brand David Dũng"), KHÔNG suy
đoán. `support.js` chỉ là runtime hiển thị chung của design tool (dc-runtime), không có logic nghiệp vụ
riêng cho app này.

**Ảnh tham chiếu đã cắt sẵn (2026-08-24)** — export từng artboard qua Edge headless screenshot (đúng
markup/style gốc từ design, KHÔNG vẽ lại tay), lưu ở `images/` gốc repo, dùng đối chiếu pixel khi code:
```
images/profile-10-ho-so.png
images/profile-11-chinh-sua-ho-so.png
images/profile-12-anh-dai-dien.png
images/profile-13-doi-mat-khau.png
images/profile-14-thiet-lap-ung-dung.png
images/profile-15-thong-tin-ung-dung.png
images/profile-16-xac-nhan-dang-xuat.png
images/profile-17-trang-thai-tai-loi-offline.png
```

Ghi chú gốc của designer ở cuối section (giữ nguyên để đối chiếu quyết định bên dưới):
> "(1) tên account mẫu — dùng 'Lê Văn Hải' để không hardcode tên thương hiệu thành tên user; (2) backend
> hiện có field email & đổi mật khẩu chưa — nếu chưa thì ẩn 2 mục đó; (3) 'Cỡ chữ' và 'Chỉ gửi khi có
> Wi-Fi' có thật sự làm được ở MVP không, nếu không thì bỏ khỏi Thiết lập."

## Audit code hiện tại (đọc trực tiếp, trích dẫn file:dòng)

**Frontend** — `apps/mobile/src/app/(tabs)/profile/index.tsx` hiện là 1 màn wireframe DUY NHẤT: tên +
email + role (đọc `GET /users/me`), nút tắt Face ID, nút Đăng xuất. Không có route con nào khác — toàn
bộ 8 màn dưới đây đều là MỚI, chưa có 1 dòng UI nào.

**Backend** — khá hơn nhiều so với giả định ban đầu, đọc trực tiếp:
- `entity/User.java` — có sẵn `fullName`, `email` (unique), `passwordHash`, `role`, `team`, `avatarUrl`,
  `position`, `isActive`. **KHÔNG có cột `phone`.**
- `controller/UserController.java`:
  - `GET /api/v1/users/me` → `UserProfileResponse(id, fullName, email, role, avatarUrl, position)`.
  - `PATCH /api/v1/users/me` (`UpdateProfileRequest: fullName, avatarUrl, position`) — **đã có sẵn**,
    frontend chỉ cần gọi.
  - `PATCH /api/v1/users/me/password` (`ChangePasswordRequest: currentPassword, newPassword`) — **đã có
    sẵn**, verify current password bằng `PasswordEncoder`.
  - → Ghi chú gốc (2) của designer: **email đã có, đổi mật khẩu đã có** — KHÔNG cần ẩn 2 mục đó.
- `controller/OcrController.java:26-30` — `POST /api/v1/ocr/upload-url` chỉ nhận `contentType`, ký URL
  Supabase Storage chung, **không gắn riêng OCR** — tái dùng thẳng được cho upload avatar, không cần
  endpoint mới.
- `controller/AuthController.java:35-48` — `login()` chỉ `userRepository.findByEmail(request.email())`;
  `dto/LoginRequest.java` có `@Email` bắt buộc. **Không có cách nào tra cứu theo số điện thoại.**

**Frontend đăng nhập** — `apps/mobile/src/app/(auth)/login.tsx` đã được sửa riêng (2026-08-24, ngoài
phạm vi 8 màn Hồ sơ, xem comment đầu file đó): đổi field Email → Số điện thoại, thêm "Ghi nhớ mật khẩu"
(SecureStore), chế độ chào lại "Chào, {tên}" khi đã từng đăng nhập. Đã ghi rõ GAP: **SĐT gửi lên vẫn qua
key `email` của `LoginRequest`, sẽ luôn bị backend trả 400** cho tới khi có API nhận diện theo SĐT — xem
mục "API còn thiếu #1" bên dưới, đây là gap dùng chung cho cả Đăng nhập lẫn Hồ sơ (màn 11 dưới đây cũng
hiển thị/sửa SĐT).

## Chốt 2 câu hỏi mở của designer

1. **Tên account mẫu** — giữ "Lê Văn Hải" chỉ trong design/plan tham chiếu; khi code thật luôn lấy từ
   `GET /users/me` thật, không hardcode.
2. **Email & đổi mật khẩu** — ĐÃ CÓ ở backend (xem audit trên) → giữ nguyên 2 mục này trong màn 10/13,
   không ẩn.
3. **"Cỡ chữ" và "Chỉ gửi khi có Wi-Fi"** (màn 14) — quyết định:
   - **"Cỡ chữ"**: khả thi nhưng KHÔNG nhỏ — cần 1 context scale toàn app xuyên qua `AppText`/`AppHeading`
     (hiện chưa có cơ chế này ở đâu trong `components/ui`). Xếp **SHOULD**, làm ở phase riêng sau khi 7
     màn còn lại ổn định, không chặn MVP.
   - **"Chỉ gửi khi có Wi-Fi"**: **XUNG ĐỘT TRỰC TIẾP** với quyết định kiến trúc đã chốt — CLAUDE.md §9
     "V1 KHÔNG có offline queue, OCR gọi đồng bộ" (ADR-0005) và "chấp nhận rủi ro mất mạng, không tự thêm
     queue". "Chỉ gửi khi có Wi-Fi" ngụ ý phải hàng đợi ảnh chờ mạng — đúng cái v1 đã quyết định KHÔNG
     làm. **Bỏ khỏi Thiết lập** (không phải "thiếu API", mà là mâu thuẫn kiến trúc đã chốt — nếu sau này
     muốn làm phải quay lại sửa ADR-0005 trước, không phải việc của phase Hồ sơ này).
   - "Chất lượng ảnh gửi lên" (Tiêu chuẩn/thấp) — khả thi, thuần client (`expo-image-manipulator` đã dùng
     sẵn cho crop, CaptureScreen). Xếp **SHOULD**.

## API còn thiếu (danh sách đầy đủ, đã audit — không phải giả định)

### 1. Đăng nhập/định danh theo Số điện thoại (MUST — chặn cả Đăng nhập lẫn màn 11)
- Migration `014_add_user_phone.sql`: `ALTER TABLE users ADD COLUMN phone VARCHAR(15) UNIQUE`. Nullable
  lúc đầu (dữ liệu cũ không có), backfill sau nếu cần bắt buộc.
- `entity/User.java`: thêm field `phone`.
- `dto/LoginRequest.java`: đổi `@Email String email` → identifier chung (vd `String identifier`, nhận cả
  email lẫn SĐT) HOẶC thêm field `phone` riêng, tùy chọn ở backend theo có mặt field nào. Khuyến nghị:
  1 field `identifier` (không `@Email` nữa), `AuthController.login()` thử `findByEmail` trước, không
  thấy thử `findByPhone`.
- `repository/UserRepository.java`: thêm `findByPhone(String phone)`.
- `dto/UserProfileResponse.java` + `dto/UpdateProfileRequest.java`: thêm `phone`.
- `UserController.updateMe()`: cho sửa `phone` (kèm validate format, unique — bắt
  `DataIntegrityViolationException` trả 409 giống pattern `RateConfigService`).

### 2. Avatar upload — KHÔNG có gap
`POST /ocr/upload-url` (generic, chỉ cần `contentType`) + `PATCH /users/me` (nhận `avatarUrl`) đã đủ.
Frontend chỉ cần: xin signed URL → PUT ảnh lên Supabase Storage → gọi `PATCH /users/me` với path trả về.

### 3. Đổi mật khẩu — KHÔNG có gap
`PATCH /users/me/password` đã đủ, đúng field design yêu cầu (mật khẩu hiện tại + mật khẩu mới).

### 4. "Thiết lập ứng dụng" (màn 14) — KHÔNG cần API nào
Giao diện (sáng/tối/hệ thống), Cỡ chữ (SHOULD, xem trên), Chất lượng ảnh gửi lên (SHOULD), Ngôn ngữ, Xóa
dữ liệu tạm — tất cả lưu local (SecureStore/AsyncStorage) hoặc thao tác file-system cục bộ, không chạm
backend.

### 5. "Thông tin ứng dụng" (màn 15) — KHÔNG cần API
Phiên bản/Build đọc từ `app.json`/`expo-constants`; "Thiết bị" đọc từ `expo-device`; 2 link Chính sách/
Điều khoản là static content hoặc link ngoài — không backend.

## 8 màn hình (bám design gốc)

| # | Tên (design) | Loại | Mô tả ngắn |
|---|---|---|---|
| 10 | Hồ sơ | Màn chính | Avatar (fallback chữ cái đầu tên nếu chưa có avatarUrl) + tên + role · Tổ, nút "Chỉnh sửa hồ sơ"; nhóm TÀI KHOẢN (Thông tin cá nhân → email · SĐT, Đổi mật khẩu); nhóm ỨNG DỤNG & HỖ TRỢ (Thiết lập ứng dụng, Thông tin ứng dụng, Trợ giúp, Điều khoản & chính sách); nút Đăng xuất (semantic error, không phải primary xanh) |
| 11 | Chỉnh sửa hồ sơ | Form | Đổi ảnh đại diện (mở màn 12), Họ và tên (input), Số điện thoại (input, có validate lỗi hiện ngay dưới field — 10 số), Email (read-only theo design — email KHÔNG sửa qua đây, chỉ hiển thị), Vai trò (read-only, "Do quản trị hệ thống cấp"), nút "Lưu thay đổi" (disable tới khi hợp lệ + có thay đổi) |
| 12 | Ảnh đại diện | Action sheet (overlay của màn 11) | Chụp ảnh / Chọn từ thư viện / Xóa ảnh hiện tại (semantic error) / Hủy — action sheet, KHÔNG dùng crop editor phức tạp (đúng ghi chú designer). Kết quả báo bằng snackbar "Đã cập nhật hồ sơ", không modal chặn |
| 13 | Đổi mật khẩu | Form | Mật khẩu hiện tại / Mật khẩu mới (validate ≥8 ký tự có chữ+số) / Nhập lại mật khẩu mới — mặc định ẩn, toggle hiện/ẩn từng field riêng; ghi chú "các máy khác đang đăng nhập sẽ phải đăng nhập lại — Face ID máy này vẫn giữ"; nút "Đổi mật khẩu" solid xanh |
| 14 | Thiết lập ứng dụng | Danh sách cài đặt | Nhóm HIỂN THỊ (Giao diện, Cỡ chữ*); nhóm DỮ LIỆU (Chất lượng ảnh gửi lên*, ~~Chỉ gửi khi có Wi-Fi~~ — BỎ, xem quyết định trên); nhóm KHÁC (Ngôn ngữ, Xóa dữ liệu tạm — hiện dung lượng thật). *SHOULD, xem trên |
| 15 | Thông tin ứng dụng | Thông tin tĩnh | Logo + tên brand + mô tả; Phiên bản/Build/Thiết bị; link Chính sách quyền riêng tư/Điều khoản sử dụng; footer "© 2026 David Dũng · Hỗ trợ: ..." |
| 16 | Xác nhận đăng xuất | Modal overlay (trên màn 10) | "Đăng xuất khỏi tài khoản?" + câu trấn an "phiếu đã chụp nhưng chưa gửi vẫn được giữ trên máy" + 2 nút Hủy/Đăng xuất (đăng xuất màu error #B3261E, không phải primary) |
| 17 | Trạng thái tải/lỗi/offline | Tham chiếu 3 state (không phải màn điều hướng riêng) | Skeleton loading cho màn 10; Error state "Không thể tải thông tin hồ sơ" + nút Thử lại; Offline banner nhẹ "Đang offline · số liệu lúc HH:mm" khi dùng dữ liệu cache — áp dụng chung cho cả 8 màn ở trên khi cần, không phải 1 route riêng |

## Implementation phases

1. **Backend — API còn thiếu #1 (SĐT)**: migration 014 + entity + DTO + `AuthController`/`UserController`
   sửa. Unit/integration test: login bằng email vẫn hoạt động (không phá luồng cũ), login bằng SĐT mới
   hoạt động, update SĐT trùng → 409.
2. **Frontend — `features/profile/` (feature folder mới)**: tạo `ProfileScreen.tsx` (màn 10, thay hẳn nội
   dung wireframe cũ), `EditProfileScreen.tsx` (11), `AvatarActionSheet` (12, component overlay dùng
   chung trong 11), `ChangePasswordScreen.tsx` (13), `AppSettingsScreen.tsx` (14, chỉ phần MUST: Giao
   diện/Ngôn ngữ/Xóa dữ liệu tạm), `AboutScreen.tsx` (15), `LogoutConfirmDialog` (16, component overlay
   dùng trong 10). Route: `app/(tabs)/profile/index.tsx` (10), `app/profile/edit.tsx` (11),
   `app/profile/change-password.tsx` (13), `app/profile/settings.tsx` (14), `app/profile/about.tsx` (15).
3. **Frontend — state loading/error/offline (màn 17)**: áp `LoadingState`/`ErrorState` (đã có component
   dùng chung) vào màn 10. ĐÃ ĐỔI khi code thật: không thêm `@react-native-community/netinfo` (chưa có
   dependency này trong repo, thêm mới kéo theo native module + rebuild dev-client) — banner offline dựng
   từ tín hiệu đã có sẵn: `apiClient` (lib/api/client.ts) ném `Error` thường (không phải `ApiError`) khi
   fetch lỗi network trần, `ProfileScreen` phân biệt 2 loại lỗi này để quyết định hiện banner nhẹ hay
   `ErrorState` đầy đủ — không cần polling trạng thái mạng chủ động.
4. **SHOULD (sau khi 1-3 ổn định)**: Cỡ chữ (context scale), Chất lượng ảnh gửi lên (nén trước upload).

## Checklist tiến độ

### Backend
- [x] Migration `014_add_user_phone.sql`
- [x] `entity/User.java` — field `phone`
- [x] `repository/UserRepository.java` — `findByPhone`
- [x] `dto/LoginRequest.java` — field `email` giữ tên cũ (tương thích ngược với frontend đang gửi SĐT qua
      key này) nhưng bỏ `@Email`, ý nghĩa mở rộng thành identifier chung (email HOẶC phone)
- [x] `controller/AuthController.java` — thử `findByEmail` rồi `findByPhone`
- [x] `dto/UserProfileResponse.java` + `UpdateProfileRequest.java` — thêm `phone` (có `@Pattern` khớp
      `phoneSchema` ở `login.tsx`)
- [x] `UserController.updateMe()` — set `phone`, `saveAndFlush` để bắt trùng ngay → 409 (global handler
      có sẵn cho `DataIntegrityViolationException`)
- [x] Test: `AuthIntegrationTest` (login email cũ vẫn qua, login phone mới qua, 401 khi không khớp),
      `UserIntegrationTest` (set phone OK, trùng phone → 409, sai format → 400) — 6/6 pass

### Frontend — màn 10 Hồ sơ
- [x] `features/profile/ProfileScreen.tsx` — thay `app/(tabs)/profile/index.tsx`
- [x] Avatar tròn fallback initials — `components/AppAvatar.tsx` (mới, dùng chung cả 8 màn)
- [x] Nhóm TÀI KHOẢN (Thông tin cá nhân → mở màn 11; Đổi mật khẩu → mở màn 13)
- [x] Nhóm ỨNG DỤNG & HỖ TRỢ (Thiết lập, Thông tin ứng dụng, Trợ giúp*, Điều khoản*) — *Trợ giúp/Điều
      khoản: TẠM điều hướng về màn Thông tin ứng dụng (chưa có nội dung/route riêng, đã ghi TODO trong code)
- [x] Nút Đăng xuất → mở modal 16 (không đăng xuất ngay khi bấm 1 lần)
- [x] Footer brand + version (đọc `expo-constants`)
- [x] Loading/ErrorState (offline banner đơn giản hoá — phân biệt lỗi network trần vs `ApiError`, xem
      comment `ProfileScreen.tsx`, KHÔNG thêm dependency NetInfo mới)

### Frontend — màn 11+12 Chỉnh sửa hồ sơ + Ảnh đại diện
- [x] Form Họ tên/SĐT (email/vai trò read-only) — `EditProfileScreen.tsx`
- [x] Validate SĐT (cùng regex `phoneSchema` với login.tsx), lỗi hiện dưới field
- [x] Nút Lưu disable tới khi hợp lệ + có thay đổi (react-hook-form `isDirty`/`isValid`)
- [x] Action sheet Ảnh đại diện (Chụp/Chọn thư viện/Xóa/Hủy) — `AvatarActionSheet.tsx`
- [x] Upload qua `/ocr/upload-url` (tái dùng) → `PATCH /users/me` — phát hiện thêm 1 gap lúc code: backend
      trả thẳng `avatarUrl` là objectPath thô (bucket private), phải ký signed URL mới hiển thị được
      (giống `photoUrl` các entity khác) — đã vá trong `UserController` (xem mục Backend)
- [x] Snackbar "Đã cập nhật hồ sơ" sau khi lưu (không modal chặn) — lưu avatar riêng, không đợi nút "Lưu
      thay đổi" chung của form (đúng UX màn 12 phản hồi ngay)

### Frontend — màn 13 Đổi mật khẩu
- [x] Form 3 field, toggle hiện/ẩn riêng từng field — `ChangePasswordScreen.tsx`
- [x] Validate mật khẩu mới ≥8 ký tự có chữ+số, khớp nhập lại (zod `refine`)
- [x] Gọi `PATCH /users/me/password`, xử lý lỗi "mật khẩu hiện tại không đúng"
- [x] Ghi chú "máy khác phải đăng nhập lại"

### Frontend — màn 14+15 Thiết lập + Thông tin ứng dụng
- [x] Giao diện (sáng/tối/hệ thống) — `features/settings/store.ts` (mới) + `GluestackUIProvider mode`
      (trước đây hardcode `"system"` ở `app/_layout.tsx`)
- [x] Ngôn ngữ (chỉ tiếng Việt ở v1 — hiện field tĩnh, không cho chọn vì chỉ 1 lựa chọn)
- [x] Xóa dữ liệu tạm — `lib/settings/cacheCleanup.ts` (mới, dọn `cacheDirectory` qua
      `expo-file-system/legacy`), hiện dung lượng thật
- [x] Màn Thông tin ứng dụng — version/build/thiết bị (`expo-constants`/`expo-device`) + link tĩnh
- [x] Bổ sung ngoài mockup: nhóm "Bảo mật" giữ lại nút tắt Face ID/vân tay (chức năng có sẵn từ trước
      redesign, không có màn nào trong 8 màn mới thay thế đúng — xem javadoc `AppSettingsScreen.tsx`)
- [ ] (SHOULD, chưa làm — đúng phase 4 kế hoạch) Cỡ chữ
- [ ] (SHOULD, chưa làm — đúng phase 4 kế hoạch) Chất lượng ảnh gửi lên

### Frontend — màn 16 Xác nhận đăng xuất
- [x] Modal overlay đúng design (nút Đăng xuất màu error, câu trấn an phiếu chưa gửi) —
      `LogoutConfirmDialog.tsx`

### Chung
- [x] `npx tsc --noEmit` sạch sau Phase 1 (backend) + Phase 2 (frontend màn 10-15)
- [ ] Cập nhật `CLAUDE.md`/README feature nếu route tab đổi hành vi — chưa cần, route tab `profile` giữ
      nguyên path, chỉ đổi nội dung màn con

---

## Ghi chú riêng — Chỉnh sửa Footer/Tab bar (KHÔNG thuộc 8 màn Hồ sơ) — ĐÃ LÀM XONG 2026-08-25

Đọc lại đúng nguồn gốc `footer_design.png` qua `claude_design` MCP (project
`55a7676b-68b2-4a14-a355-f2ec6a0394d1`, file `Nông trường cao su - Mobile.dc.html`, **Turn 3 "Thanh điều
hướng dưới — 3 hướng cải tiến"**) — đây là 1 turn RIÊNG, KHÔNG cùng turn với 8 màn Hồ sơ (Turn 2). Turn 3
có 3 option: **3a** "Thanh nổi" (pill trắng tách khỏi đáy), **3b** "Vòm cong" (thanh dính đáy, đỉnh vòm
cong đỡ nút Chụp — gần app ngân hàng nhất), **3c** "Pill trượt" (chỉ tab đang chọn có chữ). `footer_design.png`
khớp chính xác **3b** — cũng là hướng chính designer tự đề xuất trong ghi chú cuối turn ("giữ được cảm
giác bo cong và nút giữa nổi như app ngân hàng, nhưng mọi tab vẫn có nhãn chữ — quan trọng khi người
dùng chính là quản lý làm việc ngoài nắng").

**2 câu hỏi mở đã xác nhận với user (2026-08-25):**
1. Hướng thiết kế → chọn **3b** (Recommended, khớp ảnh + đề xuất designer).
2. Tên tab thứ 3 (giữa Phiếu/Hồ sơ) → **giữ "Sản lượng"** (mockup Turn 3 ghi "Tra cứu" trong tab bar
   nhưng ghi chú cuối turn của chính designer lại dùng "Sản lượng" — mâu thuẫn ngay trong design gốc,
   xác nhận đây không phải yêu cầu revert, tên "Sản lượng" vẫn là quyết định có chủ đích của Phase 5).

**Đã implement** (`apps/mobile/src/app/(tabs)/_layout.tsx`, viết lại hoàn toàn):
- [x] Thanh vòm cong dính đáy (`borderTopLeftRadius`/`borderTopRightRadius` 24px) + mảnh vòm nhỏ 92px đỡ
      nút Chụp, đúng kích thước px từ mockup (ánh xạ 1:1 sang RN dp, cùng cách các màn khác trong app).
- [x] Icon SVG thật — port trực tiếp path từ chính mockup (`react-native-svg`, đã có sẵn dependency,
      cùng cách `BrandMark.tsx`) — nhà/tài liệu/kính lúp/người, KHÔNG cần thêm thư viện icon ngoài
      (mockup tự cho path, không phải chọn thư viện như dự tính ban đầu).
- [x] Nút "Chụp phiếu" chuyển từ phẳng sang FAB nổi (`position:absolute`, shadow, 60×60, bg primary),
      nhãn "Chụp phiếu" nằm NGOÀI vòng tròn (dưới) đúng mockup — vẫn giữ hành vi điều hướng
      `router.push('/(tabs)/capture')` như cũ, chỉ đổi UI.
- [x] Trạng thái active: icon+chữ đổi màu xanh + gạch chỉ 16×3px dưới nhãn (đúng mockup 3b, khác 3a
      dùng nền bo tròn phía sau icon).
- [x] Test trực tiếp trên Android Emulator — chuyển qua cả 4 tab (Hôm nay/Sản lượng/Hồ sơ đã chụp ảnh
      xác nhận), active state đổi đúng, không đè/vỡ layout nội dung màn bên trên.
