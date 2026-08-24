# Cập nhật chức năng Hồ sơ — 8 màn hình (theo design Claude Design)

## Nguồn design
Đọc trực tiếp qua `claude_design` MCP (project `55a7676b-68b2-4a14-a355-f2ec6a0394d1`, file
`Nông trường cao su - Mobile.dc.html`, section "Turn 2 — Hồ sơ, 8 màn, brand David Dũng"), KHÔNG suy
đoán. `support.js` chỉ là runtime hiển thị chung của design tool (dc-runtime), không có logic nghiệp vụ
riêng cho app này.

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
3. **Frontend — state loading/error/offline (màn 17)**: áp skeleton + ErrorState (đã có component dùng
   chung `LoadingState`/`ErrorState`) vào màn 10; banner offline dùng `NetInfo` (kiểm tra đã có dependency
   chưa, nếu chưa thêm `@react-native-community/netinfo`).
4. **SHOULD (sau khi 1-3 ổn định)**: Cỡ chữ (context scale), Chất lượng ảnh gửi lên (nén trước upload).

## Checklist tiến độ

### Backend
- [ ] Migration `014_add_user_phone.sql`
- [ ] `entity/User.java` — field `phone`
- [ ] `repository/UserRepository.java` — `findByPhone`
- [ ] `dto/LoginRequest.java` — đổi sang identifier chung (email HOẶC phone)
- [ ] `controller/AuthController.java` — thử email rồi phone
- [ ] `dto/UserProfileResponse.java` + `UpdateProfileRequest.java` — thêm `phone`
- [ ] `UserController.updateMe()` — validate + set `phone`, bắt trùng → 409
- [ ] Test: login email cũ vẫn qua, login phone mới qua, update phone trùng → 409

### Frontend — màn 10 Hồ sơ
- [ ] `features/profile/ProfileScreen.tsx` — thay `app/(tabs)/profile/index.tsx`
- [ ] Avatar tròn fallback initials (giống pattern `BrandMark`/avatar Batch Review đã có)
- [ ] Nhóm TÀI KHOẢN (Thông tin cá nhân → mở màn 11; Đổi mật khẩu → mở màn 13)
- [ ] Nhóm ỨNG DỤNG & HỖ TRỢ (Thiết lập, Thông tin ứng dụng, Trợ giúp*, Điều khoản*) — *Trợ giúp/Điều
      khoản: nội dung tĩnh tối thiểu (chưa có yêu cầu nội dung cụ thể, để placeholder + TODO rõ ràng)
- [ ] Nút Đăng xuất → mở modal 16 (không đăng xuất ngay khi bấm 1 lần)
- [ ] Footer brand + version (đọc `expo-constants`)
- [ ] Skeleton loading + ErrorState + offline banner (màn 17)

### Frontend — màn 11+12 Chỉnh sửa hồ sơ + Ảnh đại diện
- [ ] Form Họ tên/SĐT (email/vai trò read-only)
- [ ] Validate SĐT 10 số, lỗi hiện dưới field
- [ ] Nút Lưu disable tới khi hợp lệ + có thay đổi (dirty-check)
- [ ] Action sheet Ảnh đại diện (Chụp/Chọn thư viện/Xóa/Hủy)
- [ ] Upload qua `/ocr/upload-url` (tái dùng) → `PATCH /users/me`
- [ ] Snackbar "Đã cập nhật hồ sơ" sau khi lưu (không modal chặn)

### Frontend — màn 13 Đổi mật khẩu
- [ ] Form 3 field, toggle hiện/ẩn riêng từng field
- [ ] Validate mật khẩu mới ≥8 ký tự có chữ+số, khớp nhập lại
- [ ] Gọi `PATCH /users/me/password`, xử lý lỗi "mật khẩu hiện tại không đúng"
- [ ] Ghi chú "máy khác phải đăng nhập lại"

### Frontend — màn 14+15 Thiết lập + Thông tin ứng dụng
- [ ] Giao diện (sáng/tối/hệ thống) — lưu local, áp dụng `GluestackUIProvider mode`
- [ ] Ngôn ngữ (chỉ tiếng Việt ở v1 — hiện field, chưa cần chọn được nếu chỉ 1 lựa chọn)
- [ ] Xóa dữ liệu tạm — dọn cache ảnh crop tạm (expo-file-system), hiện dung lượng
- [ ] Màn Thông tin ứng dụng — version/build/thiết bị + link tĩnh
- [ ] (SHOULD) Cỡ chữ
- [ ] (SHOULD) Chất lượng ảnh gửi lên

### Frontend — màn 16 Xác nhận đăng xuất
- [ ] Modal overlay đúng design (nút Đăng xuất màu error, câu trấn an phiếu chưa gửi)

### Chung
- [ ] `npx tsc --noEmit` sạch sau mỗi phase
- [ ] Cập nhật `CLAUDE.md`/README feature nếu route tab đổi hành vi
