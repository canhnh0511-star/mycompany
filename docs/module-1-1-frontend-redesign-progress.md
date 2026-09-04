# Module 1.1 — Áp dụng visual design Claude Design + Redesign navigation/Home

> Checklist sống — cập nhật khi làm xong từng phase, không xóa mục cũ (giữ lịch sử), theo đúng quy ước
> `docs/TASKS.md`. Nguồn quyết định: `docs/module-1-1_upgrade_UI_UX.md` (brief gốc),
> `docs/UI_UX_GUIDE_RUBBER_FARM.md` (UX guideline), Claude Design project `55a7676b-68b2-4a14-a355-f2ec6a0394d1`
> (`Nông trường cao su - Mobile.dc.html`), và quyết định Product Owner ngày 2026-08-13 (chốt C1/C2 — xem
> mục "Quyết định đã chốt" bên dưới). Plan chi tiết đầy đủ (audit + bảng mapping) nằm ở
> `C:\Users\canhn\.claude\plans\e-code-mycompany-docs-module-1-1-upgrade-hidden-harbor.md` (plan file cục bộ,
> không nằm trong repo) — file này là bản tóm tắt để lưu trong repo, tiện review/lịch sử.

## Quyết định đã chốt (2026-08-13, Product Owner)

- **Home/Daily Dashboard**: chấp thuận là feature mới (không còn giới hạn "chỉ apply style").
- **Navigation**: được phép tổ chức lại, miễn không xóa chức năng cũ (Chụp ảnh/Nhập tay nhanh/Tra
  cứu/Hồ sơ vẫn phải còn đường vào).
- **Ngày làm việc / roster theo Tổ**: VẪN là feature riêng, chưa làm ở đợt này — để phase sau khi Home
  ổn định. Home chỉ được hiện summary theo Tổ dạng rút gọn nếu dữ liệu cho phép.
- **Kiểm ảnh trước khi gửi**: chỉ audit ở Phase 7, không tự sửa flow ngay.
- **Không được tự sửa**: backend API/DTO/DB/business rule/validation/auth/OCR processing/persistence/
  domain model. UI cần data gì chưa có API → ghi rõ, đề xuất, không tự thêm endpoint.
- Thứ tự ưu tiên khi xung đột: **Business rules hiện tại → quyết định Product Owner → UI_UX_GUIDE →
  Claude Design**.

## Trạng thái theo Phase

- [x] **Phase 1 — Theme + Design Tokens + Typography** ✅ (2026-08-13)
- [x] **Phase 2 — Shared UI Components** ✅ (2026-08-13)
- [x] **Phase 3 — Navigation Refactor** ✅ (2026-08-13)
- [x] **Phase 4 — Home / Daily Dashboard** ✅ (2026-08-13, MVP — xem giới hạn trong mục Phase 4)
- [x] **Phase 5 — Camera Capture (visual)** ✅ (2026-08-13)
- [x] **Phase 6 — OCR Review (visual)** ✅ (2026-08-13)
- [x] **Phase 7 — Evaluate Batch Image Review** ✅ audit xong, CHƯA sửa code (chờ quyết định Product Owner)
- [x] **Phase 8 — Các màn còn lại** ✅ (2026-08-13, xong toàn bộ — quick-entry forms, admin-catalog,
  audit tổng bg-accent/text-destructive) — xem chi tiết trong mục Phase 8
- [ ] *(Phase riêng, chưa lên lịch)* Ngày làm việc / roster theo Tổ
- [ ] **QUAN TRỌNG — chưa làm ở bất kỳ Phase nào**: test runtime thật trên thiết bị/browser (chỉ mới
  verify `tsc --noEmit` + `expo export --platform web` sau mỗi Phase, chưa xác nhận bằng mắt)
- [x] **Hồ sơ — 8 màn hình mới** ✅ (2026-08-25, MUST — xem "Đợt 4" bên dưới, plan chi tiết
  `docs/plans/0022-profile-8-screens-plan.md`) — SHOULD còn lại (Cỡ chữ, Chất lượng ảnh gửi lên) CHƯA làm
- [x] **Footer/tab-bar — redesign "Vòm cong"** ✅ (2026-08-25 — xem "Đợt 4" bên dưới)

---

## Phase 1 — Theme + Design Tokens ✅ (xong 2026-08-13)

File đổi: `apps/mobile/src/global.css`, `apps/mobile/app.json`.

- `--primary`/`--ring`: đen trung tính (`23 23 23`) → **teal-green `#1E6B57`** (`30 107 87`) theo đúng
  màu Claude Design, khớp UI_UX_GUIDE §13 ("trầm, chuyên nghiệp, không neon"). Bản dark-mode dùng teal
  sáng hơn (`#3E9C82` / `62 156 130`) để đủ contrast trên nền tối.
- Thêm 3 token semantic còn thiếu: `--success` (`#2F7A57`), `--warning` (`#8A5A12`), `--info`
  (`#1D6FBE`) + `-foreground` tương ứng — dùng theo đúng cách `--destructive` đã dùng trong repo
  (`text-success`, `bg-warning/10`, `border-warning/40`... qua Tailwind opacity modifier trên custom
  color, không cần file riêng).
- `app.json`: splash `#208AEF` → `#1E6B57`; Android adaptive-icon `#E6F4FE` → `#EDF5F2` (tint teal nhạt,
  khớp trạng thái "đã chọn" trong Claude Design). Đã xem `splash-icon.png` — logo trắng/trong suốt nên
  vẫn tương phản tốt trên nền teal đậm mới.
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công (không lỗi CSS).

**Điểm quan trọng cần biết khi review**: chưa đổi bất kỳ component/màn hình nào — chỉ đổi token nên
toàn bộ UI hiện tại tự động đổi màu primary (button, focus ring...) mà không cần sửa từng nơi gọi, đúng
lý do chọn kiến trúc token tập trung ở ADR-0015.

---

## Phase 2 — Shared UI Components ✅ (xong 2026-08-13)

File mới: `components/AppCard.tsx`, `components/StatusBadge.tsx`, `components/EmptyState.tsx`,
`components/ErrorState.tsx`, `components/LoadingState.tsx`, `lib/status.ts`.

- `StatusBadge` — presentational thuần (`label` + `tone: neutral|success|warning|error|info`), KHÔNG tự
  biết enum nghiệp vụ. Mapping `RecordStatus` (`DRAFT|CONFIRMED|CANCELLED`) → label/tone tập trung ở
  `lib/status.ts` (`recordStatusLabel`/`recordStatusTone`) — thay cho `statusLabel()`/`statusBadgeClass()`
  tự viết riêng trong `LookupScreen.tsx` trước đây (CLAUDE.md §19, UI_UX_GUIDE §37.8 "mapping status tập
  trung"). **Quyết định đáng chú ý**: đổi tone của `DRAFT` từ "neutral" (bg-muted cũ) → **"warning"**
  (amber) vì draft trong luồng OCR nghĩa là "chưa xác nhận, cần Admin xem lại" — đúng tinh thần ⚠ Cần
  kiểm tra của UI_UX_GUIDE §10, không phải chỉ 1 trạng thái trung tính. Nhãn hiển thị giữ nguyên "Nháp"
  (không đổi copy).
- `AppCard` — bọc `Box` với `bg-card border border-border rounded-xl p-4` (token Phase 1), có `variant="flat"`
  cho card lồng trong card (tránh double-border theo UI_UX_GUIDE §27).
- `EmptyState`/`ErrorState`/`LoadingState` — thay pattern lặp lại `<AppText>Đang tải...</AppText>` /
  `error instanceof ApiError ? ... : 'Lỗi không xác định'` đang có ở `LookupScreen.tsx`,
  `OcrMonitoringScreen.tsx`, `ProductionReportScreen.tsx`... `ErrorState` tách rõ `message` (điều gì xảy
  ra, luôn hiện) và `detail` (chi tiết kỹ thuật phụ, optional) theo đúng UI_UX_GUIDE §21. Export thêm
  `getErrorMessage(error)` helper (rút gọn check `instanceof ApiError`) để tái dùng khi cần tự custom
  UI lỗi ngoài `ErrorState`.
- **Đã áp dụng thật vào `LookupScreen.tsx`** (không chỉ tạo component rồi để đó) — thay toàn bộ loading/
  error/empty/status-badge/card cũ bằng component mới, để verify component hoạt động đúng trong màn hình
  thật trước khi dùng tiếp ở Phase 3-8. Các màn còn lại (OcrMonitoringScreen, ProductionReportScreen,
  LatexSaleReportScreen, record-detail...) CHƯA áp — để Phase 8 (đúng thứ tự phase, tránh lẫn quá nhiều
  thay đổi 1 lúc).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công.

---

## Phase 3 — Navigation Refactor

### Bảng mapping (bắt buộc lập trước khi code, theo yêu cầu Product Owner §14)

| Navigation cũ | Navigation mới | Đích đến (route/file) | Business function preserved? |
|---|---|---|---|
| *(không có)* | **Hôm nay** (tab đầu, mặc định) | Home mới (Phase 4) | N/A — tab mới |
| Chụp ảnh (tab, mặc định cũ) | CTA "Chụp phiếu" nổi bật trên Home + lối vào từ tab **Phiếu** | `features/ocr-capture/CaptureScreen.tsx` (không đổi code màn) | ✅ Giữ nguyên |
| Nhập tay nhanh (tab) | Vào tab **Phiếu** (mục con) + quick action trên Home | `app/(tabs)/quick-entry` (giữ nguyên route) | ✅ Giữ nguyên |
| Tra cứu (tab) | Đổi tên/nhóm thành **Sản lượng** (tab) | `features/lookup/LookupScreen.tsx` (không đổi code màn, không đổi route path) | ✅ Giữ nguyên |
| Hồ sơ (tab) | Giữ tab cuối **Hồ sơ** | `app/(tabs)/profile` | ✅ Giữ nguyên hoàn toàn |

Cấu trúc 4 tab cuối: `Hôm nay / Phiếu / Sản lượng / Hồ sơ`. Không thêm tab "Nhân sự" — admin-catalog
chưa có bản mobile, tránh tự thêm feature ngoài yêu cầu bảo toàn 4 chức năng cũ.

### Implementation ✅ (xong 2026-08-13)

File đổi: `app/(tabs)/_layout.tsx`, `app/_layout.tsx` (AuthGate redirect), `CLAUDE.md` §5.
File mới: `app/(tabs)/index.tsx` (Home route), `app/(tabs)/phieu.tsx` (Phiếu hub route),
`features/phieu-hub/PhieuHubScreen.tsx`.

- **Kỹ thuật giữ chức năng cũ**: dùng `Tabs.Screen options={{ href: null }}` (API chuẩn expo-router,
  KHÔNG phải xóa file) cho `capture`/`quick-entry` — 2 route này **giữ nguyên 100% file/logic cũ**, chỉ
  ẩn khỏi thanh tab. Vẫn điều hướng tới được qua `router.push('/(tabs)/capture')` /
  `router.push('/(tabs)/quick-entry')` từ CTA trên Home và tab Phiếu. Route `lookup` cũng KHÔNG đổi path
  — chỉ đổi `title` hiển thị từ "Tra cứu" → "Sản lượng" trong `Tabs.Screen options`.
- `features/phieu-hub/PhieuHubScreen.tsx` (mới) — hub thuần điều hướng, không business logic, 2
  `AppCard` lớn dẫn tới capture/quick-entry.
- `AuthGate` (`app/_layout.tsx`) đổi redirect sau đăng nhập từ `/(tabs)/capture` → `/(tabs)` (Home) —
  đúng yêu cầu "Home trở thành entry point chính".
- **Đã cập nhật `CLAUDE.md` §5** (tab list) khớp navigation mới, kèm ghi chú tham chiếu ngược lại file
  progress này — tránh lặp lại đúng vấn đề đã phát hiện ở audit Bước 1 (tài liệu tham chiếu bị lỗi thời
  so với source thật).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công (đã trigger
  regenerate `router.d.ts` cho 2 route mới `phieu`/`index`).

**Điểm quan trọng cần biết khi review**: CHƯA test điều hướng thật trên thiết bị/browser (chỉ verify
build + type). Route `capture` (`Tabs.Screen href: null`) khi push tới vẫn render bên trong `Tabs`
layout — nghĩa là thanh tab bar vẫn hiện khi đang ở màn Camera, giống hành vi CŨ trước redesign (Camera
vốn cũng là 1 tab, không phải fullscreen modal) — KHÔNG phải regression, chỉ giữ nguyên hành vi gốc.

---

## Phase 4 — Home / Daily Dashboard

### Audit dữ liệu (bắt buộc trước khi code, theo yêu cầu Product Owner §7)

| KPI | Nguồn dữ liệu | Trạng thái |
|---|---|---|
| Tổng sản lượng hôm nay | `GET /reports/production-records?fromDate=toDate=hôm nay` → `grandTotalKg` | ✅ Có API sẵn (chỉ CONFIRMED) |
| Sản lượng theo Tổ | Cùng response → `teamSubtotals[].totalKg` | ✅ Có API sẵn |
| Bán mủ hôm nay | `GET /reports/latex-sales?fromDate=toDate=hôm nay` → `grandTotalKg` | ✅ Có API sẵn |
| Công nhân có dữ liệu / tổng | `rows` (distinct employeeId) so với `GET /employees?status=active` | ✅ Tính được (2 lời gọi) |
| Số phiếu hôm nay | `GET /production-records` + `GET /latex-sales` (fromDate=toDate=hôm nay) → `Page.totalElements` | ✅ Tính được |
| Phiếu chờ review | `GET /production-records?status=DRAFT` + `GET /latex-sales?status=DRAFT` (không lọc ngày) | ✅ Tính được |
| Tổ chưa có phiếu hôm nay | So `GET /teams` với teamId xuất hiện trong report/records hôm nay | ✅ Tính được |
| Trend "↑8% so với TB 7 ngày" | Cần thêm 1 lời gọi report 7 ngày trước, tự tính TB ở frontend | ⚠️ **Bỏ khỏi MVP** — thêm phức tạp, để sau |
| Chênh lệch ghi nhận vs bán mủ | So `grandTotalKg` 2 report | ⚠️ **Bỏ khỏi "Cần chú ý"** — chênh lệch có thể hợp lệ (bán khác ngày với thu), dễ gây hiểu nhầm là lỗi |
| Lỗi OCR kỹ thuật gần đây | `GET /ocr-call-logs?success=false&from=hôm nay` | ✅ Có API, không bắt buộc cho MVP |

**Kết luận**: không cần API backend mới cho Home MVP.

### Implementation ✅ (xong 2026-08-13)

File mới: `features/home/HomeScreen.tsx`. File đổi: `features/reports/dateRange.ts` (export thêm
`toIsoDate`/`todayIsoDate` — tái dùng thay vì viết lại hàm ngày ở Home).

- Dùng lại 100% hook/API đã có, KHÔNG thêm backend: `useProductionReportQuery`/`useLatexSaleReportQuery`
  (Sản lượng/Bán mủ hôm nay, theo Tổ), `useProductionRecordsListQuery`/`useLatexSalesListQuery` (đếm
  phiếu hôm nay + đếm draft chờ review, không lọc ngày cho draft), `useEmployeesLookupQuery`/
  `useTeamsLookupQuery` (tổng nhân công active, danh sách Tổ).
- **"Tổ hôm nay" dùng nguồn khác "Sản lượng theo Tổ"**: trạng thái có/chưa có dữ liệu của từng Tổ lấy từ
  `productionToday.data.content` (list KHÔNG lọc status — draft cũng tính là "đã có dữ liệu"), không
  lấy từ `teamSubtotals` của report (chỉ tính CONFIRMED) — nếu dùng report sẽ báo sai "chưa có phiếu"
  cho Tổ vừa chụp ảnh nhưng chưa qua review. Đây là điểm dễ nhầm nếu sửa lại sau, ghi chú rõ trong code.
  Số kg thật (Sản lượng hôm nay/theo Tổ) vẫn lấy từ report — đúng CLAUDE.md (báo cáo chỉ tính CONFIRMED).
  **Giới hạn đã biết**: `productionToday` mặc định `size=50` (Pageable default) — nếu 1 ngày phát sinh
  >50 bản ghi (không xảy ra ở quy mô 20-30 công nhân hiện tại), phần "Tổ hôm nay" có thể bỏ sót Tổ. Chưa
  cần xử lý ở v1, ghi nhận để biết nếu sau này quy mô tăng.
- Đã bỏ theo đúng audit: KHÔNG có trend %, KHÔNG có mục "chênh lệch ghi nhận vs bán mủ" trong "Cần chú
  ý" — chỉ 2 loại cảnh báo suy luận chắc chắn được: Tổ chưa có phiếu hôm nay, số phiếu đang chờ review.
  Cả 2 dẫn thẳng tới hành động (Chụp / Sản lượng).
  Section "Cần chú ý" tự ẩn hoàn toàn khi rỗng (đúng UI_UX_GUIDE — không hiện section rỗng gây rối mắt).
- Toàn bộ số liệu qua `LoadingState`/`ErrorState` mới (Phase 2) khi query đang chạy/lỗi — không có số
  giả hiển thị tạm trong lúc chờ.
- Verify: `npx tsc --noEmit` sạch (1 lỗi ban đầu: `EmployeeStatus` enum là `'ACTIVE'` không phải
  `'active'` — đã sửa), `npx expo export --platform web` build thành công.

**Điểm quan trọng cần biết khi review**: **CHƯA test runtime với dữ liệu thật** (cần backend chạy +
đăng nhập thật — ngoài khả năng môi trường code này, cùng giới hạn đã ghi nhận nhiều lần ở
`docs/TASKS.md`). Nên mở thử trên thiết bị/browser thật với `ANTHROPIC_API_KEY` + dữ liệu Supabase dev
đã có để xác nhận layout/số liệu đúng như audit trước khi coi Phase 4 là "xong" hoàn toàn.

---

## Phase 5 — Camera Capture (visual) ✅ (xong 2026-08-13)

File đổi: `features/ocr-capture/CaptureScreen.tsx`.

- "Chọn loại phiếu" đổi từ 2 `AppButton` nhỏ (segmented) → 2 `AppCard` lớn có mô tả phụ (theo đúng màn
  "02 · Chọn loại phiếu" Claude Design) — lựa chọn đang chọn tô `bg-primary/10 border-primary`.
  **Thay đổi composition** (không chỉ đổi màu) — thuộc scope mới được duyệt ("Screen composition").
  Logic chọn loại phiếu (`targetType` state) không đổi.
- Chip "Tổ đang làm việc" đổi từ `bg-accent` (xám) → `bg-primary/10 text-primary` — nhất quán màu nhấn
  mới, không đổi hành vi (`useOcrSessionStore`).
- Hàng đợi ảnh (`items.map`) — đổi badge trạng thái tự viết (`Box` + class rẽ nhánh thủ công) sang
  `StatusBadge` (Phase 2), mapping `QueueItemStatus` → tone: `uploading`/`processing` = neutral,
  `done` = success, `error` = error.
- **KHÔNG đổi**: viewfinder tối + khung camera, nút chụp tròn (đã đúng hướng Claude Design từ trước —
  StyleSheet riêng vẫn giữ vì NativeWind không style được `CameraView`/kích thước tuyệt đối tốt bằng),
  banner lỗi/type-mismatch (giữ đỏ vì đây là lỗi chặn thật, không phải "cần kiểm tra"), toàn bộ
  `useOcrQueue`/permission flow.
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công.

---

## Phase 6 — OCR Review (visual) ✅ (xong 2026-08-13)

File đổi: `features/ocr-capture/OcrReviewScreen.tsx`.

- Thêm `rowStatusLabel()`/`rowStatusTone()` (khác `lib/status.ts` — đây là trạng thái tại chỗ của thao
  tác "Lưu" trong màn review: draft/saving/confirmed/error, KHÔNG phải `RecordStatus` DB) — dùng
  `StatusBadge` thay Box/class rẽ nhánh thủ công, áp cho cả `ProductionReview` và `LatexSaleReview`.
- Card mỗi dòng (`Box border p-3` → `AppCard`) — nhất quán token Phase 1.
- **Sửa 1 điểm lệch semantic đáng chú ý so với UI_UX_GUIDE §22**: banner "AI không chắc" (low-confidence
  field) trước đây dùng `text-destructive` (đỏ) — theo đúng phân biệt UI_UX_GUIDE ("Cần kiểm tra" =
  amber, "Business error" = đỏ), đây LÀ trường hợp "cần kiểm tra" (OCR không chắc chắn, không phải lỗi
  nghiệp vụ) nên phải amber, không phải đỏ. Đã đổi sang `border-warning/40 bg-warning/10 text-warning`
  + đổi text thành "⚠ Cần kiểm tra — AI không chắc: ..." (rõ nghĩa hơn "AI không chắc" trơn). Đây là
  sửa lỗi thể hiện trạng thái (UI state presentation, thuộc scope được duyệt), KHÔNG đổi logic —
  `lowConfidence` vẫn đọc y nguyên từ `data.lowConfidenceFields` (CLAUDE.md §4/§5).
- **KHÔNG đổi**: field-level highlight cho từng ô nghi ngờ cụ thể (Claude Design màn 06 tô riêng từng ô
  kg amber) — KHÔNG làm vì `lowConfidenceFields` là mảng tên field dạng chuỗi tự do từ OCR
  (`docs/TASKS.md` Phase 3 note: "đơn giản hoá ở mức DÒNG, không map tới từng item"), không có cách map
  chắc chắn 1-1 sang từng `AppInput` cụ thể mà không đoán — giữ banner ở mức dòng, không tự suy đoán
  mapping sai. Toàn bộ PATCH/confirm logic, `reviewStore`, `unmatchedLines` banner không đổi.
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công.

---

## Phase 7 — Evaluate Batch Image Review ✅ audit xong (2026-08-13) — CHƯA sửa code

Audit `features/ocr-capture/useOcrQueue.ts` + `CaptureScreen.tsx` theo đúng checklist §10 Product Owner
yêu cầu, đối chiếu Claude Design màn "04 · Kiểm ảnh trước khi gửi":

| Câu hỏi | Trả lời |
|---|---|
| Có chụp nhiều ảnh liên tục không? | **Có** — mỗi lần bấm shutter/chọn thư viện gọi `enqueue()` ngay, camera sẵn sàng chụp tiếp lập tức, không chờ ảnh trước xử lý xong (upload+OCR chạy nền, tối đa 2 song song qua semaphore, ADR-0011). |
| Có thumbnail không? | **Không** — mỗi dòng trong hàng đợi chỉ hiện `fileName` (text) + `StatusBadge`, không hiện ảnh thật. Khác Claude Design (ô vuông ảnh mờ đại diện ở màn 03/04). |
| Có xóa ảnh sai không? | **Không** — không có nút xóa khỏi hàng đợi. Một khi `enqueue()` chạy, ảnh CHẮC CHẮN được upload + gửi OCR, không có bước dừng lại loại ảnh mờ/sai trước khi gửi. |
| Có chụp lại không? | Chỉ theo nghĩa "chụp thêm ảnh mới" (không giới hạn số lượng) — KHÔNG có khái niệm "thay thế ảnh vừa chụp", ảnh xấu vẫn nằm trong hàng đợi và vẫn được gửi đi. |
| Có gửi batch không? | Có, nhưng khác mô hình Claude Design: **mỗi ảnh tự động upload + gọi OCR NGAY khi chụp/chọn** (không có nút "Hoàn tất" gộp gửi 1 lượt sau khi xem lại cả loạt). |

**Kết luận**: flow hiện tại **thiếu bước "kiểm ảnh trước khi gửi"** đúng như đã nêu ở audit ban đầu
(mục C2, Bước 1). Không tự sửa ngay — 2 đề xuất để Product Owner cân nhắc riêng:

1. **Thêm thumbnail ảnh thật** (dự án đã có sẵn dependency `expo-image`, không cần cài mới) thay cho
   text `fileName` trong hàng đợi — cải thiện khả năng nhận biết ảnh nào là ảnh nào, rủi ro thấp, KHÔNG
   đổi luồng nghiệp vụ (chỉ hiển thị thêm, không thêm/bớt bước) — có thể coi là "visual" thuần túy, đủ
   điều kiện làm ngay nếu Product Owner đồng ý mà không cần bàn riêng.
2. **Thêm bước dừng lại xóa ảnh TRƯỚC khi gửi** (đúng tinh thần Claude Design màn 04) — đây LÀ thay đổi
   luồng nghiệp vụ thật sự: cần tách "chụp xong, ảnh nằm chờ" ra khỏi "chụp là tự động upload+OCR ngay"
   hiện tại (`enqueue()` bắt đầu network call trong cùng 1 hàm). Đánh đổi: chậm hơn 1 bước thao tác cho
   mỗi lượt chụp (ngược lại UI_UX_GUIDE §2.2 "daily action phải cực nhanh"), nhưng giảm rủi ro tốn phí
   Claude Vision cho ảnh mờ/hỏng. **Cần Product Owner quyết định trước khi code** — chưa tự làm.

Chưa sửa file nào ở Phase này.

---

## Phase 8 — Các màn còn lại (MỘT PHẦN — xem việc còn lại bên dưới)

### Đã làm (2026-08-13)

File đổi: `features/reports/ProductionReportScreen.tsx`, `features/reports/LatexSaleReportScreen.tsx`,
`features/ocr-monitoring/OcrMonitoringScreen.tsx`, `app/(tabs)/profile/index.tsx`,
`features/lookup/ProductionRecordDetailScreen.tsx`, `features/lookup/LatexSaleDetailScreen.tsx`.

- 2 màn báo cáo (`ProductionReportScreen`/`LatexSaleReportScreen`) + `OcrMonitoringScreen`: thay
  loading/error/empty text tự viết → `LoadingState`/`ErrorState`/`EmptyState`; cột "Kết quả"/"Khớp loại?"
  trong bảng OCR monitoring → `StatusBadge`; `StatCard` → `AppCard`. **Giữ nguyên cấu trúc bảng**
  (KHÔNG đổi row thành card) — đúng UI_UX_GUIDE §13/§28 "desktop/tablet dữ liệu danh sách nên tiếp tục
  dùng table", chỉ table trên mobile Lookup mới dùng card (đã chốt từ ADR-0019 mục 2, không đổi lại).
  Copy "CONFIRMED" (enum backend lộ ra UI) → "đã xác nhận" (CLAUDE.md §19) ở 2 chỗ empty-state báo cáo.
- `app/(tabs)/profile/index.tsx`: `Spinner` trơn → `LoadingState`, text lỗi → `ErrorState`; thêm
  `ROLE_LABEL` map `admin`/`team_lead` → "Admin"/"Tổ trưởng" (trước đó hiện thẳng giá trị enum
  lowercase — vi phạm nhẹ CLAUDE.md §19, đã sửa).
  ROLE_LABEL định nghĩa TẠI CHỖ (chưa tách file riêng) — chỉ 1 nơi dùng, đúng nguyên tắc "không tạo
  abstraction trước khi có use case thứ 2" của repo.
- `ProductionRecordDetailScreen.tsx`/`LatexSaleDetailScreen.tsx`: xóa `statusLabel()` tự viết trùng lặp
  → `recordStatusLabel`/`recordStatusTone` (`lib/status.ts`, Phase 2) + `StatusBadge`; khối bảng khối
  lượng (`Box border` → `AppCard className="p-0 overflow-hidden"` — override padding mặc định của
  AppCard vì hàng bên trong tự có padding riêng).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công sau mỗi nhóm thay
  đổi.

### Đã làm tiếp — phần còn lại (2026-08-13, cùng ngày)

File đổi thêm: `features/production-records/QuickEntryForm.tsx`, `features/latex-sales/QuickEntryForm.tsx`,
`features/attendance-records/QuickEntryForm.tsx`, 5 màn `features/admin-catalog/*/​*Screen.tsx`,
`features/lookup/LookupScreen.tsx` (FilterChip), `components/AppSelect.tsx`, `app/(web)/_layout.tsx`,
`app/(web)/admin-catalog/_layout.tsx`, `app/(web)/reports/_layout.tsx`.

- **3 QuickEntryForm** (production/latex-sales/attendance — cùng pattern lặp lại): `Box border p-3` mỗi
  dòng → `AppCard`; pill trạng thái "✓ Đã lưu"/"Lỗi dòng #n" tự viết (`bg-accent`/`bg-destructive` thủ
  công) → `StatusBadge` (tone `success`/`error`) — đúng tinh thần Phase 2/6, KHÔNG đổi logic
  `submitStatus`/`submitError` (vẫn map theo `index` từ `BatchResult`, ADR-0007). Text lỗi inline dưới
  form (`text-destructive`) giữ nguyên — đây LÀ business error thật (lỗi backend/validate), đúng màu.
- **5 màn admin-catalog CRUD** (Teams/Employees/LatexTypes/RateConfigs/AllowanceConfigs) — cùng pattern
  lặp lại y hệt nhau: form inline (`Box border p-4` → `AppCard`), list item (`Box border p-3` →
  `AppCard`), loading/error text tự viết → `LoadingState`/`ErrorState`, thêm `EmptyState` cho
  LatexTypes/RateConfigs/AllowanceConfigs (Teams/Employees đã có sẵn, chỉ đổi wording chưa đổi
  component). **EmployeesScreen**: pill trạng thái Nhân viên tự viết (`bg-accent`/`bg-muted` + hiện thẳng
  enum `ACTIVE`/`INACTIVE`) → `StatusBadge` (tone `success`/`neutral`) + `EMPLOYEE_STATUS_LABEL` map
  riêng tại chỗ ("Đang làm việc"/"Nghỉ") — sửa luôn vi phạm CLAUDE.md §19 (hiện thẳng enum backend) phát
  hiện khi soát màn này, cùng nguyên tắc `ROLE_LABEL` ở `profile/index.tsx` (Phase 8 đợt 1).
- **Global sweep bg-accent "active/selected" dùng sai** (phát hiện khi audit tổng, KHÔNG chỉ riêng
  `LookupScreen`): `AppSelect.tsx` (option đang chọn trong dropdown), `app/(web)/_layout.tsx` (top nav
  "Quản trị"/"Báo cáo"), `app/(web)/admin-catalog/_layout.tsx` + `reports/_layout.tsx` (rail nav con) —
  cả 4 chỗ này cùng 1 vấn đề: `bg-accent` (xám trung tính) không phân biệt được "đang chọn" rõ ràng, khác
  hẳn cách CaptureScreen (Phase 5) và giờ FilterChip/LookupScreen tô "đang chọn" bằng
  `bg-primary/10` + `text-primary font-medium`. Đổi đồng loạt cả 4 chỗ theo đúng 1 chuẩn — tránh tình
  trạng "đang chọn" trông khác nhau tùy màn. **Đã audit lại `bg-accent`/`text-destructive` toàn
  `apps/mobile/src`** sau khi sửa — các chỗ còn lại đều đúng ngữ cảnh (header bảng báo cáo dùng
  `bg-accent` làm nền trung tính, không phải trạng thái chọn; `text-destructive` chỉ còn ở lỗi nghiệp vụ
  thật: submit error, OCR failed row, overlap 409 rate-config).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build thành công (3MB bundle, không
  lỗi).

### CÒN LẠI — chưa làm

- **CHƯA test runtime trên thiết bị/browser thật với dữ liệu thật** cho TOÀN BỘ Phase 3-8 — chỉ mới
  verify `tsc`/`expo export --platform web` (build/type an toàn), chưa xác nhận bằng mắt layout thật
  đúng như Claude Design, chưa test navigation thật (bấm tab, CTA, back, mở/đóng AppSelect dropdown...).
  Đây là việc quan trọng nhất còn lại trước khi merge — đề xuất chạy `npx expo start --dev-client` hoặc
  `--web` và đi qua từng flow chính (Home → Chụp phiếu → OCR review → Nhập tay nhanh → Sản lượng →
  admin-catalog → Hồ sơ).
- Phase 7 (batch image review — thumbnail thật/bước xóa ảnh trước khi gửi) vẫn đang chờ quyết định
  Product Owner, chưa code (xem mục Phase 7 ở trên).

## Đợt sửa bám sát Claude Design gốc (2026-08-13, sau khi user tự test simulator)

User tự chạy simulator, phát hiện chỉ Home đúng còn lại lệch design. Đối chiếu lại trực tiếp với
project Claude Design (`55a7676b-68b2-4a14-a355-f2ec6a0394d1`) qua `DesignSync` — phát hiện các gap
thật (không chỉ token màu, mà cấu trúc/luồng): Home ghép sai card, Capture gộp nhầm 2 bước, Camera
không immersive/không thumbnail thật, OCR review sai hẳn mô hình (card-mỗi-người thay vì bảng compact).

- **HomeScreen.tsx**: "Nhân công"+"Đã bán" và "Phiếu hôm nay"+"Đang chờ review" gộp lại thành 1 AppCard/
  cặp có `border-l` chia đôi (khớp design, trước đó 2 AppCard rời). "Tổ hôm nay" đổi từ list dọc sang
  lưới ngang (`teamSummaries` tự tính trạng thái 3 mức Xong/Thiếu/Chưa từ `activeEmployees` +
  `productionToday` đã fetch sẵn — KHÔNG cần API mới). CTA "Chụp phiếu" đổi từ Pressable+AppCard sang
  `AppButton` phẳng. Bỏ khối "Thao tác nhanh" (không có trong design).
- **CaptureScreen.tsx**: tách step state `'select' | 'camera'` — bước chọn loại phiếu giờ là màn riêng
  (Loại phiếu + Ngày chỉ đọc "Hôm nay" + Tổ có nút Đổi + "Mở camera"). **Ngày KHÔNG cho sửa** — cố ý,
  vì `OcrCaptureRequest` không có field `recordDate` (AI tự đọc ngày từ ảnh), thêm date-picker giả sẽ
  đánh lừa người dùng. Camera đổi sang full-screen nền đen + 4 góc bo khung ngắm + dải thumbnail ảnh
  thật (thêm `uri` vào `QueueItem`, dùng `expo-image`) thay cho danh sách text — đúng đề xuất Phase 7 audit
  cũ (thumbnail rủi ro thấp, KHÔNG đổi business flow upload/OCR).
- **OcrReviewScreen.tsx**: dựng lại theo bảng compact (ảnh gốc `photoUrl` ghim trên cùng, filter chip
  "Cần kiểm tra/Tất cả", cột theo từng loại mủ + DRC). Ô chỉ cho sửa khi `lowConfidenceFields` khớp được
  tên cột (`matchesColumn` — so khớp chuỗi tự do, best-effort, KHÔNG đảm bảo 1-1; field không khớp cột
  nào vẫn không bị mất vì mỗi dòng bấm mở rộng vẫn xem được Ghi chú/lỗi). Giữ nguyên 100% logic PATCH/
  confirm/state — chỉ đổi presentation.
- **Bug tự phát hiện khi test trên emulator thật**: màn Camera full-screen mới đè lên status bar (pill
  "Sổ ghi mủ" bị đồng hồ hệ thống che) vì thiếu safe-area top inset — đã thêm
  `useSafeAreaInsets()` (`react-native-safe-area-context`, có sẵn dependency, lần đầu dùng trong repo).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build ok, **và test runtime thật
  trên Android emulator** (Pixel_6a, `expo run:android`) — xác nhận bằng mắt Home + luồng Chụp phiếu
  (chọn loại phiếu → camera → banner lỗi type-mismatch → thumbnail ảnh thật) hoạt động đúng như Claude
  Design. **OCR review CHƯA test được bằng ảnh thật** (camera ảo của emulator không tạo được ảnh phiếu
  giấy hợp lệ để Claude Vision đọc) — cần test trên thiết bị thật với ảnh phiếu ghi mủ thật.

## Đợt sửa 2 (2026-08-13, cùng ngày) — user tự test tiếp, báo 3 lỗi mới

User test trực tiếp trên emulator (không qua tôi), báo: (1) header đè status bar TOÀN APP chứ không
riêng Capture, (2) thanh tab dưới sai design + thiếu nút Chụp, (3) font/button chưa đúng kích thước
design. Xác nhận lại: #2 trước đó tôi cố tình giữ nguyên vì tưởng là quyết định PO khoá — user xác nhận
muốn đổi lại đúng Claude Design 1a, override quyết định Phase 3 cũ.

- **`app/_layout.tsx`**: bọc `<Stack>` trong `SafeAreaView edges={['top']}` — 1 chỗ duy nhất, áp dụng
  safe-area top cho TOÀN BỘ route thay vì sửa từng màn (~20 file). Nguyên nhân gốc: Android SDK 57
  (targetSdk 35+) ép edge-to-edge, status bar luôn translucent. Đồng thời sửa 1 bug phát hiện kèm: nút
  bị tự động chuyển hướng sau đăng nhập trỏ nhầm `/(tabs)/capture` (code cũ) thay vì `/(tabs)` (Home) —
  đúng ra đã đổi từ Phase 3 theo progress doc nhưng code thực tế bị sót.
  Gỡ bỏ `paddingTop: insets.top` thủ công đã thêm trong `CaptureScreen.tsx` ở đợt 1 (giờ dư thừa, gây
  double-padding).
- **`app/(tabs)/_layout.tsx`**: viết lại thanh tab bằng `tabBar` prop tự vẽ (component `CustomTabBar`)
  thay vì default renderer — khớp đúng Claude Design 1a: 5 cột `Hôm nay/Phiếu/[nút Chụp to 64×52]/Sản
  lượng/Hồ sơ`. Nút Chụp giữa KHÔNG phải route thật, chỉ `router.push('/(tabs)/capture')`. Icon dùng
  khối vuông bo góc placeholder (đúng những gì Claude Design gốc dùng — không phải icon set thật), né
  luôn lỗi font icon vỡ (tofu box) đang gặp trên build hiện tại.
  **Bug tự vá**: bản đầu dùng `navigation.navigate(name)` → lỗi "action NAVIGATE ... was not handled"
  khi bấm Sản lượng/Hồ sơ (route trong thư mục con `lookup/index.tsx`, `profile/index.tsx` không khớp
  tên nội bộ react-navigation). Sửa bằng `router.push(path)` + `usePathname()` để xác định tab active —
  cùng cơ chế đã dùng ổn định ở `(web)/_layout.tsx` và mọi nơi khác trong app.
- **`components/ui/button/index.tsx`**: `size="lg"` từ `min-h-10` (40px) → `min-h-[52px]` khớp đúng
  chiều cao nút CTA chính trong Claude Design (trước đó thấp hơn hẳn). `size="default"` cũng nâng nhẹ
  lên `min-h-11` (44px, chuẩn touch-target tối thiểu) — dùng chung toàn app nên chỉ nâng vừa phải, không
  đổi bằng `lg` để tránh vỡ layout những nơi chưa soát.
  Gắn `size="lg"` cho các CTA chính khớp design: Login (Đăng nhập + Face ID/vân tay), OcrReviewScreen
  (Xác nhận ảnh này ×2 — Production/LatexSale), 3 QuickEntryForm (Lưu tất cả). Home/Capture đã có sẵn từ
  đợt 1.
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build ok, **test lại toàn bộ trên
  Android emulator** — xác nhận bằng mắt: Home (không đè status bar, card/nút đúng size), Capture (tab
  bar 5 cột + nút Chụp nổi), bấm đủ cả 5 tab (Hôm nay/Phiếu/Chụp/Sản lượng/Hồ sơ) không còn lỗi
  navigate, Hồ sơ hiện đúng thông tin Admin.

## Đợt 3 (2026-08-13, cùng ngày) — bổ sung API + feature theo yêu cầu user

User yêu cầu bổ sung feature còn thiếu ở Home (trend/biểu đồ 7 ngày) và màn "Ngày làm việc" (Phase
riêng chưa làm), với chỉ đạo rõ: **note API cần bổ sung → làm API trước → rồi mới làm feature**. Đây là
lần đầu tiên đợt redesign này đụng tới backend (mọi đợt trước chỉ đổi UI, không chạm API theo đúng giới
hạn Product Owner đã chốt ở đầu tài liệu — lần này user trực tiếp yêu cầu nên không còn giới hạn đó).

### API mới (backend, `services/api`)

`GET /api/v1/reports/production-records/daily-trend?fromDate=&toDate=&teamId=` — sản lượng CONFIRMED
theo TỪNG NGÀY trong khoảng (khác `/production-records` vốn gộp cả khoảng thành 1 số duy nhất, không đủ
cho biểu đồ/trend theo ngày). Trả về mảng đủ 1 điểm/ngày liên tục (ngày trống tự điền `totalKg=0` ở
`ReportService`) — frontend không cần tự lấp khoảng trống.

File mới: `dto/ProductionDailyTrendResponse.java`, `dto/DailyTotalPoint.java`,
`repository/DailyTotalRow.java`. File đổi: `repository/ProductionRecordItemRepository.java` (thêm query
`aggregateDailyTotals`), `service/ReportService.java` (method `productionDailyTrend`),
`controller/ReportController.java` (endpoint mới). Verify: `./gradlew compileJava compileTestJava` sạch
(chưa chạy full test suite — ReportService vốn chưa có test nào từ trước, giữ nguyên hiện trạng, không
tự thêm test suite mới ngoài phạm vi yêu cầu).

Đã KHÔNG thêm API cho phần còn lại — kiểm tra kỹ thấy **đủ dữ liệu từ API sẵn có** (không cần API mới):
- Home "Nhân công/Đã bán/Phiếu/Chờ review", "Tổ hôm nay": đã dùng từ Phase 4.
- Màn "Ngày làm việc": ghép `GET /production-records` (list, gồm draft) + `GET /reports/production-records`
  (report, CONFIRMED) + `GET /employees`/`GET /teams` — cùng cách Home Phase 4 đã làm, chỉ cần đổi
  `fromDate`/`toDate` theo ngày đang chọn.

### Frontend

- `features/reports/api.ts`/`useReports.ts`: thêm `productionDailyTrend`/`useProductionDailyTrendQuery`.
  `types/api.ts`: thêm `ProductionDailyTrendResponse`/`DailyTotalPoint` (khớp DTO backend).
  `features/reports/dateRange.ts`: thêm `last7DaysRange()`.
- **`HomeScreen.tsx`**: thêm trend "↑X% so với TB 7 ngày" dưới số "Sản lượng ghi nhận" (so hôm nay với
  TB 6 ngày trước, ẩn nếu baseline = 0 — tránh chia 0/% vô nghĩa) + section "Sản lượng 7 ngày" (biểu đồ
  cột, cột hôm nay tô đậm). Thêm link "Xem tất cả" ở "Tổ hôm nay" trỏ sang màn mới.
  **Refactor kèm theo**: tách logic tính trạng thái Tổ (`teamIdsWithDataToday`/`teamsWithoutDataToday`/
  `teamSummaries` viết tay trước đây) ra hook dùng chung `features/home/useTeamDailySummaries.ts` — vì
  màn "Ngày làm việc" mới cần đúng logic này (+ thêm `missingEmployeeNames` mà Home không cần), tách ra
  1 chỗ để tránh 2 nơi lệch nhau.
- **Màn mới "Ngày làm việc"** (`features/team-workday/TeamWorkdayScreen.tsx`, route
  `app/team-workday.tsx`) — theo đúng Claude Design 1d: điều hướng theo ngày (‹ ngày trước / ngày đang
  chọn / ngày sau ›), mỗi Tổ 1 card hiện kg (CONFIRMED) + số công nhân đã nộp/tổng + tên người còn thiếu
  (status "partial") + nút "Chụp phiếu cho Tổ X" (status "none", chỉ hiện khi xem đúng hôm nay — bấm sẽ
  set `activeTeamId` qua `useOcrSessionStore` rồi mở camera, giống hành vi "Đổi Tổ" ở CaptureScreen) /
  "Nhập tay" (status "partial", mở tab Phiếu → Nhập tay nhanh). Route ngoài `(tabs)` (giống record-detail/
  ocr-review) — vào từ link "Xem tất cả" trên Home, không thêm vào thanh tab (giữ đúng 5 tab đã chốt).
- Verify: `npx tsc --noEmit` sạch, `npx expo export --platform web` build ok. **CHƯA test bằng mắt trên
  emulator** (đợt này chỉ verify build/type) — cần chạy lại app thật để xác nhận biểu đồ/trend/màn Ngày
  làm việc hiển thị đúng với dữ liệu thật, đặc biệt nút "Chụp phiếu cho Tổ X" có set đúng Tổ trước khi
  mở camera hay không.

### Verify bằng mắt trên emulator (2026-08-13, ngay sau đó — hoàn tất phần "chưa test" ở trên)

Test qua backend LOCAL (`./gradlew bootRun`, cùng DB Supabase với Railway — chỉ khác chỗ chạy) vì
endpoint `/daily-trend` chưa deploy lên Railway. Phát hiện + sửa kèm 1 bug môi trường: `.env` local có lỗi
gõ nhầm biến `DcB_URL` thay vì `DB_URL` (file gitignore, không ai chạy local matching kỹ trước đó) khiến
Spring Boot rơi về DB mặc định `localhost:5432` — đã sửa lại đúng tên biến.

Kết quả xác nhận bằng mắt trên emulator (đăng nhập bằng mật khẩu seed mặc định `changeme123!` —
`db/migrations/002_seed_admin_user.sql`, nhắc đổi ngay ở env ngoài local):
- **Home**: card "Sản lượng 7 ngày" hiện đúng — 7 cột, cột "Hôm nay" tô đậm, cột 0kg hiện vệt mờ tối
  thiểu (không biến mất). Trend badge ẩn đúng khi baseline = 0 (đúng logic né chia-cho-0).
  Link "Xem tất cả" cạnh "Tổ hôm nay" hiện đúng vị trí.
- **Màn "Ngày làm việc"**: điều hướng ngày (‹/›) hoạt động, mỗi Tổ hiện đúng trạng thái "○ Chưa có
  phiếu" (khớp dữ liệu thật — chưa ai nộp phiếu hôm nay). Nút "Chụp phiếu cho Phong Phú" xác nhận
  **set đúng `activeTeamId` trước khi mở camera** (màn Chụp phiếu hiện đúng "Tổ: Phong Phú").
- Phát hiện 1 điều cần lưu ý (KHÔNG phải bug code): "0 công nhân" hiện cho cả 2 Tổ test — do dữ liệu
  thật (DB Supabase) hiện chưa có nhân viên active nào được gán vào 2 Tổ "Phong Phú"/"Chill Rill" —
  khớp nhất quán với Home cũng hiện "Nhân công 0/0". Không sửa gì thêm, đây là trạng thái dữ liệu thật.

Đã trả `.env.local` (mobile) về lại URL Railway production, tắt backend local — không còn tiến trình
nào chạy nền sau khi test xong.

## Đợt 4 (2026-08-25) — Hồ sơ 8 màn hình + Footer/tab-bar redesign "Vòm cong"

Plan chi tiết đầy đủ (audit + API gap + checklist từng màn): `docs/plans/0022-profile-8-screens-plan.md`
— mục này chỉ tóm tắt để tra cứu nhanh trong dòng lịch sử redesign, KHÔNG lặp lại chi tiết.

### Hồ sơ — 8 màn hình mới (thay hẳn wireframe cũ)

Nguồn: Claude Design, project `55a7676b-68b2-4a14-a355-f2ec6a0394d1`, Turn 2 "Hồ sơ — 8 màn, brand
David Dũng". Backend: migration `014_add_user_phone.sql` + `User.phone` + đăng nhập bằng SĐT (song song
email, không phá luồng cũ) + vá gap `avatarUrl` (objectPath thô → phải ký signed URL mới hiển thị được,
giống các entity ảnh khác). Frontend: `features/profile/` mới hoàn toàn — ProfileScreen, EditProfileScreen,
AvatarActionSheet, ChangePasswordScreen, AppSettingsScreen (giao diện sáng/tối/hệ thống nối
`features/settings/store.ts`, xóa dữ liệu tạm thật), AboutScreen, LogoutConfirmDialog.

**3 bug thật phát hiện + sửa lúc test trên Android Emulator** (không phải suy đoán, test tay qua
adb tap + uiautomator dump):
1. `Role` type frontend khai lowercase (`'admin'|'team_lead'`) trong khi backend `UserRole.name()` trả
   UPPERCASE — nhãn vai trò không bao giờ khớp. Sửa type khớp đúng runtime.
2. Gõ sai "Mật khẩu hiện tại" ở màn Đổi mật khẩu làm user bị ĐĂNG XUẤT LUÔN (interceptor 401 toàn cục
   coi mọi 401 là hết phiên) — thêm cờ `skipUnauthorizedHandler` cho riêng endpoint đổi mật khẩu.
3. Màn Đăng nhập validate CHỈ chấp nhận SĐT, chặn cứng cả email — trong khi Admin seed KHÔNG có SĐT, chỉ
   có email → có thể khóa cứng không đăng nhập lại được. Nới validate chấp nhận cả 2 định dạng.
4. *(phát hiện sau, từ báo cáo user riêng)* Màn Thiết lập hiện nhãn "Tắt đăng nhập bằng Face ID/vân tay"
   chỉ dựa vào có mật khẩu đã lưu (`hasSavedCredentials`), không kiểm tra máy có thật sự hỗ trợ sinh trắc
   học (`biometrics.isAvailable()`) — gây lệch với màn Đăng nhập (đúng đắn ẩn nút khi không có cảm biến).
   Sửa: đổi nhãn theo đúng thực tế thiết bị ("Xóa mật khẩu đã ghi nhớ" khi không có sinh trắc học).

**CHƯA làm** (SHOULD, không chặn MVP — để phase riêng sau nếu cần):
- Cỡ chữ (cần dựng context scale xuyên `AppText`/`AppHeading`, chưa có cơ chế này ở đâu trong
  `components/ui` — rủi ro ảnh hưởng UI mọi màn hình nếu làm vội).
- Chất lượng ảnh gửi lên (nén trước upload, phạm vi hẹp hơn — chỉ luồng upload ảnh phiếu/avatar).

### Footer/tab-bar — redesign "Vòm cong" (Turn 3, KHÔNG cùng turn với Hồ sơ)

Đọc lại đúng nguồn qua `claude_design` MCP — Turn 3 "Thanh điều hướng dưới — 3 hướng cải tiến" (3a Thanh
nổi / 3b Vòm cong / 3c Pill trượt), khớp `images/footer_design.png` user cung cấp trước đó. User chọn
**3b "Vòm cong"** (cũng là hướng designer tự đề xuất), giữ tên tab "Sản lượng" (mockup Turn 3 ghi "Tra
cứu" nhưng ghi chú cuối turn của chính designer lại dùng "Sản lượng" — mâu thuẫn ngay trong design gốc,
xác nhận không phải yêu cầu revert).

Viết lại toàn bộ `CustomTabBar` (`apps/mobile/src/app/(tabs)/_layout.tsx`) — icon SVG thật port từ chính
mockup qua `react-native-svg` (đã có sẵn dependency), nút "Chụp phiếu" chuyển từ phẳng sang nổi nhẹ.

**Sửa lại lần 2 cùng ngày** (theo góp ý sau khi lên app thật): bản đầu dùng 2 khối `Box` phẳng xếp chồng
(thanh chính + 1 khối "vòm" riêng đè lên) — tạo cảm giác 2 lớp xếp tầng, nút nổi ~36px, giống FAB đặt
trên kệ chứ không phải được thanh "ôm" vào. Đổi sang vẽ TOÀN BỘ viền thanh bằng 1 path SVG duy nhất (2
đường cong Bezier bậc 3 đối xứng tạo notch lõm mềm mại, tiếp tuyến ngang ở 4 điểm nối — không góc gãy),
giảm độ nổi nút xuống 12px (trong notch, chỉ nhô nhẹ), thêm viền mảnh quanh nút. Không thêm dependency
mới. Đã test trên Android Emulator: notch cong mượt, 4 tab cân xứng, content không bị che.

## Đợt 5 (2026-08-25, cùng ngày) — Cải tiến màn Home theo ảnh tham chiếu

Chỉ đổi presentation/UX Home, KHÔNG đổi navigation/route/business logic OCR/camera/nhập phiếu. Ảnh tham
chiếu: `images/home_screen.jjpg.jpg`. 3 quyết định xác nhận với user trước khi code: (1) bỏ DRC trung
bình — không có ở backend, không thêm; (2) thêm param `latexTypeCode` cho `/reports/production-records/
daily-trend` (backend, nhỏ gọn, tái dùng đúng pattern `/production-summary/daily` đã có); (3) dùng SVG
line-art tự vẽ thay ảnh cây cao su thật — repo không có asset ảnh nông trường, không tự tải ảnh ngoài
internet vào sản phẩm (rủi ro bản quyền/nguồn gốc).

**Backend**: `ProductionRecordItemRepository.aggregateDailyTotals` + `ReportService`/`ReportController`
— thêm param `latexTypeCode` optional (NULL = tổng, hành vi cũ không đổi). "Khác" (mủ dây+đông) không
special-case ở query — frontend gọi 2 lần rồi cộng dồn.

**Frontend** (`features/home/`): `HomeHeader.tsx` (mới, gradient + minh họa line-art bằng
`react-native-svg`, KHÔNG thêm `expo-linear-gradient`/ảnh raster), `ProductionSummaryCard.tsx` (mới,
tổng+trend giữ nguyên nguồn cũ + breakdown 4 loại mủ từ `/production-summary/daily` đã có sẵn — KHÔNG
cần API mới, responsive 2 cột/xếp dọc), `HomeIcons.tsx` (mới, icon vẽ tay màu đồng nhất — không rainbow
như ảnh, ưu tiên "restrained UI"). `HomeScreen.tsx`: 4 card gộp đôi → grid 2×2 (accent "Chờ kiểm tra"
dùng token `info` sẵn có, bấm được, giữ nguyên đích đến); "Tổ hôm nay" đổi hiển thị sang chấm ●/○ (logic
`useTeamDailySummaries` giữ nguyên, dùng chung với team-workday); "Sản lượng 7 ngày" thêm chip filter
Tổng/Mủ nước/Mủ chén/Khác. Không thêm icon-library/chart-library mới.

Đã test trên Android Emulator + backend local: header/breakdown/grid/chip trạng thái/chart filter đều
đúng dữ liệu thật, "Chờ kiểm tra" điều hướng đúng sang tab Sản lượng, không lỗi runtime mới.

## Đợt 6 (2026-08-25, cùng ngày) — Shimmer loading + sửa N+1 signed URL

User yêu cầu 2 việc: "them shimmer loading cho cac man hinh" + điều tra Home load chậm dù data test rất
ít.

**Điều tra Home chậm**: độ chậm nghiêm trọng (7-27s, log cũ) hoá ra ĐÃ được sửa gián tiếp ở Đợt 5 (đổi
"Chờ kiểm tra" sang đếm theo batch — bỏ hẳn query `production-records?status=DRAFT` không giới hạn ngày
gây chậm trước đó); test lại sạch: Home hiện load 540-764ms. Nhưng phát hiện bug hiệu năng RIÊNG, chưa
từng sửa: `ProductionRecordService`/`LatexSaleService.toResponse()` gọi `createSignedReadUrl()` (HTTP
thật tới Supabase Storage) CHO TỪNG DÒNG trong `.map()`, dù nhiều dòng cùng `photoUrl` (1 ảnh phiếu →
nhiều nhân viên, CLAUDE.md §5) — 1 batch 21 dòng ký URL trùng lặp 21 lần thay vì 1-2 lần, khiến
`GET .../production-records?scanBatchId=...` mất 1-3.5s. Sửa: `Map<String,String> signedUrlCache`
computed 1 lần/`list()` call, share qua `computeIfAbsent()` — verify curl: 21 dòng từ ~1-3.5s xuống
~140-180ms; 2 dòng cùng ảnh trả cùng 1 signed URL (cùng token), xác nhận không đổi hành vi.

**Shimmer loading**: `components/Skeleton.tsx` (mới) — primitive `Skeleton` (opacity pulse loop qua
`react-native-reanimated`, ĐÃ có sẵn dependency, không thêm mới) + `SkeletonText`/`SkeletonList`
(danh sách dạng AppCard, dùng cho hầu hết màn liệt kê)/`SkeletonDetail` (form/chi tiết)/`SkeletonChart`
(placeholder biểu đồ cột)/`SkeletonProfile` (avatar+menu)/`HomeSkeleton` (bespoke, khớp shape Home: card
sản lượng + grid 2×2 + chip Tổ + chart). Thay thế `LoadingState` (spinner+text) ở TẤT CẢ 18 màn đang
dùng nó — chọn skeleton shape khớp nội dung từng màn (list/detail/profile/chart) thay vì 1 shape chung
chung. Xoá hẳn `components/LoadingState.tsx` (không còn nơi nào import).

Verify: `tsc --noEmit` + `eslint` sạch (0 lỗi mới) trên toàn bộ file đã sửa. Test emulator: app chạy
bình thường qua các tab Hôm nay/Sản lượng/Hồ sơ/Thiết lập, không crash — do backend giờ rất nhanh (kết
quả trực tiếp từ 2 việc sửa ở trên) nên khung skeleton hiện quá nhanh để chụp màn hình bắt kịp bằng tay;
đã xác nhận đúng đắn qua code review + type-check thay vì ảnh chụp trực tiếp khung shimmer.
