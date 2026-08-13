Sử dụng `claude_design` MCP:

`https://api.anthropic.com/v1/design/mcp`

Xác thực bằng:

`/design-login`

Import và đọc project Claude Design sau:

`https://claude.ai/design/p/55a7676b-68b2-4a14-a355-f2ec6a0394d1?file=N%C3%B4ng+tr%C6%B0%E1%BB%9Dng+cao+su+-+Mobile.dc.html`

Tập trung vào file:

* `Nông trường cao su - Mobile.dc.html`

Đồng thời đọc các file dependency/import liên quan cần thiết để hiểu design, bao gồm:

* `support.js`

Ngoài ra, đọc tài liệu UI/UX của project:

`UI_UX_GUIDE_RUBBER_FARM.md`

---

# 1. Mục tiêu

Áp dụng visual design từ Claude Design vào **source code hiện tại của ứng dụng**.

Claude Design chỉ là:

> **nguồn tham chiếu về UI, visual hierarchy, layout và styling.**

Không được coi file `.dc.html` là source code mới để thay thế toàn bộ frontend hiện tại.

Không rebuild ứng dụng từ đầu dựa trên `.dc.html`.

Không copy nguyên HTML/CSS từ Claude Design vào project nếu không phù hợp với kiến trúc frontend hiện tại.

Source code hiện tại vẫn là nguồn chuẩn cho:

1. Business logic.
2. API integration.
3. Data model.
4. State management.
5. Navigation.
6. Validation.
7. Workflow đang hoạt động.

Claude Design là nguồn tham chiếu cho:

* visual hierarchy,
* layout,
* typography,
* spacing,
* màu sắc,
* component appearance,
* trạng thái UI,
* bố cục mobile.

`UI_UX_GUIDE_RUBBER_FARM.md` là nguồn chuẩn cho:

* UX rule,
* interaction pattern,
* OCR workflow,
* responsive behavior,
* accessibility,
* readability,
* visual consistency.

Nếu có xung đột, ưu tiên theo thứ tự:

```text
Business logic/source hiện tại
        ↓
UI_UX_GUIDE_RUBBER_FARM.md
        ↓
Claude Design
```

---

# 2. Các giới hạn bắt buộc

Không tự ý thay đổi:

* API contract.
* Backend endpoint.
* Request/Response DTO.
* Data model.
* Domain model.
* Business rule.
* Business validation.
* Authentication.
* State management behavior.
* Navigation flow.
* Persistence logic.

Không thêm business field chỉ vì field đó xuất hiện trong mockup Claude Design.

Không xóa field đang hoạt động trong source chỉ vì mockup không hiển thị field đó.

Không hardcode mock data từ Claude Design vào production source.

Không tự redesign nghiệp vụ.

Không tự thêm feature mới.

Nếu phát hiện cần thay đổi logic để hỗ trợ UI mới, phải:

1. Dừng tại phần đó.
2. Mô tả lý do.
3. Đề xuất thay đổi.
4. Chờ xác nhận trước khi sửa.

---

# 3. BƯỚC 1 — AUDIT SOURCE, CHƯA SỬA CODE

Ở bước đầu tiên:

**CHƯA thực hiện thay đổi source code.**

Hãy đọc frontend hiện tại và xác định:

* framework/version,
* cấu trúc project,
* React Native/Expo setup nếu có,
* navigation,
* state management,
* UI library,
* styling approach,
* theme hiện tại,
* shared components,
* screen structure,
* responsive approach.

Sau đó đối chiếu source hiện tại với:

1. `UI_UX_GUIDE_RUBBER_FARM.md`
2. `Nông trường cao su - Mobile.dc.html`

---

# 4. Lập Screen Mapping

Map từng màn hình của Claude Design với màn hình tương ứng trong source.

Ví dụ:

```text
Claude Design:
Hôm nay / Daily Dashboard

Source hiện tại:
src/screens/HomeScreen.tsx

Cần thay đổi:
- typography
- KPI hierarchy
- attention section
- spacing
- CTA visual
- card style

Không thay đổi:
- API
- data loading
- navigation
- business logic
```

Thực hiện mapping tương tự cho tất cả màn hình có liên quan.

---

# 5. Gap Analysis

Với từng màn hình, báo cáo:

```text
1. Source hiện tại đang làm gì?
2. Claude Design đang thể hiện gì?
3. UI_UX_GUIDE yêu cầu gì?
4. Điểm nào đã phù hợp?
5. Điểm nào cần thay đổi?
6. Component nào nên reuse?
7. Component nào cần tạo mới?
8. Có nguy cơ ảnh hưởng business logic hay không?
```

Không implement trong bước này.

---

# 6. Kiểm tra Design Foundation hiện tại

Kiểm tra project đã có centralized design system/theme chưa.

Tìm:

```text
colors
typography
spacing
radius
elevation/shadow
breakpoints
component variants
theme provider
```

Xác định những nơi đang hardcode như:

```text
color: '#123456'
padding: 17
fontSize: 15
borderRadius: 11
```

Nếu cùng một giá trị hoặc cùng một visual rule đang được lặp lại ở nhiều màn hình, đề xuất chuyển thành token.

---

# 7. Nguyên tắc triển khai Design System

Không tạo một design system hoàn toàn mới nếu project đã có theme/component system.

Ưu tiên:

```text
reuse
→ extend
→ refactor
```

chỉ tạo mới khi thật sự cần.

Nếu project đang sử dụng React Native Paper:

> Ưu tiên áp dụng visual system thông qua Paper Theme và component variants.

Ví dụ ưu tiên:

```text
theme.colors.primary
theme.colors.surface
theme.spacing.md
theme.typography.body
```

thay vì:

```text
'#18794E'
16
'#FFFFFF'
```

được hardcode ở nhiều file.

---

# 8. Typography mới

Typography từ Claude Design hiện có cảm giác hơi:

* condensed,
* industrial,
* nặng,
* nhiều bold,
* chưa dễ chịu khi đọc tiếng Việt.

Hãy refine typography theo hướng:

```text
Clean
Neutral
Modern
Readable
```

Ưu tiên:

```text
Inter
```

Nếu không phù hợp hoặc project không muốn thêm font:

```text
system-ui
Roboto
SF Pro
sans-serif
```

Không sử dụng:

* condensed font,
* industrial font,
* decorative font,
* serif display font.

Đảm bảo hiển thị tiếng Việt tốt.

---

# 9. Typography Scale

Sử dụng hierarchy thống nhất.

## Page title

```text
24–28px
font-weight: 600
line-height: 1.2–1.3
```

Ví dụ:

```text
Hôm nay
Chụp phiếu
Kiểm tra phiếu
Ngày làm việc
```

---

## Section title

```text
18–20px
font-weight: 600
```

---

## Body

```text
15–16px
font-weight: 400
line-height: 22–24px
```

---

## Label

```text
14–16px
font-weight: 500
```

---

## Caption / Helper text

```text
12–13px
font-weight: 400
```

Không dùng font nhỏ hơn 12px cho thông tin quan trọng.

---

## KPI

Ví dụ:

```text
2.430 kg
27 / 29
1.850 kg
```

Sử dụng:

```text
28–32px
font-weight: 600
```

Không dùng 700/800 nếu không thực sự cần.

---

## Button

```text
15–16px
font-weight: 600
```

Không uppercase toàn bộ label button.

Ưu tiên:

```text
Chụp phiếu
Hoàn tất
Xác nhận
```

thay vì:

```text
CHỤP PHIẾU
HOÀN TẤT
XÁC NHẬN
```

---

# 10. Quy tắc Font Weight

Ưu tiên:

```text
400 → body
500 → label/navigation
600 → heading/KPI/CTA
700 → hạn chế tối đa
```

Không làm tất cả text cùng đậm.

Visual hierarchy phải được tạo bằng:

* size,
* weight,
* spacing,
* màu text,

chứ không chỉ bằng bold.

---

# 11. Numeric Typography

Các dữ liệu số phải scan nhanh được.

Ví dụ:

```text
2.430 kg
```

Trong đó:

```text
2.430 → prominent
kg    → nhỏ và nhẹ hơn
```

Nếu font/framework hỗ trợ, sử dụng:

```text
tabular numbers
```

cho:

* sản lượng,
* DRC,
* tiền,
* ngày công,
* table numeric values.

Trong table:

```text
text   → căn trái
number → căn phải
```

---

# 12. Visual Direction

Giữ layout chính từ Claude Design nhưng refine visual theo hướng:

```text
Clean
Modern
Operational
Trustworthy
Calm
Readable
```

Ứng dụng phải tạo cảm giác:

> Công cụ vận hành hiện đại dành cho chủ nông trường.

Không tạo cảm giác:

* industrial software nặng nề,
* ERP cũ,
* fintech,
* game,
* startup landing page.

---

# 13. Primary Color

Màu primary hiện tại hơi thiên về:

```text
steel blue / industrial blue
```

Điều chỉnh nhẹ về:

```text
muted forest green
```

hoặc:

```text
deep teal-green
```

Yêu cầu:

* trầm,
* chuyên nghiệp,
* không neon,
* không saturated quá mạnh.

Không biến toàn bộ app thành màu xanh lá.

Primary chỉ nên nổi bật ở:

* Primary CTA.
* Active navigation.
* Selected state.
* Focus state.
* Một số highlight quan trọng.

---

# 14. Semantic Colors

Dùng nhất quán:

```text
Success → green
Warning → amber
Error   → red
Info    → blue
Neutral → gray
```

Semantic state nên sử dụng:

```text
soft tinted background
+
semantic text/icon
```

Không dùng màu saturated làm background lớn.

---

# 15. Background và Surface

Application background:

```text
very light neutral gray
```

Ví dụ visual direction:

```text
#F6F7F8
```

Surface/Card:

```text
white
```

Primary text:

```text
near-black
```

Secondary text:

```text
medium gray
```

Không dùng gray quá nhạt cho thông tin quan trọng.

---

# 16. Spacing

Sử dụng spacing scale nhất quán:

```text
4
8
12
16
24
32
48
```

Gợi ý:

```text
4–8   → khoảng cách nhỏ trong component
12–16 → field/component
24    → section
32    → major section
48    → page section lớn
```

Không sử dụng spacing ngẫu nhiên nếu không có lý do.

Ví dụ hạn chế:

```text
13
19
27
```

---

# 17. Border Radius

Khuyến nghị:

```text
Input/Button → 8px
Card         → 10–12px
Large panel  → 12–16px
Badge        → pill nếu phù hợp
```

Không dùng radius quá lớn cho toàn bộ component.

---

# 18. Border và Shadow

Bản design hiện tại đang hơi nhiều box/border.

Giảm số lượng:

```text
border
divider
card outline
```

Ưu tiên hierarchy bằng:

```text
spacing
typography
background
```

Card:

```text
background: white
border: subtle
shadow: none hoặc rất nhẹ
```

Không dùng shadow nặng.

---

# 19. Shared Components

Trước khi styling từng màn hình độc lập, kiểm tra và reuse component hiện tại.

Có thể cần các component kiểu:

```text
ScreenHeader
PrimaryButton
SecondaryButton
StatusBadge
KpiCard
AttentionItem
EmptyState
ErrorState
LoadingState
NumericInput
UnitInput
TeamStatusCard
```

Tên component thực tế phải theo convention của source hiện tại.

Không tạo component duplicate nếu project đã có component tương đương.

---

# 20. Dashboard / Home

Màn hình Home phải có hierarchy rõ.

Không để tất cả KPI có cùng trọng lượng.

Ưu tiên:

```text
PRIMARY

Sản lượng hôm nay
2.430 kg
↑ 8% so với TB 7 ngày
```

Secondary:

```text
Nhân công
27 / 29

Đã bán
1.850 kg

Phiếu
12 / 14
```

Section:

```text
Cần chú ý
```

phải dễ nhìn thấy.

CTA:

```text
Chụp phiếu
```

phải là hành động nổi bật và dễ truy cập trên mobile.

---

# 21. Warning Hierarchy

Phân biệt rõ:

## Information

Neutral/blue nhẹ.

## Needs Review

Amber nhẹ:

```text
⚠ Cần kiểm tra
```

## Blocking Error

Red:

```text
Không thể xác nhận
```

Không sử dụng cùng một warning box màu vàng cho mọi tình huống.

---

# 22. OCR Review

Đây là màn hình nghiệp vụ quan trọng nhất.

Mục tiêu:

> Mắt user phải tự động tìm tới những field có vấn đề.

### OCR đúng

Hiển thị neutral.

Ví dụ:

```text
82.5 kg
✓
```

Không cần background nổi bật.

### Cần kiểm tra

Ví dụ:

```text
[ 8.2 ] kg
⚠ Cần kiểm tra
```

Dùng:

* amber border,
* amber soft background,
* warning helper text.

### Business error

Ví dụ:

```text
DRC không hợp lệ
```

Dùng:

* red border,
* red helper text.

Không dùng warning và error cùng một visual style.

---

# 23. OCR Review trên Desktop/Tablet

Nếu có đủ không gian:

```text
Ảnh phiếu      45–50%
OCR Form       50–55%
```

Ảnh phải luôn nhìn thấy khi review.

Không yêu cầu user:

```text
mở modal ảnh
→ đóng modal
→ sửa
→ mở lại
```

nếu có thể tránh.

---

# 24. Camera

Camera phải đơn giản.

Visual priority:

```text
1. Camera viewport
2. Shutter button
3. Số ảnh đã chụp
4. Hoàn tất
5. Secondary controls
```

Không để:

* flash,
* gallery,
* thumbnail,
* camera settings

cạnh tranh với shutter.

---

# 25. Mobile ngoài thực địa

Ứng dụng có thể được sử dụng dưới ánh sáng ngoài trời.

Do đó:

* contrast phải tốt,
* body text đủ lớn,
* không dùng light gray cho dữ liệu quan trọng,
* button lớn,
* status rõ,
* warning rõ.

Touch target:

```text
tối thiểu khoảng 44–48px
```

Không đặt critical action thành icon nhỏ.

---

# 26. One-handed Usage

Các action thường xuyên nên nằm trong vùng dễ chạm bằng một tay.

Ví dụ:

```text
Chụp phiếu
Hoàn tất
Xác nhận
Thử lại
```

Không đặt primary action duy nhất ở top-right.

Có thể sử dụng:

* sticky bottom action,
* bottom action bar,

nếu phù hợp architecture hiện tại.

---

# 27. Daily Workspace

Màn hình `Ngày làm việc` phải scan cực nhanh.

Một tổ cần nhìn được:

```text
Tổ 1

632 kg
8/8 công nhân

✓ Hoàn tất
```

Status chính:

```text
Hoàn tất
Cần kiểm tra
Chưa có phiếu
```

Dùng semantic color nhẹ, không quá nhiều màu.

---

# 28. Table

Trên desktop/tablet, dữ liệu dạng danh sách nên tiếp tục sử dụng table.

Visual:

```text
header       → neutral light background
row height   → 46–52px
divider      → subtle
numbers      → right aligned
text         → left aligned
```

Không sử dụng vertical border nặng giữa tất cả column.

---

# 29. Responsive

Không lấy desktop UI rồi scale nhỏ xuống mobile.

## Mobile

```text
single column
bottom/sticky primary action
card/list
large touch targets
```

## Tablet

```text
2-pane khi có lợi cho nghiệp vụ
```

Ví dụ OCR Review.

## Desktop

```text
sidebar
table
split view
batch editing
```

---

# 30. Loading / Empty / Error

Mỗi screen phải kiểm tra đầy đủ state.

## Loading

Không block toàn app nếu chỉ một section đang load.

## Empty

Không chỉ hiển thị:

```text
Không có dữ liệu
```

Nên có CTA:

```text
Hôm nay chưa có phiếu.

[ Chụp phiếu đầu tiên ]
```

## Error

Thông báo:

1. Điều gì xảy ra?
2. User nên làm gì?

Ví dụ:

```text
Không thể xử lý ảnh.

Kết nối mạng không ổn định.
Ảnh vẫn được giữ lại.

[ Thử lại ]
```

---

# 31. Triển khai theo phase

Không refactor toàn bộ application trong một lần.

Thứ tự:

```text
Phase 1
Theme + design tokens + typography

Phase 2
Shared components

Phase 3
Home / Daily Dashboard

Phase 4
Choose document type

Phase 5
Camera + Batch Capture

Phase 6
OCR Processing + OCR Review

Phase 7
Daily Workspace

Phase 8
Production

Phase 9
Các màn hình còn lại
```

Mỗi phase phải có diff nhỏ và dễ review.

---

# 32. Validation sau mỗi màn hình

Sau khi implement từng screen, tự kiểm tra:

```text
[ ] Business logic không đổi
[ ] API call không đổi
[ ] Navigation không đổi
[ ] Không hardcode mock data
[ ] Typography đúng design system
[ ] Color dùng theme token
[ ] Spacing dùng shared token
[ ] Radius nhất quán
[ ] Loading state hoạt động
[ ] Empty state hoạt động
[ ] Error state hoạt động
[ ] Touch target đủ lớn
[ ] Tiếng Việt dễ đọc
[ ] Không có text overflow
[ ] Không có layout overflow
[ ] Responsive đúng
```

---

# 33. Implementation Discipline

Không rewrite file không liên quan.

Không refactor architecture chỉ vì muốn code “đẹp hơn”.

Không thay đổi business logic trong task UI.

Không tạo abstraction quá mức.

Ưu tiên:

```text
small diff
reuse existing code
centralized visual tokens
shared components
incremental migration
```

Nếu phát hiện cần một thay đổi kiến trúc lớn:

**Dừng lại và báo cáo trước khi thực hiện.**

---

# 34. OUTPUT CỦA BƯỚC ĐẦU TIÊN

Ở lần chạy đầu tiên, **chưa sửa code**.

Chỉ trả về:

## A. Audit frontend hiện tại

## B. Mapping

```text
Claude Design screen
→ source screen/file
```

## C. Gap Analysis

## D. Design system/theme hiện tại

## E. Những file đang hardcode UI nhiều nhất

## F. Shared component nên reuse/refactor

## G. Implementation plan theo phase

## H. Danh sách file dự kiến thay đổi cho Phase 1

Sau khi hoàn thành báo cáo:

> **Dừng lại, không implement Phase 1 cho tới khi tôi yêu cầu tiếp.**
