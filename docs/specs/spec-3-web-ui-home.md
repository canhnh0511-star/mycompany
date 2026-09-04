# WEB UI SPEC — Nông trường cao su

React + TypeScript — Phase Web UI

Trạng thái: HOME = READY FOR IMPLEMENTATION | Các màn hình khác = PENDING PREVIEW

────────

## 0. Mục đích tài liệu

Tài liệu này là đặc tả UI/UX và implementation scope cho website quản lý nông trường cao su.

Công nghệ frontend được chốt:

* React
* TypeScript
* Vite
* React Router
* TanStack Query
* React Hook Form
* Zod
* MUI
* Backend hiện có: Spring Boot REST API

Mục tiêu của website:

> Chuyên nghiệp, hiện đại, dễ hiểu ngay khi nhìn vào, ưu tiên thao tác nghiệp vụ nhanh và rõ ràng.

Đây là web app nghiệp vụ, không phải landing page marketing.

Ở thời điểm hiện tại:

* Chỉ màn hình Home / Tổng quan được đặc tả chi tiết để triển khai.
* Các màn hình khác chỉ được ghi nhận trong roadmap ở trạng thái PENDING.
* Trước khi thêm đặc tả của bất kỳ màn hình tiếp theo, cần:
  1. tạo ảnh preview,
  2. review,
  3. người dùng xác nhận,
  4. sau đó mới cập nhật vào tài liệu này.

Không tự ý thiết kế hoặc implement chi tiết các màn PENDING.

────────

## 1. Design Philosophy

Ưu tiên theo thứ tự:

1. Dễ hiểu ngay lần đầu sử dụng
2. Dễ thao tác
3. Ít bước
4. Hiển thị đúng thông tin cần thiết
5. Chuyên nghiệp
6. Đẹp

Nguyên tắc:

* Clarity > Decoration
* Action > Navigation
* Recognition > Recall
* Business language > Technical language
* Data integrity > Visual effect
* Desktop-first, responsive tablet
* Không lạm dụng card
* Không làm dashboard kiểu BI quá nặng
* Không dùng glassmorphism
* Không dùng hiệu ứng 3D
* Không dùng gradient mạnh
* Không thêm animation trang trí

────────

## 2. Chuẩn hóa ngôn ngữ UI

Toàn bộ giao diện người dùng dùng tiếng Việt.

Không hiển thị trực tiếp các thuật ngữ backend như:

* DRAFT
* NEED_REVIEW
* PROCESSING
* PRIMARY
* SUPPLEMENT
* BATCH
* OCR_CONFIDENCE

Mapping UI chuẩn:

| Internal         | UI                 |
|------------------|--------------------|
| DRAFT            | Bản nháp           |
| PROCESSING       | Đang xử lý         |
| NEED_REVIEW      | Cần kiểm tra       |
| READY_TO_APPROVE | Sẵn sàng xác nhận  |
| APPROVED         | Đã xác nhận        |
| FAILED           | Xử lý thất bại     |
| CANCELLED        | Đã hủy             |

Tên module chuẩn:

| Tên kỹ thuật       | Tên UI            |
|--------------------|-------------------|
| Dashboard           | Tổng quan         |
| Document            | Phiếu             |
| Production          | Sản lượng         |
| Attendance          | Ngày làm việc     |
| Payroll             | Bảng lương        |
| Payroll Component   | Thành phần lương  |
| Sales               | Bán mủ            |
| Revenue             | Doanh thu         |
| Cost                | Chi phí           |
| Reports             | Báo cáo           |
| Settings            | Cài đặt           |

────────

## 3. Information Architecture tổng thể

Sidebar website dự kiến:

```text
Tổng quan

CÔNG VIỆC HẰNG NGÀY
├─ Phiếu
├─ Sản lượng
└─ Ngày làm việc

TIỀN & VẬN HÀNH
├─ Bảng lương
├─ Bán mủ
└─ Chi phí

Báo cáo

CÀI ĐẶT
├─ Thành phần lương
├─ Cấu hình hệ thống
└─ Hồ sơ
```

### Trạng thái thiết kế

| Màn hình           | Trạng thái      |
|---------------------|-----------------|
| Tổng quan / Home    | **READY**       |
| Phiếu                | PENDING PREVIEW |
| Sản lượng            | PENDING PREVIEW |
| Ngày làm việc        | PENDING PREVIEW |
| Bảng lương           | PENDING PREVIEW |
| Chi tiết lương       | PENDING PREVIEW |
| Thành phần lương     | PENDING PREVIEW |
| Bán mủ               | PENDING PREVIEW |
| Chi phí              | PENDING PREVIEW |
| Báo cáo              | PENDING PREVIEW |
| Cấu hình hệ thống    | PENDING PREVIEW |
| Hồ sơ                | PENDING PREVIEW |

Không implement màn PENDING chỉ dựa vào tên module.

────────

## 4. Tech Stack Frontend

### Core

```text
React
TypeScript
Vite
```

### Routing

```text
React Router
```

### Server State

```text
TanStack Query
```

Dùng cho:

* dashboard API
* work queue
* team summary
* recent documents
* payroll summary

### UI

```text
MUI
```

Dùng theme tùy chỉnh theo brand.

Không dùng Material default appearance nguyên bản.

### Form

```text
React Hook Form
Zod
```

Home hiện tại ít form, nhưng stack giữ thống nhất cho toàn hệ thống.

### Icons

Ưu tiên:

```text
MUI Icons
```

hoặc một icon family duy nhất nếu project đã có.

Không trộn nhiều bộ icon.

────────

## 5. Project Structure đề xuất

```text
src/
├─ api/
│  ├─ client.ts
│  └─ dashboard.api.ts
│
├─ app/
│  ├─ App.tsx
│  ├─ router.tsx
│  └─ providers.tsx
│
├─ components/
│  ├─ common/
│  ├─ feedback/
│  └─ navigation/
│
├─ features/
│  └─ dashboard/
│     ├─ api/
│     ├─ components/
│     ├─ hooks/
│     ├─ model/
│     ├─ pages/
│     └─ utils/
│
├─ layouts/
│  └─ MainLayout/
│
├─ theme/
│  ├─ colors.ts
│  ├─ typography.ts
│  ├─ components.ts
│  └─ theme.ts
│
├─ types/
├─ utils/
└─ main.tsx
```

Không tạo architecture quá phức tạp.

Không dùng Redux nếu chưa có nhu cầu thực tế.

────────

## 6. HOME / TỔNG QUAN — Mục tiêu

Màn hình Home phải giúp người quản lý trả lời trong vài giây:

1. Hôm nay sản lượng bao nhiêu?
2. Có bao nhiêu người làm việc?
3. Đã bán bao nhiêu?
4. Có khoản chi nào đáng chú ý?
5. Lợi nhuận ước tính đang thế nào?
6. Có việc nào cần xử lý ngay?
7. Tình hình theo từng Tổ?
8. Bảng lương tháng hiện tại có vấn đề không?
9. Các phiếu gần nhất đang ở trạng thái nào?

Home là operational dashboard, không phải màn phân tích BI.

────────

## 7. HOME — Layout tổng thể

Desktop target: 1440px trở lên.

Cấu trúc:

```text
┌───────────────┬─────────────────────────────────────────────┐
│               │ Top bar                                      │
│               ├─────────────────────────────────────────────┤
│    Sidebar    │ Page title + Greeting                        │
│               ├─────────────────────────────────────────────┤
│               │ KPI Row                                       │
│               ├─────────────────────────────────────────────┤
│               │ Work Queue      │ Team Status                 │
│               ├─────────────────────────────────────────────┤
│               │ Payroll Summary │ Recent Documents             │
│               ├─────────────────────────────────────────────┤
│               │ Footer/version                                │
└───────────────┴─────────────────────────────────────────────┘
```

────────

## 8. Sidebar

### Width

```text
240px
```

Cho phép khoảng:

```text
224–256px
```

### Background

Deep Forest Green.

Ví dụ token tham khảo:

```text
#0F5C3B
```

Không bắt buộc đúng hex nếu design system hiện tại đã có token khác.

### Logo area

Hiển thị:

```text
DAVID DŨNG
Nông trường cao su
```

Logo trắng hoặc phiên bản monochrome phù hợp sidebar.

### Active item

Ví dụ Tổng quan active:

* background rất nhạt
* text deep green
* icon deep green
* radius 8–10px
* không dùng glow

### Group label

Ví dụ:

```text
CÔNG VIỆC HẰNG NGÀY
TIỀN & VẬN HÀNH
CÀI ĐẶT
```

Style:

* uppercase
* 11–12px
* opacity thấp hơn
* spacing rõ

### Footer sidebar

Hiển thị user:

```text
David Dũng
Quản lý
```

Có dropdown icon.

────────

## 9. Top Bar / Header

Top bar nằm phía trên content.

Phần trái:

```text
Tổng quan
Xin chào, David Dũng! Chúc bạn một ngày làm việc hiệu quả.
```

Không cần breadcrumb trên Home.

Phần phải:

```text
[ 04/09/2026 (Thứ Sáu) ▼ ]   🔔   David Dũng ▼
```

### Date Selector

* không quá nổi bật
* outline neutral
* icon calendar
* dùng context ngày làm việc hiện tại

### Notification

Badge đỏ chỉ hiển thị khi có notification.

### User Menu

Có avatar/name.

Không hiển thị nhiều action trực tiếp trên top bar.

────────

## 10. HOME — KPI Row

Hiển thị tối đa 5 KPI theo ảnh reference:

1. Sản lượng hôm nay
2. Nhân công hôm nay
3. Đã bán hôm nay
4. Chi phí hôm nay
5. Lợi nhuận ước tính

Desktop:

```text
5 cards / 1 row
```

Nếu viewport hẹp:

```text
3 + 2
```

Tablet:

```text
2 cards / row
```

Không buộc mobile web giữ layout này.

────────

## 11. KPI Card Component

Component đề xuất:

```ts
<KpiCard />
```

Props concept:

```ts
type KpiCardProps = {
  title: string;
  value: string;
  helper?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label: string;
    semantic?: 'positive' | 'negative' | 'neutral';
  };
  icon: React.ReactNode;
  tone?: 'green' | 'blue' | 'amber' | 'purple';
};
```

Không để component biết nghiệp vụ cụ thể.

### Card style

* background white
* border 1px neutral
* radius 12–14px
* shadow rất nhẹ hoặc không shadow
* padding 16–20px

Không dùng gradient.

────────

## 12. KPI — Sản lượng hôm nay

Hiển thị:

```text
Sản lượng hôm nay
1.804 kg
```

Secondary line:

```text
Tổ 1: 742 kg
Tổ 2: 612 kg
Tổ 3: 450 kg
```

Trend:

```text
↑ 12%
so với hôm qua
```

Chỉ hiển thị trend nếu backend có dữ liệu so sánh thật.

Không mock trend trên production.

────────

## 13. KPI — Nhân công hôm nay

Hiển thị:

```text
Nhân công hôm nay
21 / 30

Đi làm / Tổng số
```

Quan trọng:

Không được dùng denominator 30 nếu chưa có daily roster / expected workers đáng tin cậy.

Nếu backend chưa có denominator chính xác:

```text
21 người có mặt
```

thay vì:

```text
21 / 30
```

────────

## 14. KPI — Đã bán hôm nay

Ví dụ:

```text
Đã bán hôm nay
1.684 kg
72.450.000 ₫
```

Không tính DRAFT / chưa xác nhận vào doanh thu chính thức.

────────

## 15. KPI — Chi phí hôm nay

Ví dụ:

```text
Chi phí hôm nay
18.750.000 ₫
8 khoản chi
```

Nếu chưa có module chi phí thực tế:

* component phải hỗ trợ state unavailable
* không fake data

────────

## 16. KPI — Lợi nhuận ước tính

Label bắt buộc:

```text
Lợi nhuận ước tính
```

Không dùng:

```text
Lợi nhuận
Lợi nhuận kế toán
```

nếu hệ thống chưa phải accounting system.

Có thể tính concept:

```text
Doanh thu xác nhận - Chi phí hợp lệ
```

nhưng implementation phải dùng rule backend được xác nhận.

────────

## 17. Section — Cần xử lý

Đây là phần quan trọng nhất sau KPI.

Title:

```text
Cần xử lý
```

Badge:

```text
5
```

Action header:

```text
Xem tất cả
```

Mỗi issue phải:

* mô tả vấn đề bằng ngôn ngữ nghiệp vụ
* có helper text
* có CTA cụ thể
* deep-link thẳng đến đúng màn xử lý

Không tạo generic notification feed.

────────

## 18. Work Queue Item

Component:

```ts
<WorkQueueItem />
```

Concept props:

```ts
type WorkQueueItemProps = {
  severity: 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
};
```

Ví dụ:

```text
⚠ Tổ 3 chưa có phiếu ngày 04/09
Cần chụp phiếu để có dữ liệu sản lượng
[ Chụp / Xem ]
```

```text
⚠ 2 phiếu cần kiểm tra
OCR có độ tin cậy thấp
[ Kiểm tra ]
```

```text
! 2 người chưa có sản lượng
Không thể tính lương
[ Xem danh sách ]
```

```text
i Bảng lương tháng 09 còn 3 người thiếu dữ liệu
Cần bổ sung để chốt bảng lương
[ Xem chi tiết ]
```

────────

## 19. Work Queue — UX Rules

Không show:

```text
NEED_REVIEW = 2
```

Phải show:

```text
2 phiếu cần kiểm tra
```

Không CTA:

```text
View
Open
Details
```

Ưu tiên:

```text
Kiểm tra
Xem danh sách
Chấm công
Xem chi tiết
```

────────

## 20. Section — Tình hình theo Tổ

Title:

```text
Tình hình theo tổ (hôm nay)
```

Action:

```text
Xem chi tiết
```

Dùng TABLE, không dùng card-per-team.

Columns:

```text
Tổ
Sản lượng (kg)
Nhân công
Đã bán (kg)
Trạng thái
```

Footer row:

```text
Tổng
```

────────

## 21. Team Status Table

Ví dụ:

| Tổ   | Sản lượng | Nhân công | Đã bán | Trạng thái   |
|------|----------:|----------:|-------:|--------------|
| Tổ 1 | 742       | 8 / 10    | 700    | Đủ dữ liệu   |
| Tổ 2 | 612       | 9 / 10    | 584    | Đủ dữ liệu   |
| Tổ 3 | 450       | 4 / 10    | 400    | Thiếu phiếu  |

### Rules

* số căn phải
* text căn trái
* status badge
* row height khoảng 48–52px
* hover nhẹ
* không zebra stripe quá mạnh

────────

## 22. Status Badge

Component:

```ts
<StatusBadge />
```

Các semantic state:

```text
Đủ dữ liệu
Thiếu phiếu
Cần kiểm tra
Đã xác nhận
Bản nháp
```

Badge style:

* background tint rất nhạt
* text semantic
* border optional
* không dùng màu neon

────────

## 23. Section — Bảng lương tháng

Title:

```text
Bảng lương tháng 09/2026
```

Action:

```text
Xem chi tiết
```

Summary:

```text
Tổng dự kiến
120.500.000 ₫

30 nhân viên
3 cần kiểm tra
```

Có thể hiển thị distribution:

```text
27 Đủ dữ liệu
3 Thiếu dữ liệu
0 Chờ xác nhận
0 Đã chốt
```

────────

## 24. Payroll Summary Visualization

Ảnh reference dùng donut chart.

Có thể dùng donut chart nhẹ nếu dữ liệu thực sự hữu ích.

Rule:

* tối đa 4 trạng thái
* không biến dashboard thành BI
* chart phải có số chính ở center
* legend dễ đọc
* không dùng chart nếu chỉ có 1 trạng thái

Nếu chart không mang lại giá trị, dùng progress summary thay thế.

────────

## 25. Payroll CTA

Primary CTA trong card:

```text
Xem bảng lương
```

Không dùng:

```text
Chốt ngay
```

trực tiếp trên Home.

Chốt bảng lương phải diễn ra trong payroll flow sau validation.

────────

## 26. Section — Phiếu mới nhất

Title:

```text
Phiếu mới nhất
```

Action:

```text
Xem tất cả
```

Table columns:

```text
Mã phiếu
Loại phiếu
Ngày
Tổ
Trạng thái
```

Ví dụ:

```text
PH-2026-0904-0007
Sổ ghi mủ
04/09/2026
Tổ 2
Cần kiểm tra
```

────────

## 27. Recent Document Table Rules

Chỉ hiển thị khoảng:

```text
4–6 rows
```

Không biến Home thành document management page.

Click row:

```text
→ mở chi tiết phiếu
```

Nếu phiếu Cần kiểm tra:

có thể deep-link vào review flow tương ứng.

────────

## 28. HOME — Responsive behavior

### Desktop >= 1280px

* sidebar expanded
* 5 KPI cùng hàng nếu đủ width
* main section dùng 2 columns

Layout content:

```text
Work Queue      45%
Team Status     55%

Payroll         45%
Recent Forms    55%
```

Không bắt buộc đúng 45/55 nếu viewport khác.

### Tablet 768–1279px

* sidebar collapsible
* KPI: 2 hoặc 3 columns
* sections stack hoặc 2 columns khi đủ rộng
* table có horizontal handling hợp lý

### Mobile web < 768px

Không ưu tiên pixel-perfect ở Phase hiện tại.

Yêu cầu:

* navigation chuyển drawer
* KPI stack
* tables đổi sang compact rows/card-list nếu cần
* không shrink desktop table đến mức khó đọc

────────

## 29. Grid & Spacing

Main padding desktop:

```text
24–32px
```

Spacing scale:

```text
4
8
12
16
24
32
```

Section gap:

```text
16–24px
```

────────

## 30. Design Tokens

Concept tokens:

```ts
primary.main
primary.dark
primary.light

background.default
background.paper

text.primary
text.secondary

success.main
warning.main
error.main
info.main

border.default
```

Reference direction:

```text
Primary: Deep Forest Green
Background: very light warm gray-green
Surface: White
Warning: warm amber
Danger: semantic red
Info: blue
```

Không hard-code màu rải rác trong component.

────────

## 31. Typography

Font ưu tiên:

```text
Inter
```

Fallback:

```text
system-ui
Arial
sans-serif
```

Hierarchy:

```text
Page Title: 24–28px / 700
Section Title: 16–18px / 600–700
KPI Value: 24–32px / 700
Body: 14–16px / 400
Caption: 12–13px
Table Header: 12–13px / 600
```

Dùng tabular numbers nếu hỗ trợ cho số tiền/sản lượng.

────────

## 32. Formatting

Tiền:

```text
120.500.000 ₫
```

Khối lượng:

```text
1.804 kg
```

Ngày:

```text
04/09/2026
```

Top bar:

```text
04/09/2026 (Thứ Sáu)
```

Tạo utility dùng chung, không format rải rác trong component.

────────

## 33. Loading / Error / Empty

### Loading

Dùng skeleton cho từng widget.

Không dùng full-screen spinner nếu layout shell đã tải.

### Widget error

Một widget lỗi không được làm cả dashboard fail.

Ví dụ:

```text
Không thể tải dữ liệu bảng lương.
[ Thử lại ]
```

### Empty Work Queue

```text
✓ Không có việc cần xử lý

Dữ liệu hôm nay đã đầy đủ.
```

────────

## 34. Refresh & Cache

Dùng TanStack Query.

Concept:

* fetch khi mở Home
* refetch khi window focus nếu phù hợp
* invalidate sau khi xử lý dữ liệu ở module khác
* không polling liên tục nếu không cần

────────

## 35. Dashboard API View Model

Concept:

```ts
type DashboardResponse = {
  workDate: string;

  kpis: {
    productionKg?: number;
    workforcePresent?: number;
    workforceExpected?: number;
    soldKg?: number;
    revenue?: number;
    cost?: number;
    estimatedProfit?: number;
  };

  trends?: {
    production?: Trend;
    sold?: Trend;
    cost?: Trend;
    estimatedProfit?: Trend;
  };

  workQueue: DashboardWorkItem[];
  teams: DashboardTeamSummary[];
  payroll?: DashboardPayrollSummary;
  recentDocuments: DashboardRecentDocument[];
};
```

Không bắt backend phải dùng chính xác endpoint/model này nếu domain hiện tại đã có cấu trúc phù hợp.

────────

## 36. Navigation from Home

CTA phải deep-link đúng context.

Ví dụ:

```text
2 phiếu cần kiểm tra
→ /documents?status=needs-review&date=2026-09-04
```

```text
Bảng lương còn 3 người thiếu dữ liệu
→ /payroll/2026-09?filter=incomplete
```

Nếu đang xem ngày cũ:

* giữ context ngày
* không tự reset về hôm nay

────────

## 37. Accessibility

Bắt buộc:

* keyboard navigation
* visible focus
* icon-only action có aria-label
* status có text/icon, không chỉ dùng màu
* contrast đủ
* semantic table
* body text khoảng 14–16px

────────

## 38. Performance

* lazy-load các module ngoài Home
* không bundle chart library lớn chỉ vì một donut nhỏ
* cache server state hợp lý
* tránh render lại toàn dashboard vì state nhỏ
* audit bundle size nếu thêm chart library

────────

## 39. Component Inventory — Home

```text
MainLayout
Sidebar
TopBar
DashboardHeader
KpiCard
DashboardKpiGrid
WorkQueuePanel
WorkQueueItem
TeamStatusPanel
TeamStatusTable
PayrollSummaryPanel
RecentDocumentsPanel
StatusBadge
LoadingSkeleton
WidgetErrorState
WidgetEmptyState
```

────────

## 40. Component Boundaries

Không viết toàn bộ Dashboard trong một file lớn.

Đề xuất:

```text
features/dashboard/
├─ pages/
│  └─ DashboardPage.tsx
├─ components/
│  ├─ DashboardKpiGrid.tsx
│  ├─ WorkQueuePanel.tsx
│  ├─ TeamStatusPanel.tsx
│  ├─ PayrollSummaryPanel.tsx
│  └─ RecentDocumentsPanel.tsx
├─ hooks/
│  └─ useDashboard.ts
├─ api/
│  └─ dashboard.api.ts
└─ model/
   └─ dashboard.types.ts
```

────────

## 41. Không được làm

Không:

* fake business data trên production
* hard-code số nhân viên/tổ
* hard-code ngày làm việc
* hard-code status mapping ở nhiều nơi
* dùng any
* gọi API trực tiếp trong presentation component
* thêm Redux chỉ cho Dashboard
* viết CSS magic values rải rác
* thêm chart không có mục đích
* biến Home thành báo cáo tài chính
* hiển thị quá nhiều KPI
* bắt user click nhiều bước mới tới issue

────────

## 42. Acceptance Criteria — Home

### Layout

* [ ] Sidebar đúng hierarchy.
* [ ] Top bar rõ ràng.
* [ ] KPI row dễ scan.
* [ ] Cần xử lý có độ ưu tiên cao.
* [ ] Tình hình theo Tổ dùng table.
* [ ] Payroll summary gọn.
* [ ] Recent documents không quá dài.

### UX

* [ ] User nhìn vào biết hôm nay có việc gì.
* [ ] Mỗi issue có CTA rõ.
* [ ] CTA deep-link đúng context.
* [ ] Không dùng thuật ngữ backend.
* [ ] Không overload màn hình.

### Responsive

* [ ] Desktop tốt.
* [ ] Tablet usable.
* [ ] Mobile web không vỡ layout.

### Technical

* [ ] React + TypeScript.
* [ ] Không any.
* [ ] TanStack Query quản lý server state.
* [ ] MUI theme dùng token.
* [ ] Component tách hợp lý.
* [ ] Loading/error/empty state đầy đủ.

────────

## 43. Test Cases — Home

**HOME-01 — Load success**

Dashboard trả dữ liệu đầy đủ:

* KPI render đúng
* Work Queue render đúng
* Team table render đúng
* Payroll summary render đúng
* Recent documents render đúng

**HOME-02 — Partial data**

Nếu cost/profit chưa có:

* không fake value
* ẩn hoặc hiển thị unavailable theo rule

**HOME-03 — No work queue**

Hiển thị:

```text
Không có việc cần xử lý
```

**HOME-04 — Team incomplete**

Nếu Tổ 3 thiếu phiếu:

* status Thiếu phiếu
* warning visible

**HOME-05 — Review deep-link**

Bấm Kiểm tra từ 2 phiếu cần kiểm tra:

* điều hướng đến đúng ngày
* đúng status/filter

**HOME-06 — Payroll issue**

Nếu 3 người thiếu dữ liệu:

* Payroll Summary thể hiện rõ
* Xem bảng lương điều hướng đúng context

**HOME-07 — Loading**

* dùng skeleton
* không full-screen spinner

**HOME-08 — Widget error**

Payroll widget lỗi:

* các widget khác vẫn hoạt động

────────

## 44. PENDING — Các màn hình tiếp theo

Chưa đặc tả UI chi tiết:

```text
Phiếu
Sản lượng
Ngày làm việc
Bảng lương
Chi tiết lương
Thành phần lương
Bán mủ
Chi phí
Báo cáo
Cấu hình hệ thống
Hồ sơ
```

Trạng thái:

```text
PENDING PREVIEW
```

────────

## 45. Quy trình bắt buộc cho từng màn tiếp theo

```text
1. Chọn đúng 1 màn hình.
2. Tạo ảnh high-fidelity preview.
3. Review:
   - layout
   - terminology
   - usability
   - business flow
4. User xác nhận.
5. Cập nhật đặc tả màn đó vào file MD.
6. Chỉ sau đó mới chuyển sang màn kế tiếp.
```

Không thiết kế hàng loạt các màn còn lại trong cùng một lượt.

────────

## 46. Thứ tự preview đề xuất

```text
1. Bảng lương
2. Chi tiết lương
3. Thành phần lương
4. Ngày làm việc
5. Sản lượng
6. Phiếu
7. Bán mủ
8. Chi phí
9. Báo cáo
10. Cấu hình hệ thống
11. Hồ sơ
```

Đây chỉ là roadmap, không phải scope implementation hiện tại.

────────

## 47. Instruction cho Coding Agent

Nếu tài liệu này được đưa cho Coding Agent:

> Chỉ implement màn Home/Tổng quan và shared components cần thiết trực tiếp cho Home.

Không tự implement các page đang PENDING.

Sidebar có thể hiển thị IA đầy đủ nếu cần, nhưng route chưa triển khai phải:

* disabled,
* hoặc hiển thị Đang phát triển,
* hoặc chưa expose tùy quyết định của project.

Không invent UI hoặc business behavior cho màn chưa được duyệt.

────────

## 48. Definition of Done — Home Web

Home được coi là hoàn thành khi:

* UI bám sát reference đã duyệt.
* Brand Deep Forest Green nhất quán.
* Sidebar rõ ràng.
* Dashboard đọc nhanh.
* Không có dữ liệu mock trong runtime production.
* Work Queue deep-link đúng.
* Responsive desktop/tablet tốt.
* Loading/error/empty đầy đủ.
* Không show thuật ngữ kỹ thuật.
* Code React + TypeScript sạch và dễ mở rộng.
* Không khóa kiến trúc theo mock.
* Các màn khác vẫn ở trạng thái PENDING.

────────

## 49. Trạng thái tài liệu

```text
HOME / TỔNG QUAN
STATUS = READY FOR IMPLEMENTATION

ALL OTHER SCREENS
STATUS = PENDING PREVIEW
```
