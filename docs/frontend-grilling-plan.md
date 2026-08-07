# Frontend Grilling Plan — Module 1 (`apps/mobile`)

> "Grilling" = buổi truy vấn/phản biện có chủ đích TRƯỚC khi viết dòng code frontend đầu tiên, để lộ ra
> hết các giả định ngầm, quyết định còn treo, và rủi ro kỹ thuật — giống cách backend đã chốt qua các ADR
> (`docs/adr/`) thay vì để lộ ra giữa chừng lúc code. Format mỗi mục: **câu hỏi** → **đề xuất** (mặc định
> nếu không ai phản đối) → mức độ chắc chắn. Đề xuất ở đây **CHƯA phải ADR** — cần Admin (chủ dự án) duyệt
> qua trước khi khóa lại; mục nào duyệt xong nên tách thành ADR riêng (`docs/adr/000X-...md`) như backend
> đã làm, không giữ quyết định kiến trúc chỉ nằm trong file kế hoạch này.

---

## 0. Bối cảnh hiện tại (tính đến 2026-08-07)

- **Backend (`services/api`)**: Phase 0–4 xong (xem `docs/TASKS.md`) — auth JWT, CRUD danh mục, batch nhập
  tay, OCR (Claude Vision), list/filter, report + export Excel/PDF. 14 controller, API surface coi như ổn
  định cho những gì Module 1 cần. Chưa có OpenAPI/Swagger (Phase 5) — frontend phải đọc thẳng
  `controller`/`dto` trong `services/api/src/main/java/com/mycompany/api/` làm nguồn sự thật, chưa có tài
  liệu API hình thức.
- **Frontend (`apps/mobile`)**: **CHƯA có gì** — thư mục `apps/` không tồn tại trong repo. Đây là buổi lên
  kế hoạch trước khi scaffold, không phải review code đã có.
- **Đã chốt sẵn (không grilling lại — xem CLAUDE.md §3, §5, §6):** Expo + Expo Router, TypeScript, feature
  folder (`features/production-records`, `features/auth`, ...), state management Context/Zustand (không
  Redux), 4 tab chính (Chụp ảnh mặc định / Nhập tay nhanh / Tra cứu / Hồ sơ), Admin dùng chủ yếu bằng điện
  thoại, web/tablet dành cho nhập liệu hàng loạt + báo cáo + quản lý danh mục (không tối ưu mobile),
  release 1 chỉ Admin đăng nhập (ADR-0001), JWT access-token-only hết hạn 1 ngày không refresh (ADR-0004).

---

## 1. API surface đã sẵn sàng để consume

| Nhóm | Endpoint chính | Ghi chú cho frontend |
|---|---|---|
| Auth | `POST /api/v1/auth/login` → `LoginResponse{accessToken,userId,fullName,role}` | Không có refresh token — hết hạn là bắt login lại. |
| Hồ sơ | `GET/PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/password` | Tab "Hồ sơ". |
| Danh mục | `Teams`, `Employees`, `LatexTypes`, `RateConfigs`, `AllowanceConfigs` — CRUD chuẩn REST | Chỉ Admin cần màn quản lý danh mục này (ưu tiên web, xem §2.9). |
| Nhập tay batch | `POST /production-records/batch`, `/latex-sales/batch`, `/attendance-records/batch` → `BatchResult<T>` (`{index, success, data, error}` theo dòng, ADR-0007) | Best-effort per-row — UI PHẢI highlight đúng dòng lỗi bằng `index`, không chặn cả bảng khi 1 dòng sai. |
| Sửa/hủy | `GET/PATCH /{resource}/{id}`, `POST /{id}/cancel` | PATCH thay thế TOÀN BỘ items (không patch từng item). |
| OCR | `POST /ocr/upload-url` → `{photoPath, uploadUrl, token}` (PUT thẳng lên Supabase, không qua backend); `POST /ocr/capture` → `OcrCaptureResponse` | Xem luồng chi tiết §2.4. |
| Confirm OCR | `POST /production-records/{id}/confirm`, `/latex-sales/{id}/confirm` | draft → confirmed, KHÔNG tự động (ADR-0006). |
| Tra cứu | `GET` list+filter cho 3 resource header (`team_id`, `employee_id`, khoảng ngày, `status` — kể cả `draft`) | Trả `Page<...>`, mặc định `size=50 sort=recordDate DESC`. |
| OCR logs | `GET /ocr-call-logs`, `GET /ocr-call-logs/stats` | Màn theo dõi chi phí/tỷ lệ thành công OCR — ai xem? (câu hỏi §2.9). |
| Lịch sử sửa | `GET /edit-history?tableName=&recordId=` | Xem trong màn chi tiết record. |
| Báo cáo | `GET /reports/production-records`, `/reports/latex-sales` (JSON) + 4 endpoint `/export/xlsx`\|`/export/pdf` | Chỉ tính `CONFIRMED`. Export sinh file ở backend — frontend chỉ tải về (xem §2.7 cho khác biệt web/mobile). |

**Chưa có (Phase 5 backend, chưa làm):** OpenAPI/Swagger, `docs/api.md`. Frontend nên tự generate/duy trì
1 file `types/api.ts` (hoặc dùng `openapi-typescript` khi Phase 5 xong) thay vì đoán field name tay — rủi
ro lệch DTO khi backend đổi.

---

## 2. Câu hỏi cần chốt trước khi code (nội dung chính buổi grilling)

### 2.1 — HTTP client & data fetching
**Câu hỏi:** dùng `fetch` trần + wrapper tự viết, hay kéo thư viện (`axios`, `ky`)? Cache/retry/dedupe
request quản lý thế nào — tự tay hay dùng TanStack Query?
**Đề xuất:** **TanStack Query** (`@tanstack/react-query`) cho toàn bộ GET (list/filter/report — có
cache, refetch, retry tự nhiên rất hợp với UX "mất mạng thực địa" ở CLAUDE.md §9) + 1 `apiClient` mỏng
trên `fetch` (không cần axios) để gắn `Authorization` header + xử lý 401 tập trung. Mutation (POST/PATCH
batch, OCR capture, confirm) dùng `useMutation`, invalidate query liên quan sau khi thành công.
**Mức độ chắc chắn:** cao — pattern chuẩn cho RN+web, không phải build queue tay.

### 2.2 — Token storage cross-platform (web + native)
**Câu hỏi:** `expo-secure-store` KHÔNG chạy trên web. App phải chạy được cả web (CLAUDE.md §3) — vậy lưu
JWT ở đâu để vừa an toàn trên mobile vừa hoạt động trên web?
**Đề xuất:** abstraction `lib/auth/tokenStorage.ts` — native dùng `expo-secure-store`, web dùng
`localStorage` (chấp nhận rủi ro XSS thấp hơn mức cần lo ở v1, vì chỉ 1 vai trò Admin, không có nội dung
user-generated render lại dạng HTML). Token hết hạn 1 ngày (ADR-0004) nên rủi ro lộ token có cửa sổ ngắn.
**Mức độ chắc chắn:** trung bình — cần Admin xác nhận có chấp nhận `localStorage` trên web hay không.

### 2.3 — Xử lý 401/hết hạn token giữa chừng
**Câu hỏi:** JWT hết hạn 1 ngày, không có refresh (ADR-0004) — khi 401 xảy ra giữa lúc Admin đang thao
tác (vd giữa luồng chụp ảnh liên tục ngoài thực địa), UX là gì?
**Đề xuất:** interceptor tập trung trong `apiClient`: bất kỳ 401 nào → clear token, điều hướng về màn
login, hiện toast "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" — KHÔNG mất dữ liệu đã lưu (vì luồng
OCR ghi draft ngay theo ADR-0006, nên ảnh đã chụp trước đó không mất, chỉ ảnh đang xử lý dở khi 401 xảy ra
mới cần chụp lại).
**Mức độ chắc chắn:** cao.

### 2.4 — Luồng Chụp ảnh/OCR: chi tiết còn thiếu trong spec
CLAUDE.md §5 đã tả luồng nghiệp vụ, nhưng còn khoảng trống kỹ thuật:
- **"Tự động crop & làm nét ảnh trước khi gửi OCR" (CLAUDE.md §5) implement bằng gì?** Đây là tính năng
  kiểu document-scanner (phát hiện 4 cạnh giấy, warp phối cảnh) — KHÔNG có sẵn trong Expo managed
  workflow bằng `expo-image-manipulator` (chỉ resize/rotate/crop thủ công theo tọa độ cố định, không tự
  phát hiện cạnh). Cần 1 trong: (a) thư viện native community (vd
  `react-native-document-scanner-plugin`, cần custom dev client / EAS build, không chạy Expo Go), (b) bỏ
  auto-detect, chỉ làm crop thủ công (Admin tự kéo khung) + tăng sáng/tương phản đơn giản qua
  `expo-image-manipulator`, (c) bỏ hẳn bước này ở v1, để nguyên ảnh gửi Claude (Claude Vision vốn chịu
  ảnh nghiêng/thiếu sáng khá tốt) và chỉ làm rõ nét/crop nếu thực tế OCR sai nhiều.
  **Đề xuất: chọn (c) cho v1** — bỏ auto-crop/sharpen thật sự, giữ lại crop thủ công đơn giản (Admin kéo
  khung nếu muốn) qua `expo-image-manipulator`; đo lại nhu cầu sau khi có dữ liệu OCR thật (Phase 3 backend
  cũng đang chờ ảnh thật để verify — 2 việc nên đo cùng lúc). Đây là lệch so với câu chữ CLAUDE.md §5,
  **cần Admin xác nhận** trước khi coi là quyết định (nếu đồng ý, nên sửa luôn CLAUDE.md §5 cho khớp thực
  tế thay vì để tài liệu nói khác code).
- **Camera liên tục (CLAUDE.md: "chụp xong tự quay lại camera ngay")** — trong lúc ảnh N đang
  upload+OCR (gọi Claude đồng bộ, ADR-0005, có thể mất vài giây), Admin đã bấm chụp ảnh N+1 — xử lý song
  song hay xếp hàng? **Đề xuất:** hàng đợi trong bộ nhớ (không phải offline queue bền vững, CLAUDE.md §9
  đã chấp nhận rủi ro mất mạng) — mỗi ảnh 1 item với trạng thái `uploading → processing → done/error`,
  hiển thị dạng danh sách nhỏ dưới ống kính camera (giống progress list app scan tài liệu), xử lý tuần tự
  hoặc tối đa 2 song song để tránh rate-limit Claude API.
- **Báo lỗi/`type_mismatch` ngay tại màn hình chụp (CLAUDE.md §5)** — hiện dưới dạng gì? **Đề xuất:** toast/
  banner không chặn (Admin vẫn chụp tiếp được), kèm nút "Xem chi tiết" mở ảnh lỗi để chụp lại hoặc bỏ qua.
- **"Nhớ Tổ đang làm việc trong phiên"** — phạm vi "phiên" là gì: tồn tại tới khi tắt app, hay tồn tại tới
  khi bấm "Đổi Tổ", hay reset mỗi lần mở lại tab Chụp ảnh? **Đề xuất:** Zustand store, sống theo vòng đời
  app process (không persist qua `AsyncStorage`) — mở lại app sau khi bị kill là tình huống hiếm với luồng
  "đi thực địa cả buổi" nên không cần bền vững; nếu Admin tắt app giữa chừng, chọn lại Tổ 1 lần không phải
  chi phí lớn.

### 2.5 — Bảng review OCR đọc thẳng từ draft row (ADR-0006)
**Câu hỏi:** ADR-0006 + CLAUDE.md §5 yêu cầu bảng kết quả sau OCR đọc TRỰC TIẾP từ draft row (không phải
state tạm client) để chống mất dữ liệu nếu gián đoạn. Vậy sau khi `POST /ocr/capture` trả về danh sách
draft vừa tạo, bảng review có tự `refetch` bằng `GET /production-records?status=draft&...` để lấy đúng
nguồn sự thật, hay dùng thẳng response của `capture`?
**Đề xuất:** dùng response của `capture` để render NGAY (tránh round-trip thừa), nhưng đồng thời
`queryClient.setQueryData`/invalidate cho đúng query key `draft list` — nếu Admin rời màn rồi quay lại
(kể cả sau khi app bị kill), tab Tra cứu (hoặc chính màn review nếu load lại) phải fetch lại bằng GET
filter `status=draft`, không được giữ list draft nào ở AsyncStorage riêng. Sửa (`PATCH`) trên bảng review
gọi thẳng `PATCH /production-records/{id}` từng dòng — không gom thành batch riêng vì đây là sửa aggregate
đã tồn tại, không phải tạo mới.

### 2.6 — Form "Nhập tay nhanh" (nhiều dòng/tổ/ngày) & validate client-side
**Câu hỏi:** validate phía client trùng lặp với Jakarta Validation phía backend đến mức nào? Dùng thư viện
form gì để quản lý nhiều dòng động (thêm/xóa dòng, mỗi dòng nhiều loại mủ)?
**Đề xuất:** `react-hook-form` (hiệu năng tốt với list dài trên mobile, `useFieldArray` khớp đúng nhu cầu
"nhiều dòng") + `zod` cho schema validate, chỉ validate những gì rẻ/rõ ràng ở client (required field, số
âm, ngày hợp lệ) — KHÔNG cố mô phỏng lại toàn bộ business rule phía backend (vd overlap effective_from/to,
partial unique index) vì nguồn sự thật vẫn là response `BatchResult` theo `index` (§1). Lỗi 1 dòng từ
batch response → map ngược lại đúng dòng trong `useFieldArray` để hiển thị inline, không phải alert chung.

### 2.7 — Tải file export (Excel/PDF) — khác nhau giữa web và mobile
**Câu hỏi:** endpoint export trả file nhị phân trực tiếp — trên web trigger download qua `<a download>`/
blob URL là chuyện nhỏ, nhưng trên native (Expo) không có "Downloads" mặc định như trình duyệt.
**Đề xuất:** dùng `expo-file-system` (`downloadAsync`) tải về sandbox app rồi `expo-sharing`
(`shareAsync`) mở share sheet (lưu vào Files/gửi Zalo/in...) — vì báo cáo chủ yếu dùng ở web/tablet
(CLAUDE.md §5 đã nói rõ), nhánh native chỉ cần làm **best-effort**, không phải ưu tiên polish.

### 2.8 — UI kit / component library
**Câu hỏi:** tự build toàn bộ component (Button, TextInput, DataTable...) hay dùng 1 thư viện có sẵn
tương thích Expo + web?
**Đề xuất:** **react-native-paper** — hỗ trợ `react-native-web` tốt, có sẵn `DataTable`, `List`, form
control cần cho cả tab Tra cứu (bảng) lẫn Nhập tay nhanh, theo Material Design nên không cần tự thiết kế
design system từ đầu (đúng tinh thần CLAUDE.md §9 "ưu tiên must-have, UI polish để sau"). Cân nhắc lại nếu
sau này cần tuỳ biến rất sâu, nhưng v1 nên ưu tiên tốc độ.

### 2.9 — Ai xem báo cáo/danh mục/OCR logs? Có cần route-guard theo role không?
**Câu hỏi:** release 1 chỉ Admin login (ADR-0001) — vậy có cần route-guard theo `role` claim từ JWT không,
hay mọi màn hình đều mở vì chỉ có 1 role thực sự đăng nhập được?
**Đề xuất:** vẫn đọc `role` từ `LoginResponse`/`GET /users/me` và lưu trong auth store — KHÔNG viết logic
ẩn/hiện theo `team_lead` (chưa có ai login bằng role đó ở v1), nhưng tổ chức code sao cho thêm 1 role sau
này không phải viết lại từ đầu (theo đúng tinh thần ADR-0001 "không cần viết lại code khi mở tính năng
release sau"). Cụ thể: 1 hook `useAuth()` trả `role`, các nơi cần thu hẹp sau này chỉ cần check hook này.

### 2.10 — Testing frontend
**Câu hỏi:** backend Phase 5 còn treo cả unit lẫn integration test (`docs/TASKS.md`). Frontend có test từ
đầu hay để sau, và test tầng nào (component, hook, e2e)?
**Đề xuất:** v1 ưu tiên tính năng must-have đúng tinh thần CLAUDE.md §9 (dự án làm một mình) — chưa viết
e2e (Detox/Maestro) ngay; chỉ viết unit test cho phần logic thuần không phụ thuộc UI dễ vỡ nhất: mapping
lỗi `BatchResult` → field form (§2.6), interceptor 401 (§2.3), fuzzy-match hiển thị `unmatchedLines`
(§2.4/§1). Để dành component/e2e test tới khi tính năng ổn định.

### 2.11 — Build & deploy target
**Câu hỏi:** Expo Go đủ dùng suốt quá trình dev, hay cần custom dev client ngay từ đầu (vd nếu chọn
document-scanner native module ở §2.4 nhánh (a))? Deploy web ở đâu, deploy mobile qua EAS hay build thủ
công?
**Đề xuất:** vì §2.4 đề xuất chọn nhánh (c) (bỏ document-scanner native), **Expo Go đủ dùng** cho suốt
Phase 1–2 (form + camera cơ bản qua `expo-camera`/`expo-image-picker`, cả hai đều chạy Expo Go). Khi cần
build thật để cài lên điện thoại Admin dùng thực địa (không phải qua Expo Go), dùng **EAS Build** (không
tự set up native toolchain thủ công). Deploy web: `expo export --platform web` ra static site, host ở đâu
(Vercel/Netlify/cùng chỗ với backend) — **chưa chốt, để quyết khi tới Phase báo cáo/web** vì chưa cấp
thiết ở tuần 1–2.

---

## 3. Cấu trúc thư mục đề xuất (`apps/mobile`)

```
apps/mobile/
  app/                          # Expo Router — file-based routing
    (auth)/login.tsx
    (tabs)/
      _layout.tsx                # 4-tab layout, mặc định "Chụp ảnh"
      capture/index.tsx
      quick-entry/index.tsx
      lookup/index.tsx
      profile/index.tsx
    (web)/                       # route riêng chỉ hợp lý trên web/tablet (danh mục, báo cáo)
      teams/, employees/, latex-types/, rate-configs/, allowance-configs/
      reports/production-records.tsx
      reports/latex-sales.tsx
  features/
    auth/            (store, hooks, api)
    production-records/
    latex-sales/
    attendance-records/
    ocr-capture/
    reports/
    admin-catalog/    (teams/employees/latex-types/rate-configs/allowance-configs — CRUD chung layout)
  lib/
    api/client.ts     (fetch wrapper + 401 interceptor, §2.1/§2.3)
    auth/tokenStorage.ts (§2.2)
    query/queryClient.ts
  components/          (shared UI, wrap react-native-paper theo theme riêng nếu cần)
  types/api.ts          (mirror DTO backend — cân nhắc generate từ OpenAPI khi Phase 5 backend xong)
```

Khớp CLAUDE.md §6 (feature folder, TS, Context/Zustand). Route `(web)` không có nghĩa "chỉ chạy trên web
về mặt kỹ thuật" (Expo Router không tách runtime kiểu đó) — chỉ là quy ước thư mục để biết nhóm màn hình
nào thiết kế ưu tiên layout rộng (bảng, form nhiều cột), tránh nhầm là phải chặn truy cập trên mobile.

---

## 4. Kế hoạch theo tuần (cụ thể hóa phần frontend của CLAUDE.md §8)

| Tuần | Backend (đã xong, tham chiếu) | Frontend |
|---|---|---|
| 1 | ✅ Setup + schema + auth | Scaffold Expo Router, `lib/api/client.ts`, `features/auth` (login, token storage §2.2, interceptor §2.3), layout 4 tab rỗng |
| 2 | ✅ Form nhập tay batch, CRUD danh mục | `features/production-records` + `features/latex-sales` + `features/attendance-records` form nhiều dòng (react-hook-form, §2.6); `features/admin-catalog` CRUD Teams/Employees (ưu tiên web layout) |
| 3 | ✅ OCR Claude Vision | `features/ocr-capture`: camera liên tục + upload signed URL + gọi `/ocr/capture`, xử lý hàng đợi (§2.4) — **cần `ANTHROPIC_API_KEY` thật để test end-to-end cùng backend** |
| 4 | ✅ (gộp vào Phase 3 code) | Bảng review OCR editable (§2.5), xử lý `unmatchedLines`, highlight `lowConfidenceFields` |
| 5 | ✅ List/filter/edit-history | `features/*/lookup` — tab Tra cứu, filter theo Tổ/ngày/status kể cả draft, xem `edit_history` trong màn chi tiết |
| 6 | ✅ Report + export | `features/reports` — bảng report JSON + nút export (§2.7), test với dữ liệu thật, sửa lỗi UI |

Ghi chú: backend đã đi trước frontend 6 tuần trên timeline gốc — không có nghĩa frontend chỉ mất 1 tuần
lặp lại, mà là frontend giờ có thể implement thẳng theo API đã ổn định (ít rủi ro đổi contract giữa
chừng), nên tốc độ tuần/tuần có thể nhanh hơn ước tính gốc nếu không vướng các câu hỏi ở mục 2.

---

## 5. Việc cần làm ngay khi buổi grilling này được duyệt

- [ ] Admin duyệt/chỉnh từng mục ở §2 — mục nào chốt xong, tách thành ADR riêng (đánh số tiếp từ 0009)
      thay vì để nằm rải rác trong file kế hoạch này.
- [ ] Nếu §2.4 (bỏ auto-crop/sharpen thật sự) được duyệt → sửa câu "Tự động crop & làm nét ảnh trước khi
      gửi OCR" ở CLAUDE.md §5 cho khớp thực tế.
- [ ] `npx create-expo-app apps/mobile -t` (TypeScript template) + Expo Router, không thêm gì khác cho
      tới khi §2.8 (UI kit) được duyệt.
- [ ] Thêm `apps/mobile` vào cấu trúc repo đã mô tả ở CLAUDE.md §3 (hiện file đó liệt kê `/apps/mobile`
      nhưng thư mục thật chưa tồn tại — cập nhật khi scaffold xong để tài liệu khớp thực tế).
