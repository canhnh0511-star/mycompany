# Module 2 — Nhân sự — Grilling Plan

> "Grilling" = buổi truy vấn/phản biện có chủ đích TRƯỚC khi viết dòng code đầu tiên, để lộ ra hết các
> giả định ngầm, quyết định còn treo, và rủi ro kỹ thuật — cùng tinh thần
> `docs/frontend-grilling-plan.md` đã làm cho Module 1. Format mỗi mục: **câu hỏi** → **đề xuất** (mặc
> định nếu Admin không phản đối) → mức độ chắc chắn. **File này CHƯA có quyết định nào được duyệt** — khác
> với `frontend-grilling-plan.md` (đã duyệt xong, giữ làm lịch sử), đây là bản nháp mở đầu Giai đoạn 2,
> chờ Admin trả lời từng mục trước khi tách ADR.

---

## 0. Bối cảnh hiện tại (tính đến 2026-08-25)

- **CLAUDE.md đã đặt chỗ cho Module 2** nhưng chưa có spec: mục 1 ghi "Đặt nền móng auth/DB/phân quyền để
  tái dùng cho Module 2 (Nhân sự)"; "Ngoài phạm vi Module 1: ... hồ sơ nhân sự đầy đủ". Không có tài liệu
  spec riêng nào cho Module 2 tồn tại trong repo trước file này.
- **`docs/UI_UX_GUIDE_RUBBER_FARM.md`** (thiết kế UI/UX chung, không phải spec nghiệp vụ) đã đặt "Nhân sự"
  làm 1 mục menu chính trong Information Architecture đề xuất (mục 5), ngang hàng "Sản lượng"/"Lương"/
  "Báo cáo" — nhưng chỉ là placeholder tên menu, không có field/luồng nghiệp vụ nào được định nghĩa.
- **Dữ liệu nhân sự đã có sẵn từ Module 1** (tối giản, KHÔNG phải hồ sơ nhân sự — chỉ đủ để gắn sản
  lượng vào đúng người):
  ```
  employees — id, full_name, team_id, status (active|inactive), user_id (nullable, FK → users)
  users      — id, full_name, email, password_hash, role (team_lead|admin), team_id (nullable)
  teams      — id, name, description
  ```
  `features/admin-catalog/employees` (mobile) hiện chỉ CRUD 2 field (`full_name`, `team_id`) + đổi
  `status`. Không có ngày sinh, CCCD/CMND, số điện thoại, địa chỉ, ngày vào làm, loại hợp đồng, hồ sơ
  giấy tờ đính kèm, lịch sử điều chuyển Tổ, nghỉ phép...
- **`attendance_records`** (Module 1) đã ghi công/chuyên cần theo ngày — đây là dữ liệu chấm công thô,
  KHÔNG phải nghỉ phép có phê duyệt (không có khái niệm "đơn xin nghỉ", "loại nghỉ có lương/không lương").
- **`role` hiện chỉ có 2 giá trị** (`team_lead`, `admin`) nhưng **release 1 chỉ Admin đăng nhập được**
  (ADR-0001) — Tổ trưởng tự đăng nhập là tính năng "release sau", CHƯA xây. Module 2 có thể là nơi tự
  nhiên để mở khóa việc này (xem câu hỏi 2.6) nhưng chưa chắc — cần Admin xác nhận có gộp chung hay tách
  riêng.

---

## 1. Phạm vi đề xuất cho Module 2 (nháp — CẦN Admin duyệt)

**Trong phạm vi (đề xuất):**
- Hồ sơ nhân sự đầy đủ: thông tin cá nhân (ngày sinh, CCCD/CMND, SĐT, địa chỉ, giới tính...), thông tin
  hợp đồng lao động (ngày vào làm, loại hợp đồng, ngày hết hạn nếu có), lịch sử điều chuyển Tổ.
- Quản lý trạng thái nhân sự đầy đủ hơn `active|inactive` hiện tại: thêm `nghỉ việc` (có ngày nghỉ việc,
  lý do) — khác `inactive` hiện tại vốn dùng tạm cho "ngừng ghi sản lượng" không phân biệt lý do.
  Ràng buộc: 1 nhân viên `active` vẫn phải map đúng 1 `employees` row hiện có (Module 1) — Module 2 MỞ
  RỘNG record này, không tạo bảng nhân viên song song.
- Đơn xin nghỉ phép + phê duyệt (loại nghỉ, có lương/không lương, số ngày) — dữ liệu này SẼ là input cho
  Module 3 (Tính lương) sau này, tương tự cách `attendance_records`/`rate_configs` đã chuẩn bị sẵn ở
  Module 1.
- Lưu trữ giấy tờ/tài liệu đính kèm (hợp đồng scan, CCCD scan...) — tái dùng pattern Supabase Storage đã
  có (`SupabaseStorageService`, signed URL) thay vì xây cơ chế lưu file mới.

**Ngoài phạm vi (đề xuất, để Module 3 hoặc sau nữa):**
- Tính lương tự động (giữ nguyên ranh giới CLAUDE.md đã chốt — Module 3).
- Đánh giá hiệu suất (performance review), khen thưởng/kỷ luật có quy trình phức tạp.
- Tổ trưởng tự đăng nhập/tự nhập liệu — CÓ THỂ liên quan (nhân sự cần biết ai được cấp tài khoản) nhưng
  đề xuất **tách ADR riêng** nếu làm, không âm thầm gộp vào Module 2 (xem câu hỏi 2.6).

**Mức độ chắc chắn:** thấp — đây là suy luận từ 2 dòng ghi chú trong CLAUDE.md + 1 mục menu trong UI
guide, CHƯA có xác nhận trực tiếp từ Admin về phạm vi thật sự mong muốn. Cần chốt trước khi đi tiếp bất
kỳ mục nào bên dưới.

---

## 2. Câu hỏi cần chốt trước khi code

### 2.1 — "Hồ sơ nhân sự đầy đủ" gồm đúng những field nào?
**Câu hỏi:** CLAUDE.md chỉ ghi cụm từ này, không liệt kê field. Nông trường thực tế cần lưu gì cho mỗi
công nhân — tối thiểu (SĐT, ngày vào làm) hay đầy đủ theo luật lao động (CCCD, hộ khẩu, hợp đồng, BHXH)?
**Đề xuất:** bắt đầu tối giản — SĐT, ngày sinh, CCCD/CMND (số + ngày cấp), địa chỉ, ngày vào làm, loại
hợp đồng (thời vụ/dài hạn — enum mở dạng `latex_types`, không hardcode), ghi chú tự do. KHÔNG làm BHXH/
thuế TNCN ở v1 (phức tạp, thường cần phần mềm kế toán riêng, không phải "phải có" để vận hành trại).
**Mức độ chắc chắn:** thấp — phụ thuộc hoàn toàn vào nhu cầu thật của nông trường, không suy ra được từ
code có sẵn.

### 2.2 — Ai nhập/sửa hồ sơ nhân sự? Có cần thêm role không?
**Câu hỏi:** Vẫn chỉ Admin (như Module 1 release 1, ADR-0001), hay Module 2 là lúc mở thêm role "Nhân sự"
tách biệt với "Giám đốc" (2 vai trò gộp chung trong CLAUDE.md bảng phân quyền hiện tại: "Admin (Giám đốc/
Nhân sự)")?
**Đề xuất:** giữ nguyên chỉ Admin ở v1 Module 2 (nhất quán ADR-0001, tránh mở rộng phân quyền 2 module
liền nhau) — tách role Nhân sự/Giám đốc để dành khi thực tế có người khác ngoài chủ nông trường cần login.
**Mức độ chắc chắn:** trung bình.

### 2.3 — Mở rộng bảng `employees` hay tạo bảng `employee_profiles` riêng?
**Câu hỏi:** Thêm cột thẳng vào `employees` (đơn giản, nhưng bảng phình to, lẫn dữ liệu "vận hành" và
"hồ sơ") hay tách bảng `employee_profiles` 1-1 với `employees` (tách mối quan tâm, nhưng thêm 1 JOIN mọi
nơi cần hiển thị)?
**Đề xuất:** bảng riêng `employee_profiles` (FK 1-1 tới `employees.id`) — `employees` giữ nguyên vai trò
"ai đang ở Tổ nào, đang hoạt động hay không" (Module 1 cần đọc thường xuyên, nên giữ nhẹ), hồ sơ chi
tiết tách riêng chỉ đọc khi vào đúng màn hồ sơ. Cùng tinh thần tách `production_records`/
`production_record_items` đã làm ở Module 1.
**Mức độ chắc chắn:** trung bình-cao — khớp pattern chuẩn hóa đã dùng nhất quán trong schema hiện tại.

### 2.4 — Đơn nghỉ phép: cần quy trình phê duyệt hay chỉ ghi nhận?
**Câu hỏi:** Có cần trạng thái `pending → approved/rejected` (ai là người duyệt khi chỉ có Admin?), hay
vì hiện tại chỉ 1 Admin thao tác nên "ghi nhận nghỉ phép" và "duyệt nghỉ phép" là cùng 1 hành động?
**Đề xuất:** v1 KHÔNG cần workflow phê duyệt nhiều bước (chỉ có 1 Admin, tự ghi = tự duyệt) — bảng
`leave_records` ghi thẳng `status = confirmed` giống `attendance_records` mặc định (CLAUDE.md hiện tại),
để dành workflow phê duyệt thật cho lúc có role Tổ trưởng tự nộp đơn (liên quan câu 2.6).
**Mức độ chắc chắn:** trung bình.

### 2.5 — Lịch sử điều chuyển Tổ: có thật sự cần ở Module 2, hay Module 1 đã đủ?
**Câu hỏi:** `production_records.team_id` đã denormalize Tổ tại thời điểm ghi (CLAUDE.md mục 4, giữ đúng
lịch sử khi đổi Tổ) — vậy Module 2 có cần thêm 1 bảng `employee_team_history` tường minh (ai từng ở Tổ
nào, từ ngày nào) để tra cứu trực tiếp, hay suy ra từ `production_records` là đủ?
**Đề xuất:** thêm bảng nhỏ `employee_team_history` (employee_id, team_id, effective_from, effective_to)
— lý do: nhân viên có thể đổi Tổ ngay cả những ngày KHÔNG có `production_records` (nghỉ, chưa ghi phiếu),
suy ngược từ dữ liệu sản lượng sẽ có khoảng trống sai lệch.
**Mức độ chắc chắn:** trung bình.

### 2.6 — Có gộp chung với "Tổ trưởng tự đăng nhập" (Module 1 release 2) không?
**Câu hỏi:** ADR-0001 đã note việc Tổ trưởng đăng nhập là "release sau" của MODULE 1, không phải Module
2 — nhưng về mặt dữ liệu, "ai có tài khoản đăng nhập" chính là thông tin nhân sự. Làm 2 việc này tách
biệt hoàn toàn, hay Module 2 nên mở khóa việc tạo tài khoản cho Tổ trưởng như một phần "quản lý nhân sự"?
**Đề xuất:** **tách biệt** — Module 2 chỉ làm hồ sơ + nghỉ phép, KHÔNG đụng vào luồng đăng nhập/phân
quyền Tổ trưởng (đó vẫn là 1 ADR riêng thuộc Module 1 release 2 nếu làm). Lý do: gộp 2 việc vào 1 giai
đoạn làm phạm vi phình to khó kiểm soát, đúng tinh thần "must-have theo đúng thứ tự" (CLAUDE.md §9, dự án
làm một mình).
**Mức độ chắc chắn:** trung bình-cao.

### 2.7 — Vị trí trong UI: thêm route/tab mới hay gộp vào "Hồ sơ" hiện có?
**Câu hỏi:** Tab "Hồ sơ" hiện tại (mobile) là hồ sơ CỦA Admin đang đăng nhập (đổi mật khẩu, đăng xuất...)
— khác hoàn toàn với "hồ sơ nhân sự của công nhân". `UI_UX_GUIDE_RUBBER_FARM.md` đề xuất "Nhân sự" là 1
mục menu riêng (chủ yếu web/tablet, đúng tinh thần CLAUDE.md §5 "Web/Tablet ưu tiên quản lý công nhân").
**Đề xuất:** route mới hoàn toàn `features/employee-profiles` (không đụng `features/profile` hiện tại),
ưu tiên build web/tablet trước (bảng nhiều cột, giống `admin-catalog`), mobile chỉ cần xem nhanh (không
cần form nhập đầy đủ trên điện thoại — nhất quán cách Module 1 đã phân công mobile/web).
**Mức độ chắc chắn:** cao.

### 2.8 — Timeline: bao nhiêu tuần, ưu tiên gì trước?
**Câu hỏi:** Module 1 dùng 6 tuần (CLAUDE.md §8). Module 2 nhỏ hơn nhiều (không có OCR/report phức tạp)
— ước lượng bao lâu, và trong phạm vi §1 thì phần nào MUST làm trước?
**Đề xuất (nháp, cần Admin duyệt phạm vi §1 trước mới ước lượng chính xác được):**
| Tuần | Nội dung |
|---|---|
| 1 | Schema `employee_profiles`/`employee_team_history`/`leave_records` (migration Flyway) + API CRUD hồ sơ |
| 2 | Frontend web: màn danh sách + chi tiết hồ sơ nhân viên (mở rộng `admin-catalog/employees`) |
| 3 | Đơn nghỉ phép (ghi nhận, không workflow phức tạp — câu 2.4) + lịch sử điều chuyển Tổ (câu 2.5) |
| 4 | Upload tài liệu đính kèm (tái dùng Supabase Storage) + polish/test dữ liệu thật |
**Mức độ chắc chắn:** thấp — chỉ ước lượng thô, phụ thuộc hoàn toàn kết quả §1/2.1.

---

## 3. Việc cần làm để khởi động chính thức

- [ ] Admin trả lời từng câu 2.1–2.8 (đặc biệt §1 phạm vi + 2.1 field cụ thể — 2 mục còn lại đều suy ra
      được từ đây).
- [ ] Sau khi chốt, tách từng câu thành ADR riêng (`docs/adr/0023-...` trở đi), theo đúng số thứ tự tiếp
      nối ADR hiện có (mới nhất: `0022-attendance-status-split.md`).
- [ ] Viết migration Flyway cho bảng mới (`db/migrations/0XX_...sql`), cập nhật CLAUDE.md mục 4 (Data
      Model) và mục 1 (mô tả phạm vi Module 2 chính thức thay vì 2 dòng ghi chú hiện tại).
- [ ] Cập nhật `docs/TASKS.md` với Phase mới cho Module 2 (theo đúng format Phase đã dùng cho Module 1).

---

## 4. Việc KHÔNG grilling lại (đã chốt sẵn từ Module 1, áp dụng nguyên cho Module 2)

- Tech stack (Expo/Spring Boot/PostgreSQL/Flyway/Supabase Storage) — không đổi, chỉ mở rộng.
- Auth JWT hiện tại (access-token-only, ADR-0004) — không đổi trừ khi câu 2.6 được chốt làm.
- Naming convention DB tiếng Anh snake_case (CLAUDE.md §6).
- Pattern signed URL cho ảnh/tài liệu riêng tư qua `SupabaseStorageService` (đã dùng ổn định ở Module 1).
- Pattern `edit_history` polymorphic cho audit trail — áp dụng luôn cho bảng hồ sơ nhân sự mới nếu cần
  sửa/xóa có lịch sử.
