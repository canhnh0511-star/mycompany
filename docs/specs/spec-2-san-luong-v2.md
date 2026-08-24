# Bổ sung — Yêu cầu màn hình Sản lượng v2

## 0. Mục tiêu
Màn hình Sản lượng là màn hình tra cứu và tổng hợp dữ liệu đã được ghi nhận từ:

* Sổ ghi mủ.
* OCR.
* Nhập tay.
* Các lần bổ sung đã được xác nhận.

Mục tiêu:
Giúp Admin biết nhanh trong một ngày/tháng đã có bao nhiêu sản lượng được xác nhận, sản lượng đến từ tổ nào/nhân viên nào/loại mủ nào, còn dữ liệu nào chưa hoàn tất và có thể truy ngược một con số về phiếu nguồn khi cần đối chiếu.
Màn hình Sản lượng:

* không phải màn hình nhập liệu chính;
* không tạo một nguồn dữ liệu nghiệp vụ mới;
* không cho chỉnh trực tiếp tổng sản lượng;
* chỉ là projection/aggregation từ dữ liệu nghiệp vụ nguồn.

## 1. Phạm vi triển khai
Phân chia requirement thành 3 mức để tránh agent implement quá phạm vi.

### MUST — MVP
Bắt buộc trong phase Sản lượng đầu tiên:

```text
Daily Production
Official Production
Breakdown theo Tổ
Drill-down theo nhân viên
Drill-down tới record
Truy ngược tới phiếu/ảnh nguồn
Filter ngày
Filter Tổ
Filter loại mủ
Trạng thái dữ liệu chưa hoàn tất
Loading
Empty
Error
Refresh
Responsive mobile/tablet/desktop
Không double-count
```

### SHOULD
Chỉ implement nếu source/API hiện tại hỗ trợ hợp lý hoặc effort nhỏ:

```text
Monthly Production
Search nhân viên
Export Excel
Monthly employee production
```

### LATER
Ngoài scope MVP:

```text
Provisional / sản lượng tạm tính
Chart 7 ngày
Advanced sorting
Advanced analytics
Trend / anomaly
DRC tổng hợp
```

Agent không tự implement LATER trong phase MVP.

## 2. Single source of truth
Sản lượng phải được tính từ dữ liệu nghiệp vụ nguồn.
Flow:

```text
Phiếu / dữ liệu nhập
        ↓
OCR / Nhập tay
        ↓
Review
        ↓
APPROVED
        ↓
Aggregation
        ↓
Màn hình Sản lượng
```

Không tạo một dữ liệu tổng độc lập có thể chỉnh tay.
Không cho user:

```text
Tổng sản lượng: 1.350 kg

→ sửa trực tiếp thành 1.400 kg
```

Nếu phát hiện sai:

```text
Sản lượng
→ Tổ
→ Nhân viên
→ Record
→ Phiếu nguồn
→ xử lý tại nghiệp vụ nguồn
```

## 3. Official Production
Sản lượng chính thức chỉ tính dữ liệu đã được xác nhận.

```text
Official Production =

APPROVED PRIMARY records
+
APPROVED SUPPLEMENT records
```

Không tính dữ liệu từ batch:

```text
DRAFT
UPLOADING
PROCESSING
NEED_REVIEW
READY_TO_APPROVE
PARTIAL_FAILED
FAILED
CANCELLED
```

Không tính dữ liệu:

```text
PENDING_MOVE
```

cho tới khi flow move hoàn tất hợp lệ.

## 4. Supplement
Ví dụ:

```text
22/08
Tổ 2

PRIMARY APPROVED
= 1.200 kg

SUPPLEMENT APPROVED
= 150 kg
```

Official Production:

```text
1.200 + 150
= 1.350 kg
```

UI:

```text
Sản lượng đã xác nhận

1.350 kg

Có dữ liệu bổ sung sau xác nhận
```

Không expose các thuật ngữ kỹ thuật:

```text
PRIMARY
SUPPLEMENT
revisionNo
LogicalBatchKey
```

cho user phổ thông.

## 5. Trạng thái tổng hợp của Tổ
Không xác định trạng thái Tổ chỉ bằng status của một batch.
Một Tổ có thể đồng thời:

```text
PRIMARY = APPROVED
SUPPLEMENT = NEED_REVIEW
```

Khi đó:

* phần PRIMARY đã là production chính thức;
* phần supplement chưa được tính;
* Tổ vẫn còn việc cần xử lý.

Ví dụ UI:

```text
Tổ 2

1.200 kg đã xác nhận

⚠ Có 1 phiếu bổ sung cần kiểm tra
```

Không chỉ hiển thị:

```text
✓ Đã xác nhận
```

vì sẽ khiến user nghĩ ngày/tổ đã hoàn tất hoàn toàn.

## 6. Derived Team Status
UI status phải được derive từ toàn bộ trạng thái liên quan.

**Case A — chưa có dữ liệu**
```text
Không có PRIMARY
Không có active Supplement

→ Chưa có dữ liệu
```

**Case B — PRIMARY đang xử lý**
```text
DRAFT / UPLOADING / PROCESSING

→ Đang xử lý
```

**Case C — PRIMARY cần review**
```text
NEED_REVIEW / PARTIAL_FAILED

→ Cần kiểm tra
```

**Case D — PRIMARY chờ approve**
```text
READY_TO_APPROVE

→ Chờ xác nhận
```

**Case E — PRIMARY APPROVED, không có active supplement**
```text
→ Đã xác nhận
```

**Case F — PRIMARY APPROVED + active supplement**
```text
→ Sản lượng chính đã xác nhận
→ Đồng thời hiển thị "Có dữ liệu bổ sung đang xử lý"
```

**Case G — FAILED**
```text
→ Xử lý thất bại
```

## 7. Default Screen
Khi mở Sản lượng:

```text
Ngày = Hôm nay
Tổ = Tất cả
Loại mủ = Tất cả
```

Không bắt user chọn filter trước.
Ví dụ:

```text
SẢN LƯỢNG

<      22/08/2026      >

Sản lượng đã xác nhận
2.430 kg
```

## 8. Date Navigation
Mobile:

```text
<      22/08/2026      >
```

Cho phép:

```text
Previous day
Next day
Chọn ngày
Hôm nay
```

Không bắt mở date picker chỉ để chuyển ngày trước/sau.

## 9. Summary
Phần đầu màn hình phải trả lời:
Ngày đang xem đã có bao nhiêu sản lượng được xác nhận?
Ví dụ:

```text
Sản lượng đã xác nhận

2.430 kg
```

Breakdown:

```text
Mủ nước     1.850 kg
Mủ chén       420 kg
Mủ dây        110 kg
Mủ đông        50 kg
```

Không cần 4 KPI card lớn.

## 10. Điều kiện hiển thị Tổng kg
Không được mặc định:

```text
Tổng =
Mủ nước + Mủ chén + Mủ dây + Mủ đông
```

nếu business chưa xác nhận các loại mủ được phép cộng trực tiếp theo raw kg.
Rule:

```text
Nếu business xác nhận:
Tất cả loại mủ đều cùng đơn vị kg
và được phép cộng trực tiếp

→ được hiển thị TOTAL_PRODUCTION_KG
```

Nếu chưa xác nhận:

```text
→ KHÔNG hiển thị KPI "Tổng kg"
→ chỉ hiển thị breakdown từng loại mủ
```

Agent phải audit business/domain hiện tại trước khi implement phép cộng.
Mockup không được coi là bằng chứng nghiệp vụ.

## 11. DRC
DRC chỉ áp dụng cho:

```text
Mủ nước
```

Không có DRC cho:

```text
Mủ chén
Mủ dây
Mủ đông
```

Không tự tạo:

```text
AVG(DRC)
```

cho Tổ/ngày/tháng.
Nếu chưa có công thức business chính thức:

```text
DRC chỉ hiển thị ở record/nhân viên
```

Không tạo KPI DRC tổng hợp.

## 12. Không hiển thị Provisional trong MVP
MVP không hiển thị sản lượng tạm tính.
Không show:

```text
Đã xác nhận
1.420 kg

Tạm tính
~860 kg
```

Chỉ show:

```text
Đã xác nhận
1.420 kg

⚠ Còn dữ liệu đang xử lý
```

Lý do:

* tránh user nhầm số tạm thành số chính thức;
* tránh phải định nghĩa phức tạp record nào đủ điều kiện provisional;
* giảm scope MVP.

Provisional chỉ được thiết kế ở phase sau nếu business thực sự cần.

## 13. Breakdown theo Tổ
Ví dụ:

```text
Theo tổ

Tổ 1
632 kg đã xác nhận
8 công nhân có sản lượng
✓ Đã xác nhận

Tổ 2
798 kg đã xác nhận
⚠ Có dữ liệu bổ sung cần kiểm tra

Tổ 3
Đang xử lý OCR

Tổ 4
Chưa có dữ liệu
```

User bấm Tổ:

```text
→ Chi tiết Tổ
```

## 14. Không tự dùng denominator nhân viên
Không hiển thị:

```text
7/9 công nhân
```

trừ khi hệ thống có dữ liệu đáng tin cậy về:

```text
expectedWorkersForDate
```

Ví dụ daily roster đã xác định:

```text
Tổ 2 hôm nay:
9 người được kỳ vọng có sản lượng
```

Khi đó mới được show:

```text
7/9 công nhân
```

Nếu chưa có Daily Roster:

```text
7 công nhân có ghi nhận sản lượng
```

Không suy ra denominator từ tổng số nhân viên đang active trong Tổ.

## 15. Không tự dùng denominator Tổ
Tương tự, không hiển thị:

```text
3/4 tổ hoàn tất
```

nếu hệ thống chưa biết:

```text
expectedTeamsForDate
```

Nếu chưa có daily roster/work plan:
UI nên nói:

```text
3 tổ đã xác nhận dữ liệu
1 tổ đang có dữ liệu cần xử lý
```

Không kết luận toàn nông trường "đã hoàn tất".

## 16. Khi nào được gọi là "Ngày hoàn tất"
Chỉ hiển thị:

```text
✓ Dữ liệu ngày 22/08 đã hoàn tất
```

nếu tồn tại rule rõ ràng xác định:

```text
expectedTeamsForDate
```

và tất cả các Tổ bắt buộc:

```text
đã APPROVED
không còn active Supplement
không còn blocking issue
```

Nếu không có expected roster:
Không dùng trạng thái "Ngày hoàn tất".

## 17. Chi tiết Tổ
Ví dụ:

```text
TỔ 1
22/08/2026

632 kg đã xác nhận
8 công nhân có sản lượng
```

Danh sách:

```text
Nguyễn Văn A

Mủ nước     82.5 kg
DRC         30.5 %
Mủ chén      3.2 kg

Trần Văn B

Mủ nước     74.0 kg
DRC         29.8 %
Mủ chén      4.0 kg
```

Chỉ hiển thị `Tổng` nếu business rule tại mục 10 cho phép cộng các loại mủ.

## 18. Mobile Employee List
Không dùng table ngang quá rộng.
Ví dụ:

```text
┌──────────────────────────┐
│ Nguyễn Văn A             │
│                          │
│ Mủ nước       82.5 kg    │
│ DRC            30.5 %    │
│ Mủ chén         3.2 kg   │
│                          │
│ Xem chi tiết             │
└──────────────────────────┘
```

Nếu có quá nhiều loại:

* chỉ hiển thị các loại có dữ liệu;
* detail mở sâu hơn khi user cần.

## 19. Desktop / Tablet
Ưu tiên table:

```text
-----------------------------------------------------------------
Nhân viên      Tổ    Mủ nước    DRC    Mủ chén   Mủ dây   Mủ đông
-----------------------------------------------------------------
Nguyễn Văn A    1      82.5     30.5      3.2       1.0       -
Trần Văn B      1      74.0     29.8      4.0         -       -
-----------------------------------------------------------------
```

Nếu business cho phép tính tổng:

```text
→ thêm cột Tổng
```

Text căn trái.
Numeric căn phải.
Không dùng border dọc nặng.

## 20. Filter
MVP:

```text
Ngày
Tổ
Loại mủ
```

Mobile:

```text
[Tất cả tổ ▼] [Tất cả loại mủ ▼]
```

Desktop có thể thêm:

```text
Nhân viên
Trạng thái
```

## 21. Filter phải áp dụng nhất quán
Ví dụ:

```text
Loại mủ = Mủ nước
```

thì:

* KPI summary chỉ tính mủ nước;
* Team breakdown chỉ tính mủ nước;
* employee breakdown chỉ hiển thị mủ nước;
* DRC có thể hiển thị theo record;
* không thay đổi dữ liệu lưu DB.

Filter chỉ thay đổi projection.

## 22. Drill-down
Bắt buộc truy ngược:

```text
Daily Production
↓
Team
↓
Employee
↓
Production Record
↓
Source
↓
Source Image / Manual Entry
```

User phải trả lời được:
82.5 kg này lấy từ đâu?

## 23. Source Metadata
Phải phân biệt hai dimension khác nhau.

**Data Capture Method**
```text
OCR
Nhập tay
```

**Lifecycle / Origin Context**
```text
Dữ liệu chính
Bổ sung sau xác nhận
```

Một record có thể đồng thời:

```text
Phương thức ghi nhận:
OCR

Nguồn nghiệp vụ:
Bổ sung sau xác nhận
```

Không dùng một field `Nguồn` để chứa cả hai ý nghĩa.

## 24. Record Detail
Ví dụ:

```text
Ngày
22/08/2026

Tổ
Tổ 2

Nhân viên
Nguyễn Văn A

Mủ nước
82.5 kg

DRC
30.5 %

Phương thức ghi nhận
OCR

Loại dữ liệu
Dữ liệu chính

Phiếu nguồn
IMG-006

[ Xem ảnh gốc ]
```

Nếu từ Supplement:

```text
Loại dữ liệu
Bổ sung sau xác nhận

Ngày bổ sung
...

Người xác nhận
...
```

## 25. PENDING_MOVE
Record `PENDING_MOVE`:

```text
không tính vào source official production
không tính vào target official production
```

UI source date:

```text
⚠ 1 phiếu đang được chuyển sang ngày 21/08.

Phiếu này chưa được tính vào sản lượng.
```

Không để tổng giảm mà user không biết nguyên nhân.

## 26. Move hoàn tất
Khi target supplement APPROVED:

```text
source:
không còn tính record

target:
bắt đầu tính record
```

Không được tồn tại permanent state:

```text
source tính
+
target tính
```

cho cùng một record.

## 27. Supplement CANCELLED sau PENDING_MOVE
Đây là rule quan trọng.
Khi:

```text
source image = PENDING_MOVE
target supplement = CANCELLED / REJECTED
```

thì:

```text
source image → ACTIVE

dateVerificationStatus → MISMATCH

dateResolution → UNRESOLVED
```

Record KHÔNG được lập tức cộng lại vào official production.
Nó chỉ được tính lại vào official production khi:

```text
user resolve date mismatch
↓
record/batch hợp lệ
↓
source batch APPROVED
```

Không được hiểu:

```text
ACTIVE = official production
```

Official production luôn phụ thuộc lifecycle APPROVED.

## 28. CANCELLED
Batch CANCELLED:

```text
không tạo official production
không tính summary
không export official
```

Có thể giữ trong audit/history.
Không hiển thị trong Production mặc định.

## 29. FAILED / PARTIAL_FAILED
Không tính vào official production.
UI:

```text
⚠ Tổ 2 có dữ liệu chưa xử lý xong.

[ Xử lý ]
```

Không bỏ kết quả các Tổ/records khác đã APPROVED.

## 30. PRIMARY APPROVED + Supplement đang xử lý
Ví dụ:

```text
PRIMARY APPROVED
= 1.000 kg

SUPPLEMENT NEED_REVIEW
= 200 kg
```

UI:

```text
Tổ 2

1.000 kg đã xác nhận

⚠ Có dữ liệu bổ sung đang chờ kiểm tra
[ Xử lý ]
```

Official Production:

```text
1.000 kg
```

Không cộng 200 kg.
Không hiển thị Tổ là hoàn toàn "đã hoàn tất".

## 31. Empty State
Hôm nay:

```text
Chưa có sản lượng hôm nay.

Chụp phiếu ghi mủ để bắt đầu ghi nhận.

[ Chụp phiếu ]
```

Ngày cũ:

```text
Không có dữ liệu sản lượng ngày 15/08/2026.
```

Không bắt buộc CTA nhập dữ liệu ngày cũ.

## 32. Loading
Không dùng spinner full-screen lâu.
Ví dụ:

```text
Sản lượng

[skeleton summary]

Theo tổ
[skeleton row]
[skeleton row]
```

Giữ date/filter visible nếu phù hợp.

## 33. Error
Full page:

```text
Không thể tải dữ liệu sản lượng.

Dữ liệu của bạn không bị thay đổi.

[ Thử lại ]
```

Nếu chỉ một section lỗi:
→ chỉ hiển thị error tại section đó.

## 34. Refresh
Mobile:

```text
Pull to refresh
```

hoặc refresh action tương đương.
Sau:

```text
PRIMARY APPROVED
SUPPLEMENT APPROVED
MOVE completed
Supplement cancelled
Conflict resolved
```

Production projection/cache phải invalidate hoặc refresh đúng.
Không yêu cầu restart app.

## 35. Monthly View — SHOULD
Không bắt buộc MVP nếu Daily chưa hoàn thiện.
Ví dụ:

```text
Tháng 08/2026

Theo loại mủ

Mủ nước    ...
Mủ chén    ...
Mủ dây     ...
Mủ đông    ...
```

Chỉ show tổng kg nếu business rule mục 10 cho phép.

## 36. Monthly Employee Production — SHOULD
Ví dụ:

```text
Nguyễn Văn A
Tháng 08/2026

Số ngày có ghi nhận sản lượng: 22

Mủ nước: ...
Mủ chén: ...
Mủ dây: ...
```

Không dùng wording:

```text
Ngày làm: 22
```

vì:

```text
có ngày làm
≠
có ngày ghi nhận sản lượng
```

Attendance là nghiệp vụ khác.

## 37. Không trộn Production với Payroll
Production:

```text
kg / loại mủ / nguồn / ngày / tổ / nhân viên
```

Payroll:

```text
công / đơn giá / phụ cấp / khấu trừ / tiền
```

Có thể có navigation:

```text
[ Xem lương ]
```

nhưng không trộn calculation payroll vào màn Sản lượng.

## 38. Search — SHOULD
Search:

```text
Tên nhân viên
Mã nhân viên
```

nếu domain có mã nhân viên.
Không search trực tiếp OCR raw text.

## 39. Export — SHOULD
Web/tablet:

```text
Export Excel
```

Export mặc định:

```text
Official Production only
```

Header phải ghi rõ:

```text
Ngày / tháng
Tổ
Loại mủ
Trạng thái dữ liệu
```

Không export working/provisional data như dữ liệu chính thức.

## 40. Chart — LATER
Không implement trong MVP.
Nếu phase sau cần:

```text
Sản lượng 7 ngày
```

Dùng line/bar đơn giản.
Không dùng:

```text
3D Pie
Gauge
Radar
```

Chart luôn secondary.

## 41. Performance
Default query:

```text
today
```

Không load toàn lịch sử.
Drill-down:

```text
load when requested
```

Không request:

```text
all employees
× all dates
× all OCR records
× all images
```

ngay lần đầu mở màn.

## 42. Backend Aggregation
Ưu tiên backend aggregate.
Concept:

```text
GET /production/daily?date=2026-08-22
```

có thể trả:

```text
officialSummary
teamBreakdown
pendingIssues
completionInfo
```

Chi tiết Tổ:

```text
GET /production/daily/teams/{teamId}?date=...
```

Đây chỉ là API concept.
Agent phải audit API hiện tại trước.
Không tạo API mới nếu source đã có API phù hợp.

## 43. Không lưu aggregate độc lập nếu không cần thiết
Không tự tạo:

```text
DAILY_PRODUCTION_TOTAL
```

chỉ để UI đọc.
Ưu tiên:

```text
approved records
→ query/aggregation
→ production projection
```

Nếu performance bắt buộc materialized summary/cache:
phải có cơ chế refresh/invalidate khi:

```text
PRIMARY APPROVED
SUPPLEMENT APPROVED
MOVE completed
Supplement rollback
```

## 44. Effective Ownership
Một production record chỉ có một effective ownership tại một thời điểm.
Không:

```text
source date
+
target date
```

cùng tính record.
Không:

```text
PRIMARY
+
SUPPLEMENT
```

cùng tính duplicate record do retry.
Không:

```text
old OCR run
+
retry OCR run
```

cùng tạo production.

## 45. Mobile Visual Hierarchy
Ưu tiên:

```text
Ngày
↓
Official Production
↓
Dữ liệu cần xử lý
↓
Theo Tổ
↓
Chi tiết
```

Không đặt:

```text
Chart
Advanced filter
Secondary analytics
```

lên trước thông tin nghiệp vụ chính.

## 46. Example Mobile — dữ liệu bình thường

```text
SẢN LƯỢNG

<       22/08/2026       >

Đã xác nhận
2.430 kg

Mủ nước       1.850 kg
Mủ chén         420 kg
Mủ dây          110 kg
Mủ đông          50 kg

Theo tổ

Tổ 1
632 kg đã xác nhận
8 công nhân có sản lượng
✓ Đã xác nhận

Tổ 2
798 kg đã xác nhận
9 công nhân có sản lượng
✓ Đã xác nhận

Tổ 3
Đang xử lý OCR

Tổ 4
1.000 kg đã xác nhận
10 công nhân có sản lượng
✓ Đã xác nhận
```

Không hiển thị:

```text
3/4 tổ hoàn tất
```

nếu chưa có expected daily roster.

## 47. Example Mobile — PRIMARY đã duyệt nhưng có Supplement

```text
SẢN LƯỢNG

22/08/2026

Đã xác nhận
2.430 kg

Theo tổ

Tổ 1
632 kg
✓ Đã xác nhận

Tổ 2
798 kg đã xác nhận

⚠ Có 1 phiếu bổ sung cần kiểm tra
[ Xử lý ]

Tổ 3
1.000 kg
✓ Đã xác nhận
```

Supplement chưa duyệt không cộng vào `2.430 kg`.

## 48. Example khi còn dữ liệu cần xử lý

```text
SẢN LƯỢNG

22/08/2026

Đã xác nhận
1.430 kg

⚠ Còn dữ liệu chưa hoàn tất

Tổ 1
632 kg
✓ Đã xác nhận

Tổ 2
798 kg
✓ Đã xác nhận

Tổ 3
Đang xử lý OCR

Tổ 4
2 phiếu cần kiểm tra

[ Xem việc cần xử lý ]
```

Không hiển thị số provisional.

## 49. Navigation từ Production
Cho phép:

```text
Xem Tổ
Xem nhân viên
Xem record
Xem phiếu nguồn
Xử lý dữ liệu chưa hoàn tất
```

Không có:

```text
Sửa tổng sản lượng
```

## 50. Acceptance Criteria

```text
[ ] Mặc định mở ngày hôm nay.

[ ] Official Production chỉ tính APPROVED data.

[ ] APPROVED Supplement được tính vào official production.

[ ] Active Supplement không được cộng official.

[ ] PRIMARY APPROVED + active Supplement phải hiển thị đồng thời:
    - sản lượng đã xác nhận
    - warning dữ liệu bổ sung đang xử lý.

[ ] Working batch không cộng official.

[ ] PENDING_MOVE không cộng source hoặc target.

[ ] Supplement CANCELLED sau PENDING_MOVE không làm record tự động trở lại
    official production khi MISMATCH chưa resolve.

[ ] CANCELLED không tạo production.

[ ] FAILED/PARTIAL_FAILED không tạo official production.

[ ] Không double-count khi retry/move/supplement.

[ ] Có breakdown theo Tổ.

[ ] Có drill-down Tổ → Nhân viên → Record → Phiếu nguồn.

[ ] Không chỉnh trực tiếp aggregate.

[ ] DRC chỉ áp dụng cho mủ nước.

[ ] Không tự invent DRC average.

[ ] Không tự cộng các loại mủ thành TOTAL nếu business chưa xác nhận.

[ ] Không dùng "x/y công nhân" nếu chưa có expected daily roster.

[ ] Không dùng "x/y tổ hoàn tất" nếu chưa có expectedTeamsForDate.

[ ] Không gọi ngày là hoàn tất nếu chưa có completeness rule đáng tin cậy.

[ ] Không hiển thị provisional trong MVP.

[ ] Mobile không dùng table ngang quá rộng.

[ ] Desktop/tablet ưu tiên table.

[ ] Filter ngày/Tổ/loại mủ hoạt động nhất quán.

[ ] Loading/empty/error đầy đủ.

[ ] Production refresh đúng sau APPROVE/SUPPLEMENT/MOVE/ROLLBACK.
```

## 51. Test Cases

**PROD-01 — PRIMARY APPROVED**
```text
PRIMARY APPROVED = 1.000 kg

→ Official Production = 1.000 kg
```

**PROD-02 — PRIMARY chưa APPROVED**
```text
PRIMARY NEED_REVIEW = 1.000 kg

→ Official Production = 0
```

**PROD-03 — APPROVED Supplement**
```text
PRIMARY APPROVED = 1.000
SUPPLEMENT APPROVED = 200

→ Official Production = 1.200
```

**PROD-04 — Active Supplement**
```text
PRIMARY APPROVED = 1.000
SUPPLEMENT NEED_REVIEW = 200

→ Official Production = 1.000
→ 200 chưa tính
```

**PROD-05 — PENDING_MOVE**
```text
Source record = PENDING_MOVE 100 kg

→ source official không cộng 100
→ target official không cộng 100
```

**PROD-06 — Move hoàn tất**
```text
Target Supplement APPROVED

→ source không cộng record
→ target cộng record
→ không double-count
```

**PROD-07 — Supplement CANCELLED**
```text
Source IMG01 = PENDING_MOVE

Target Supplement CANCELLED

→ IMG01 = ACTIVE
→ dateVerificationStatus = MISMATCH
→ dateResolution = UNRESOLVED

→ Official Production KHÔNG tự tăng

→ user phải resolve MISMATCH

→ chỉ sau khi lifecycle source hợp lệ và APPROVED
  mới được tính official
```

**PROD-08 — CANCELLED**
```text
Batch CANCELLED

→ không tính official
→ không xuất hiện trong production thông thường
```

**PROD-09 — PARTIAL_FAILED**
```text
Batch PARTIAL_FAILED

→ không cộng official
→ UI báo còn dữ liệu cần xử lý
```

**PROD-10 — Retry**
```text
Retry upload / OCR

→ không tạo duplicate production record
```

**PROD-11 — Multiple Teams**
```text
Tổ 1 APPROVED
Tổ 2 APPROVED
Tổ 3 NEED_REVIEW

→ official chỉ tính Tổ 1 + Tổ 2

→ UI báo Tổ 3 cần xử lý
```

**PROD-12 — Traceability**
```text
Daily Production
→ Team
→ Employee
→ Record
→ Source image

→ truy được source đầy đủ
```

**PROD-13 — PRIMARY APPROVED + Active Supplement**
```text
PRIMARY APPROVED = 1.000

SUPPLEMENT NEED_REVIEW = 200

→ Official = 1.000

→ Team UI:
   "1.000 kg đã xác nhận"
   +
   "Có dữ liệu bổ sung cần kiểm tra"

→ không được chỉ show "Đã xác nhận"
```

**PROD-14 — Không có Daily Roster**
```text
Không có expectedTeamsForDate

Có 3 Tổ đã APPROVED

→ UI:
   "3 tổ đã xác nhận"

→ KHÔNG show:
   "3/4 tổ hoàn tất"
```

**PROD-15 — Không có expected workers**
```text
Không có expectedWorkersForDate

7 nhân viên có production

→ UI:
   "7 công nhân có sản lượng"

→ KHÔNG show:
   "7/9 công nhân"
```

**PROD-16 — Filter loại mủ**
```text
Filter = Mủ nước

→ summary chỉ phản ánh Mủ nước
→ team breakdown chỉ phản ánh Mủ nước
→ employee records chỉ phản ánh Mủ nước
→ stored data không thay đổi
```

**PROD-17 — Duplicate ownership**
```text
PRIMARY/SUPPLEMENT/retry có khả năng reference cùng effective record

→ Official Production chỉ tính đúng 1 lần
```

**PROD-18 — Tổng kg chưa được business xác nhận**
```text
Các loại mủ đều có đơn vị kg
NHƯNG business chưa xác nhận được phép cộng trực tiếp

→ UI không được tự hiển thị TOTAL_PRODUCTION_KG
→ chỉ hiển thị breakdown
```

## 52. Agent Audit trước khi implement
Agent phải audit source trước khi sửa code.
Phải trả lời:

```text
1. Production data hiện được lưu ở đâu?

2. Production có entity/table riêng hay đang derive từ OCR/manual records?

3. Trạng thái nào hiện được coi là confirmed?

4. PRIMARY/SUPPLEMENT hiện đã tồn tại hay chưa?

5. Một production record có sourceImage/sourceRecordId không?

6. Có cách truy ngược từ Production → Source chưa?

7. Các loại mủ hiện dùng đơn vị nào?

8. Business hiện có cộng trực tiếp các loại mủ thành tổng không?

9. DRC hiện được tính/hiển thị như thế nào?

10. Có daily roster / expectedTeamsForDate không?

11. Có expectedWorkersForDate không?

12. API aggregation hiện có gì?

13. Cache/materialized view hiện có không?

14. Có nguy cơ double-count ở đâu?

15. Mobile/Desktop đang dùng component nào cho list/table?
```

Sau audit:

* Gap analysis.
* Mapping spec → source.
* API changes.
* DB changes nếu cần.
* UI components.
* Test plan.
* Implementation phases.

Chưa code cho tới khi audit được review và xác nhận.

## 53. Nguyên tắc cuối
Màn Sản lượng phải giúp user trả lời nhanh:

```text
1. Ngày này có bao nhiêu sản lượng đã xác nhận?

2. Sản lượng đến từ Tổ/nhân viên/loại mủ nào?

3. Còn dữ liệu nào chưa hoàn tất?

4. Một con số cụ thể đến từ phiếu nào?
```

Nếu một feature không phục vụ trực tiếp một trong 4 câu hỏi trên:
→ cân nhắc không đưa vào MVP.
