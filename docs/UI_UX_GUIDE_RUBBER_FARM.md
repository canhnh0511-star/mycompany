# UI/UX Implementation Guide — Ứng dụng quản lý nông trường cao su

## 1. Mục tiêu tài liệu

Tài liệu này dùng làm **guideline triển khai UI/UX cho agent** khi phát triển frontend của ứng dụng quản lý nông trường cao su.

Đây là hệ thống nội bộ cho nông trường quy mô nhỏ, khoảng **20–30 công nhân**. Người dùng chính là **Admin/chủ nông trường hoặc nhân sự quản lý**, sử dụng:

- **Điện thoại** khi đi thực địa.
- **Web/tablet** khi làm việc tại văn phòng.

Ưu tiên theo thứ tự:

1. Luồng nghiệp vụ đúng.
2. Thao tác nhanh.
3. Giảm số lần nhập liệu.
4. Dễ kiểm tra và sửa sai.
5. Giao diện rõ ràng.
6. Thẩm mỹ sau cùng.

Không thiết kế theo hướng ERP phức tạp.

---

# 2. Product UX Principles

## 2.1. Clarity > Beauty

Đây là phần mềm vận hành.

Ưu tiên:

- Nhìn nhanh hiểu ngay.
- Ít bước.
- Ít field.
- Ít modal.
- Ít confirmation không cần thiết.
- Không dùng animation phức tạp.
- Không dùng hiệu ứng trang trí gây phân tâm.

Tránh:

- Glassmorphism.
- Gradient mạnh.
- Animation nhiều.
- Card everywhere.
- Dashboard màu mè.
- Icon nhỏ khó thao tác.
- Menu nhiều tầng.

---

## 2.2. Daily actions phải cực nhanh

Nguyên tắc:

> Một thao tác xảy ra mỗi ngày phải cực nhanh. Một thao tác xảy ra mỗi tháng có thể phức tạp hơn một chút.

Ví dụ:

### Daily
- Chụp phiếu.
- Kiểm tra OCR.
- Xem tình hình hôm nay.

Phải truy cập trong tối đa khoảng **1–2 thao tác từ Home**.

### Monthly
- Chốt bảng lương.
- Export báo cáo.
- Cấu hình đơn giá.

Có thể đặt sâu hơn trong hệ thống.

---

## 2.3. Không bắt người dùng nhập lại thông tin hệ thống đã biết

Nếu context hiện tại đã có:

- ngày,
- tổ,
- loại phiếu,

thì các dòng nhập liệu sau phải tự inherit.

Ví dụ:

```text
Ngày: 12/08/2026
Tổ: Tổ 2
Loại phiếu: Sổ ghi mủ
```

Tất cả ảnh tiếp theo trong camera session phải tự dùng metadata này.

Không yêu cầu chọn lại cho từng ảnh hoặc từng dòng.

---

## 2.4. Mobile và Web có mục đích khác nhau

Không thiết kế web chỉ là phiên bản mobile phóng to.

### Mobile

Tập trung vào:

- Chụp phiếu.
- Kiểm tra nhanh.
- Xem tình hình hôm nay.
- Xử lý việc cần chú ý.

### Web/Tablet

Tập trung vào:

- Review OCR.
- Nhập/chỉnh sửa hàng loạt.
- Quản lý công nhân.
- Quản lý tổ.
- Tính lương.
- Báo cáo.
- Export.

---

# 3. User chính

V1 chỉ có một nhóm user:

## Admin

Admin có thể là:

- Chủ nông trường.
- Giám đốc.
- Nhân sự.
- Người quản lý vận hành.

Admin thực hiện:

- Chụp ảnh phiếu giấy.
- Review OCR.
- Nhập sản lượng.
- Quản lý công nhân.
- Quản lý tổ.
- Quản lý bán mủ.
- Kiểm tra dữ liệu.
- Tính lương.
- Xem báo cáo.

Không thiết kế flow riêng cho công nhân hoặc tổ trưởng nếu chưa có requirement.

---

# 4. Hai nghiệp vụ phiếu chính

## 4.1. Sổ ghi mủ

Dữ liệu sản lượng cá nhân theo:

- Ngày.
- Tổ.
- Nhân viên.

Các loại mủ:

- Mủ nước.
- Mủ chén.
- Mủ dây.
- Mủ đông.

Đơn vị: kg.

Riêng **mủ nước** có thêm:

- DRC (%).

Các loại mủ khác **không có DRC**.

---

## 4.2. Sổ bán mủ

Dữ liệu bán mủ theo **Tổ**, không gắn với một nhân viên cụ thể.

Các field có thể gồm:

- Ngày.
- Tổ.
- Loại mủ.
- Khối lượng.
- Người mua.
- Người ký bán.
- Giá/đơn giá nếu nghiệp vụ có.
- Thành tiền nếu nghiệp vụ có.

Tên người mua và người ký bán là text tự do nếu backend đang thiết kế như vậy.

---

# 5. Information Architecture

Menu chính nên đơn giản.

Đề xuất:

```text
Tổng quan

Phiếu
 ├── Sổ ghi mủ
 └── Sổ bán mủ

Sản lượng

Lương

Nhân sự

Báo cáo

Cài đặt
```

Nếu V1 chưa có lương:

```text
Tổng quan
Phiếu
Sản lượng
Nhân sự
Báo cáo
```

Tránh naming kiểu enterprise:

```text
Danh mục
Quản trị
Nghiệp vụ
Giao dịch
Tiện ích
Dữ liệu
```

Tên menu phải phản ánh đúng công việc người dùng.

---

# 6. Mobile Home / Daily Dashboard

Màn hình Home mobile phải trả lời câu hỏi:

> Hôm nay nông trường có gì cần tôi quan tâm?

Không chỉ show KPI.

Ví dụ:

```text
Hôm nay — 12/08/2026

[ + CHỤP PHIẾU ]

Tình hình hôm nay

3/4 tổ đã nhập
27/29 công nhân có dữ liệu
2.430 kg tổng sản lượng
1.850 kg đã bán

CẦN CHÚ Ý

⚠ Tổ 3 chưa có phiếu
⚠ 2 phiếu OCR cần kiểm tra
⚠ 2 công nhân chưa có sản lượng
```

## Primary CTA

Nút quan trọng nhất:

```text
CHỤP PHIẾU
```

Nút phải:

- lớn,
- dễ bấm,
- nằm vị trí thuận tiện cho ngón cái,
- nổi bật hơn các action khác.

---

# 7. Daily Workspace

Khuyến nghị có một màn hình làm việc theo ngày.

Ví dụ:

```text
< 11/08     12/08     13/08 >

TỔ 1
✓ Đã hoàn tất
8/8 công nhân
632 kg

TỔ 2
⚠ Cần kiểm tra
7/9 công nhân
2 người thiếu dữ liệu

TỔ 3
○ Chưa có phiếu

TỔ 4
✓ Đã hoàn tất
```

Daily Workspace có thể trở thành màn hình được dùng nhiều nhất.

User phải nhìn thấy ngay:

- tổ nào đã xong,
- tổ nào chưa nhập,
- tổ nào có lỗi,
- có bao nhiêu công nhân,
- sản lượng bao nhiêu.

---

# 8. Camera / OCR Flow

OCR là workflow trọng tâm.

Luồng đề xuất:

```text
Chọn loại phiếu
      ↓
Chọn tổ
      ↓
Chọn ngày nếu khác hôm nay
      ↓
Mở Camera
      ↓
Chụp
      ↓
Tự quay lại Camera
      ↓
Chụp tiếp
      ↓
Hoàn tất
      ↓
OCR xử lý
      ↓
Review
      ↓
Xác nhận
```

---

# 9. Batch Capture

Không dùng flow:

```text
Chụp
→ chờ OCR
→ sửa
→ lưu
→ quay lại camera
```

vì quá chậm nếu Admin có nhiều phiếu.

Phải hỗ trợ chụp liên tục.

Ví dụ:

```text
Sổ ghi mủ
Tổ 2
12/08/2026

Đã chụp: 7 ảnh

[ thumbnail ]
[ thumbnail ]
[ thumbnail ]

[ Chụp tiếp ]

[ Hoàn tất ]
```

User có thể:

- xem thumbnail,
- xóa ảnh sai,
- chụp lại,
- tiếp tục chụp.

OCR có thể xử lý sau khi user bấm `Hoàn tất`.

---

# 10. OCR Review

Mục tiêu UX:

> User chỉ sửa những gì OCR không chắc hoặc sai, không phải nhập lại toàn bộ dữ liệu.

Ví dụ:

```text
NGUYỄN VĂN A

Mủ nước
82.5 kg                 ✓

DRC
30.5 %                  ✓

Mủ chén
[ 8.2 ] kg              ⚠ Cần kiểm tra

Mủ dây
1.4 kg                  ✓
```

## Confidence state

Có thể dùng:

- ✓ Tin cậy cao.
- ⚠ Cần kiểm tra.
- Error: dữ liệu vi phạm nghiệp vụ.

Không cần hiển thị confidence score kỹ thuật như `0.873621`.

---

# 11. Web/Tablet OCR Review Layout

Trên màn hình rộng nên luôn hiển thị:

- ảnh gốc,
- dữ liệu OCR,

song song.

Ví dụ:

```text
┌───────────────────────┬────────────────────────────┐
│                       │ Nguyễn Văn A               │
│                       │                            │
│     ẢNH PHIẾU         │ Mủ nước  [ 82.5 ]         │
│                       │ DRC       [ 30.5 ]         │
│                       │ Mủ chén   [ 8.2  ]   ⚠    │
│                       │ Mủ dây    [ 1.4  ]         │
│                       │                            │
│                       │       [ XÁC NHẬN ]         │
└───────────────────────┴────────────────────────────┘
```

Không bắt người dùng:

- click mở modal ảnh,
- đóng modal,
- sửa field,
- mở ảnh lại.

Ảnh phải luôn ở context khi review.

---

# 12. Review hàng loạt

Nếu một phiếu có nhiều công nhân, hỗ trợ điều hướng nhanh:

```text
Ảnh #3

1. Nguyễn Văn A      ✓
2. Nguyễn Văn B      ⚠
3. Trần Văn C        ✓
4. Lê Văn D          ⚠
```

Cho phép:

- next/previous lỗi,
- lọc `Chỉ xem dòng cần kiểm tra`,
- keyboard navigation trên web nếu phù hợp.

Mục tiêu là giảm thời gian review.

---

# 13. Production Table trên Web

Ở Web/Tablet nên ưu tiên table cho dữ liệu dạng danh sách.

Ví dụ:

```text
SẢN LƯỢNG

Ngày: 12/08/2026
Tổ: Tất cả

---------------------------------------------------------
Nhân viên       Nước     DRC     Chén    Dây    Đông
---------------------------------------------------------
Nguyễn Văn A     82       31       3       1      -
Nguyễn Văn B     76       29       5       -      -
Trần Văn C       91       30       2       1      -
---------------------------------------------------------
Tổng            249               10      2
```

Có thể hỗ trợ:

- filter ngày,
- filter tổ,
- tìm nhân viên,
- inline edit,
- nhập hàng loạt,
- export Excel.

Không biến từng nhân viên thành một card riêng trên desktop.

---

# 14. Progressive Disclosure

Chỉ hiển thị field có liên quan.

Ví dụ:

Nếu loại mủ là `Mủ nước`:

```text
Khối lượng
DRC
```

Nếu là `Mủ chén`:

```text
Khối lượng
```

Không hiển thị field DRC disabled cho các loại mủ khác nếu không cần thiết.

---

# 15. Dashboard UX

Dashboard không nên chỉ có:

```text
29 Users
4 Teams
2834 Records
124 Sales
```

Các con số này không giúp chủ nông trường ra quyết định.

Dashboard nên tập trung vào:

## Tình hình hôm nay

```text
Sản lượng
2.430 kg
↑ 8% so với trung bình 7 ngày

Nhân công
27 / 29

Phiếu
12 đã xử lý
2 cần kiểm tra

Bán mủ
1.850 kg
```

## Cần xử lý

```text
⚠ Tổ 3 chưa nhập phiếu

⚠ 2 dòng OCR cần review

⚠ Nguyễn Văn A chưa có sản lượng

⚠ Chênh lệch sản lượng ghi nhận và sản lượng bán
```

User phải biết:

> Có chuyện gì cần tôi xử lý ngay?

---

# 16. Employee Detail

Trang chi tiết nhân viên phải phục vụ tra cứu nhanh.

Ví dụ:

```text
NGUYỄN VĂN A

Tổ: Tổ 2
Trạng thái: Đang làm

THÁNG 08/2026

Ngày công          22
Mủ nước        1.720 kg
Mủ chén            63 kg

Lương tạm tính
9.250.000 đ
```

Có thể drill-down vào:

- từng ngày,
- từng phiếu,
- lịch sử thay đổi.

---

# 17. Payroll UX

Bảng lương phải cho phép truy ngược nguồn dữ liệu.

Không chỉ show:

```text
Nguyễn Văn A
9.250.000
```

Nên có breakdown:

```text
Sản lượng         7.800.000
Công              1.200.000
Phụ cấp             700.000
Tạm ứng          -2.000.000
---------------------------
Thực nhận         7.700.000
```

User phải có khả năng đi từ:

```text
Lương
→ Nhân viên
→ Sản lượng ngày
→ Phiếu gốc
```

để giải quyết khi có thắc mắc.

---

# 18. Confirmation Rules

Không hỏi:

> Bạn có chắc muốn lưu?

cho mọi thao tác save.

Confirmation chỉ nên dùng cho thao tác có hậu quả đáng kể:

- xóa,
- khóa kỳ,
- xác nhận bảng lương,
- thay đổi dữ liệu đã duyệt,
- hủy dữ liệu quan trọng.

Ví dụ:

```text
Xác nhận bảng lương tháng 08/2026?

Sau khi xác nhận, dữ liệu của kỳ này
không thể chỉnh sửa trực tiếp.

[ Quay lại ]          [ Xác nhận ]
```

---

# 19. Status Design

Không hiển thị enum backend trực tiếp.

Backend:

```text
DRAFT
PROCESSING
NEED_REVIEW
CONFIRMED
FAILED
```

Frontend:

```text
Bản nháp
Đang xử lý
Cần kiểm tra
Đã xác nhận
Lỗi
```

Status phải nhất quán toàn hệ thống.

---

# 20. Empty State

Không chỉ hiển thị:

```text
Không có dữ liệu
```

Phải hướng user tới hành động tiếp theo.

Ví dụ:

```text
Hôm nay chưa có phiếu ghi mủ.

[ Chụp phiếu đầu tiên ]
```

hoặc:

```text
Tổ 1 chưa có công nhân.

[ Thêm công nhân ]
```

---

# 21. Error State

Thông báo lỗi phải nói rõ:

1. Điều gì xảy ra.
2. User có thể làm gì.

Không dùng:

```text
Something went wrong
```

Nên dùng:

```text
Không thể xử lý ảnh.

Kết nối mạng đang không ổn định.
Ảnh đã được giữ lại, bạn có thể thử lại.

[ Thử lại ]
```

---

# 22. Network yếu / thực địa

Admin có thể dùng mobile ở nơi mạng yếu.

UI phải chuẩn bị cho:

- request chậm,
- mất mạng,
- OCR xử lý lâu,
- upload ảnh thất bại,
- retry.

Không để spinner toàn màn hình vô thời hạn.

Nên có trạng thái:

```text
Đang tải ảnh...
Đang xử lý OCR...
Chờ xử lý
Không thể kết nối
Thử lại
```

Nếu backend đã hỗ trợ async OCR sau này, frontend phải có khả năng hiển thị:

```text
PROCESSING
SUCCESS
FAILED
```

---

# 23. Touch Target

Mobile dùng ngoài thực địa.

Button/action phải dễ bấm.

Khuyến nghị:

- touch target tối thiểu khoảng 44–48 px,
- khoảng cách đủ lớn giữa action,
- tránh icon-only cho action quan trọng.

Ví dụ tốt:

```text
┌─────────────────────────────┐
│       CHỤP PHIẾU TIẾP       │
└─────────────────────────────┘
```

Không dùng icon camera nhỏ ở góc cho hành động chính.

---

# 24. Form UX

Form cần:

- label rõ,
- đơn vị đặt cạnh input,
- numeric keyboard trên mobile cho số,
- format số thân thiện,
- validate tại field,
- tránh reset dữ liệu khi lỗi.

Ví dụ:

```text
Khối lượng
[ 82.5 ] kg

DRC
[ 30.5 ] %
```

Không để user tự nhập cả `kg` hoặc `%`.

---

# 25. Date UX

Default ngày hiện tại.

User chỉ cần chọn ngày khác khi nhập dữ liệu cũ.

Date nên được giữ xuyên suốt workflow.

Ví dụ:

```text
12/08/2026
Tổ 2
Sổ ghi mủ
```

Không yêu cầu chọn ngày ở từng record.

---

# 26. Design System

Dự án dự kiến dùng `react-native-paper`, nên giữ phong cách Material đơn giản.

## Spacing

Ưu tiên scale:

```text
4
8
12
16
24
32
```

## Border radius

Khoảng:

```text
8–12 px
```

## Typography

Cần hierarchy rõ:

```text
Page title
Section title
Primary value
Body
Caption
Helper text
```

## Color

Chỉ cần:

- neutral background,
- white surface,
- 1 accent color,
- success,
- warning,
- error.

Không cần branding mạnh ở MVP.

---

# 27. Card Usage

Card chỉ dùng khi thực sự gom một nhóm thông tin.

Không biến toàn bộ màn hình thành:

```text
Card
Card
Card
Card
Card
```

Desktop table/list nên dùng table/list.

Mobile summary có thể dùng card.

---

# 28. Loading UX

Ưu tiên skeleton hoặc trạng thái loading tại khu vực liên quan.

Không block toàn bộ app nếu chỉ một widget đang load.

Ví dụ dashboard:

```text
Sản lượng hôm nay
[loading...]

Nhân công
27/29

Phiếu
12/14
```

---

# 29. Search / Filter

Web list cần filter rõ.

Ví dụ:

```text
Ngày
Tổ
Trạng thái
Nhân viên
```

Filter đang active phải nhìn thấy được.

Có nút reset filter.

Không giấu filter quan trọng trong nhiều modal.

---

# 30. Responsive Rules

## Mobile

Ưu tiên:

- 1 column.
- Bottom action.
- Compact navigation.
- Full-screen camera.
- Card/list.

## Tablet

Có thể:

- 2 panes.
- Image + OCR editor.
- Sidebar.

## Desktop

Ưu tiên:

- sidebar navigation.
- table.
- split pane.
- batch edit.

---

# 31. Accessibility cơ bản

Agent phải đảm bảo:

- text đủ contrast,
- không dùng màu là tín hiệu duy nhất,
- button có label,
- status có text,
- focus state rõ trên web,
- form có label,
- lỗi nằm gần field liên quan.

Ví dụ warning:

```text
⚠ Cần kiểm tra
```

không chỉ dùng màu vàng.

---

# 32. Recommended Screen Priority

Thiết kế và triển khai theo thứ tự:

1. Home / Daily Dashboard.
2. Chọn loại phiếu.
3. Camera Capture.
4. Batch Image Review.
5. OCR Processing State.
6. OCR Review.
7. Daily Production.
8. Employee Detail.
9. Payroll.
10. Reports.
11. Employee Management.
12. Team Management.
13. Settings.

Không bắt đầu bằng CRUD Settings.

---

# 33. Recommended Core Flow

## Flow A — Chụp sổ ghi mủ

```text
Home
→ Chụp phiếu
→ Sổ ghi mủ
→ Chọn tổ
→ Camera
→ Chụp liên tục
→ Hoàn tất
→ OCR
→ Review lỗi
→ Xác nhận
→ Daily Workspace
```

---

## Flow B — Chụp sổ bán mủ

```text
Home
→ Chụp phiếu
→ Sổ bán mủ
→ Chọn tổ
→ Camera
→ Chụp
→ OCR
→ Review
→ Xác nhận
→ Daily Workspace
```

---

## Flow C — Kiểm tra việc hôm nay

```text
Home
→ Cần chú ý
→ Chọn issue
→ Fix
→ Back
→ Issue biến mất
```

---

## Flow D — Tra cứu lương

```text
Lương
→ Chọn tháng
→ Nhân viên
→ Breakdown
→ Sản lượng
→ Ngày
→ Phiếu gốc
```

---

# 34. UX Anti-patterns cần tránh

Agent không được:

- bắt user chọn lại ngày/tổ nhiều lần,
- yêu cầu OCR từng ảnh trước khi chụp ảnh tiếp,
- tạo quá nhiều modal,
- dùng confirmation sau mỗi save,
- dùng card cho toàn bộ table,
- show enum backend,
- show confidence OCR dạng số kỹ thuật,
- bắt user nhập dữ liệu OCR đã đúng,
- yêu cầu user mở modal để xem ảnh trong quá trình review,
- đặt action quan trọng dưới menu 3 chấm,
- dùng icon-only cho hành động quan trọng,
- show dashboard chỉ gồm số lượng record,
- dùng thuật ngữ kỹ thuật thay cho nghiệp vụ,
- tạo menu quá nhiều tầng.

---

# 35. Copywriting

Ngôn ngữ UI phải gần với người dùng nghiệp vụ.

Dùng:

```text
Chụp phiếu
Cần kiểm tra
Đã xác nhận
Chưa có dữ liệu
Thử lại
Hoàn tất
Xác nhận
```

Tránh:

```text
Submit
Sync
Execute
Entity
Record
Process failed
Invalid state
```

Nếu backend trả message kỹ thuật, frontend phải map sang message thân thiện.

---

# 36. MVP Success Criteria

UI/UX V1 được xem là tốt nếu Admin có thể:

### Chụp phiếu

Từ Home tới Camera trong rất ít thao tác.

### Chụp nhiều ảnh

Không phải chờ OCR từng ảnh.

### Review OCR

Chỉ tập trung vào field có khả năng sai.

### Xem dữ liệu hôm nay

Biết ngay tổ nào chưa hoàn tất.

### Tra cứu

Từ sản lượng/lương có thể truy ngược phiếu gốc.

### Sử dụng ngoài thực địa

Không phụ thuộc thao tác chính xác trên icon nhỏ.

---

# 37. Agent Implementation Instructions

Khi agent implement UI:

1. Không tự thêm module nghiệp vụ mới nếu requirement chưa có.
2. Không tự thêm field business.
3. Không thay đổi business rule.
4. Ưu tiên reuse component.
5. Giữ typography/spacing thống nhất.
6. Tách component theo responsibility.
7. Không hardcode status text ở nhiều nơi.
8. Tạo mapping status tập trung.
9. Tạo reusable `EmptyState`.
10. Tạo reusable `ErrorState`.
11. Tạo reusable `StatusBadge`.
12. Tạo reusable `PrimaryAction`.
13. Tạo reusable numeric field có unit.
14. Tạo reusable filter bar cho desktop.
15. Responsive từ đầu.
16. Khi có ambiguity về nghiệp vụ, không tự đoán; giữ UI generic hoặc đánh dấu TODO.

---

# 38. Component Suggestions

Có thể cân nhắc các component:

```text
DailySummaryCard
AttentionList
TeamDailyStatus
PrimaryCaptureButton
CaptureSessionHeader
ImageThumbnailList
OCRReviewPanel
OCRConfidenceIndicator
ProductionTable
EmployeeSummary
PayrollBreakdown
StatusBadge
EmptyState
ErrorState
LoadingState
FilterBar
DateNavigator
TeamSelector
RubberTypeField
```

Tên thực tế có thể điều chỉnh theo convention của source.

---

# 39. Mobile Navigation Suggestion

Có thể dùng bottom navigation với khoảng 4 tab:

```text
Hôm nay
Phiếu
Sản lượng
Thêm
```

Hoặc:

```text
Tổng quan
Phiếu
Nhân sự
Báo cáo
```

Không nên có quá nhiều tab.

Action `Chụp phiếu` có thể được ưu tiên riêng.

---

# 40. Web Navigation Suggestion

Sidebar:

```text
Tổng quan
Phiếu
Sản lượng
Lương
Nhân sự
Báo cáo

----------------

Cài đặt
```

Sidebar phải:

- không quá rộng,
- icon chỉ hỗ trợ, không thay thế text,
- highlight menu hiện tại rõ ràng.

---

# 41. Final UX Principle

Mọi quyết định UI phải trả lời được một trong các câu hỏi:

```text
Có giúp user thao tác nhanh hơn không?
Có giảm số lần nhập không?
Có giảm nguy cơ sai không?
Có giúp phát hiện vấn đề nhanh hơn không?
Có giúp đối chiếu dữ liệu dễ hơn không?
```

Nếu một thành phần UI không giúp ích cho các mục tiêu này, cân nhắc loại bỏ.

---

# 42. Definition of Done cho một màn hình

Một màn hình chỉ được xem là hoàn thành khi có đầy đủ:

- normal state,
- loading state,
- empty state,
- error state,
- disabled state nếu cần,
- validation state,
- responsive behavior,
- mobile touch target phù hợp,
- status mapping đúng nghiệp vụ,
- copy tiếng Việt dễ hiểu.

---

# 43. Tóm tắt triết lý thiết kế

Ứng dụng này không cần gây ấn tượng bằng hiệu ứng.

Mục tiêu là:

> **Admin mở app lên, biết hôm nay đang xảy ra chuyện gì, chụp phiếu thật nhanh, chỉ sửa những gì OCR sai và cuối kỳ có thể truy ngược mọi con số về dữ liệu gốc.**

Ưu tiên:

```text
Đúng nghiệp vụ
    ↓
Nhanh
    ↓
Ít thao tác
    ↓
Dễ kiểm tra
    ↓
Nhất quán
    ↓
Đẹp
```
