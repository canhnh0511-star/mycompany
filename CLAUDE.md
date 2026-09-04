# CLAUDE.md — Ngữ cảnh dự án cho Claude Code

> File này giúp Claude Code hiểu dự án ở mọi session, không cần giải thích lại từ đầu.
> Cập nhật file này khi scope/stack thay đổi.

---

## 1. Dự án là gì

Hệ thống số hóa quản lý **chi phí / sản lượng** cho **trại cạo mủ cao su**, thay thế quy trình ghi phiếu giấy thủ công hiện tại (sổ ghi mủ, sổ bán mủ, bảng lương Excel).

**Ngành nghề cụ thể:** khai thác & bán mủ cao su. Có 2 luồng dữ liệu chính:
1. **Sản lượng cá nhân** — mỗi công nhân cạo mủ hàng ngày, ghi theo nhiều loại mủ (mủ nước, mủ chén, mủ dây, mủ đông), kèm chỉ số DRC (% hàm lượng cao su khô). Dữ liệu này là đầu vào để tính lương (Module 3).
2. **Bán mủ theo Tổ** — Tổ bán mủ đã thu gom cho người mua bên ngoài, ghi theo ngày, có chữ ký 2 bên. Đây là luồng khác, không gắn với cá nhân.

**Module 1 (đang làm)** — phạm vi:
- Nhập liệu thủ công qua form (nhanh, nhiều dòng/tổ/ngày) — cho cả sản lượng cá nhân lẫn sổ bán mủ.
  API dạng batch, xử lý best-effort theo từng dòng — xem `docs/adr/0007-batch-manual-entry-best-effort.md`
- Nhập liệu tự động: chụp ảnh phiếu giấy → AI đọc (OCR/vision) → người dùng xác nhận/sửa → lưu DB
- Tra cứu, lọc, xem lịch sử chỉnh sửa
- Báo cáo tổng hợp theo ngày/tháng/tổ/nhân viên + xuất Excel/PDF
- Đặt nền móng auth/DB/phân quyền để tái dùng cho Module 2 (Nhân sự) và Module 3 (Tính lương)
- Khai báo sẵn danh mục loại mủ, đơn giá theo thời gian, và các loại phụ cấp/khấu trừ (trợ cấp mưa bão, bôi thuốc, chuyên cần, tiền đèn, công xã miệng) — để Module 3 sau này tính lương tự động mà không phải nhập lại dữ liệu thô.

**Ngoài phạm vi Module 1:** tính lương tự động (chỉ khai báo cấu hình, chưa tính), hồ sơ nhân sự đầy đủ.

Chi tiết đầy đủ: xem `docs/module-1-chi-phi-san-luong-spec.md` (copy từ spec gốc vào repo).

---

## 2. Vai trò & phân quyền

| Vai trò | Quyền |
|---|---|
| **Tổ trưởng** | Nhập liệu (form/ảnh) cho tổ mình. Xem lại dữ liệu tổ mình. Không xem tổ khác. |
| **Admin (Giám đốc/Nhân sự)** | Xem toàn bộ dữ liệu. Xác nhận/sửa dữ liệu OCR. Xuất báo cáo. Quản lý danh mục Tổ/chi phí. |

> **Lưu ý — phạm vi release 1:** bảng trên là mục tiêu lâu dài. Ở **Module 1 release 1**, chỉ **Admin** thực sự đăng nhập/thao tác trên hệ thống — Admin nhập liệu (form/ảnh) **hộ cho tất cả các Tổ**, thay cho việc số hóa sổ giấy thủ công hiện tại. Tổ trưởng vẫn ghi sổ giấy tay như cũ; đăng nhập + tự nhập liệu của Tổ trưởng là tính năng của **release sau**. Xem `docs/adr/0001-admin-only-v1-scope.md`.

---

## 3. Tech Stack (đã chốt)

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Frontend (Mobile app) | **Expo** (React Native + Expo Router) | Ưu tiên các luồng thao tác tại thực địa (chụp phiếu OCR, nhập nhanh) — chạy được cả trên web nhưng không phải mục tiêu chính |
| Frontend (Web quản lý) | **React + TypeScript + Vite** (React Router, TanStack Query, React Hook Form, Zod, MUI) | Web app riêng, desktop-first — cho các luồng bàn giấy (tổng quan, báo cáo, bảng lương, cấu hình danh mục). Xem `docs/specs/spec-3-web-ui-home.md`. Ở release hiện tại chỉ màn Tổng quan/Home được triển khai — các màn khác PENDING PREVIEW, xem spec §44 |
| Backend | **Java Spring Boot + Gradle** (single module, package theo layer — mục 6) | REST API |
| Database migration | **Flyway** | Chạy `.sql` thuần trong `db/migrations/`. Xem `docs/adr/0003-flyway-for-migrations.md` |
| Database | **PostgreSQL** (Supabase free tier, chỉ dùng Postgres + Storage, KHÔNG dùng Supabase Auth/BaaS) | Spring Boot kết nối qua JDBC |
| Lưu trữ ảnh phiếu gốc | **Supabase Storage** | Cùng project với DB, API kiểu S3 |
| AI đọc ảnh (OCR) | Claude API (vision) | Gọi **đồng bộ** từ Spring Boot backend (v1), trả JSON có cấu trúc. Xem `docs/adr/0005-synchronous-ocr-call.md` |
| Auth | Tự triển khai trong Spring Boot (JWT) — **chỉ access token, hết hạn 1 ngày, không refresh token**; tài khoản Admin seed sẵn qua migration, không có đăng ký công khai | Không dùng Supabase Auth. Xem `docs/adr/0004-auth-simplified-for-v1.md` |
| Xuất báo cáo | Thư viện Java (Apache POI cho Excel, iText/OpenPDF cho PDF) — sinh ở backend | Đảm bảo nhất quán dữ liệu giữa web/app |

**Cấu trúc repo dự kiến (monorepo):**
```
/apps
  /mobile          → Expo app (React Native, chạy được cả web)
  /web             → Web quản lý (React + Vite + MUI) — chỉ Home đã triển khai
/services
  /api             → Spring Boot + Gradle
/db
  /migrations      → 001_init_schema.sql, ...
/docs
  module-1-chi-phi-san-luong-spec.md
CLAUDE.md
```

---

## 4. Data Model

Schema chính thức nằm ở `db/migrations/001_init_schema.sql` (PostgreSQL, tên bảng/cột tiếng Anh — quy ước bắt buộc, xem mục 6). Tóm tắt:

```
teams               — id, name, description
users               — id, full_name, email, password_hash, role (team_lead|admin), team_id (nullable nếu admin)
employees           — id, full_name, team_id, status (active|inactive), user_id (nullable, FK → users —
                       khi nhân viên đồng thời là 1 User, ví dụ Tổ trưởng tự cạo mủ)

latex_types          — danh mục loại mủ: water | cup | strip | coagulated (đơn vị kg). Danh mục MỞ —
                       không giả định cố định vĩnh viễn (xem docs/adr/0002-normalize-latex-type-storage.md)
rate_configs         — đơn giá theo latex_type_id, có hiệu lực theo thời gian (effective_from/to), thống
                       nhất toàn công ty (không phân biệt theo Tổ/khu vực). Ràng buộc: 2 dòng cùng
                       latex_type_id không được có khoảng effective_from/to chồng lấn (exclusion constraint ở DB)
allowance_configs    — danh mục phụ cấp/khấu trừ (storm_allowance, medication, attendance,
                       lighting, tapping_work) — dùng cho Module 3 sau này, khai báo sẵn ở đây.
                       Cùng ràng buộc chống chồng lấn effective_from/to như rate_configs.
                       Lưu ý: "lighting" (tiền đèn) là khoản cố định/tháng, không gắn với attendance_records
                       theo ngày — không xuất hiện trong attendance_type bên dưới (đây là chủ ý, không phải thiếu sót)

ocr_call_logs        — 1 dòng / lần gọi Claude API (vision), bất kể thành công hay lỗi — theo dõi chi phí,
                       thời gian phản hồi, tỷ lệ thành công
  - called_by, called_at, target_type (production_record|latex_sale — loại phiếu Admin ĐÃ CHỌN trước), photo_url, model
  - duration_ms, success (lỗi kỹ thuật hay không), error_message (khi success=false)
  - type_mismatch (chỉ có ý nghĩa khi success=true — ảnh không khớp target_type đã chọn → không tạo draft)
  - input_tokens, output_tokens, estimated_cost_usd (tính theo đơn giá model tại thời điểm gọi)

production_records   — sản lượng CÁ NHÂN theo ngày (bảng header, 1 dòng / nhân viên / ngày)
  - record_date, employee_id, team_id (bản sao denormalize của employees.team_id tại thời điểm ghi —
    giữ đúng lịch sử nếu nhân viên đổi tổ sau này; không có điều động tạm giữa các tổ trong ngày)
  - notes
  - source (manual|ocr_import), photo_url, ocr_call_log_id (nullable, trace về ocr_call_logs), created_by,
    status (draft|confirmed|cancelled)
  - low_confidence_fields (JSONB, nullable) — field nào OCR không chắc chắn khi tạo draft, để frontend
    đọc thẳng từ draft row mà highlight (CLAUDE.md §5), không phải state tạm ở client (ADR-0006)
  - 1 record ACTIVE (status <> cancelled) / employee_id / record_date (partial unique index)
production_record_items — chi tiết khối lượng theo từng loại mủ trong 1 production_record (chuẩn hóa,
                       xem docs/adr/0002-normalize-latex-type-storage.md)
  - production_record_id, latex_type_id, kg
  - drc_percent — CHỈ có giá trị khi latex_type = water (DRC chỉ đo cho mủ nước)
  - UNIQUE(production_record_id, latex_type_id)

attendance_records  — công/chuyên cần theo ngày (tách riêng vì logic tính lương khác sản lượng)
  - record_date, employee_id, attendance_type, quantity
  - status (draft|confirmed|cancelled), mặc định confirmed — dữ liệu nhập tay không qua OCR nên coi
    như đã confirmed ngay; chỉ ở trạng thái draft khi tạo qua luồng OCR (CLAUDE.md §5)

latex_sales          — bán mủ theo TỔ cho người mua ngoài (bảng header, khác luồng sản lượng cá nhân)
  - record_date, team_id
  - buyer_name, seller_signed_by, notes
  - photo_url, ocr_call_log_id (nullable, trace về ocr_call_logs), created_by, status (draft|confirmed|cancelled)
  - low_confidence_fields (JSONB, nullable) — cùng ý nghĩa như production_records.low_confidence_fields
    ở trên
latex_sale_items     — chi tiết khối lượng theo từng loại mủ trong 1 latex_sale, cùng mô hình chuẩn hóa
                       như production_record_items
  - latex_sale_id, latex_type_id, kg
  - drc_percent — CHỈ có giá trị khi latex_type = water
  - UNIQUE(latex_sale_id, latex_type_id)

edit_history          — polymorphic (table_name + record_id), old_data/new_data dạng JSONB.
                       Chỉ ghi các lần SỬA sau khi bản ghi đã tồn tại (không ghi sự kiện tạo mới).
                       Không có hard delete — "xóa" là chuyển status sang cancelled, không xóa khỏi DB.
                       Ghi ở mức AGGREGATE: mỗi lần sửa snapshot toàn bộ record + tất cả items liên quan
                       (không tách riêng theo từng item) — phục vụ đối chiếu tranh chấp cần xem toàn cảnh.
```

**Lưu ý quan trọng:** tên bảng/cột trong DB là **tiếng Anh**. Nhãn tiếng Việt (Mủ nước, Trợ cấp mưa bão...) chỉ xuất hiện ở cột `label`/`name` — là dữ liệu hiển thị cho người dùng, không phải tên schema.

---

## 5. Luồng nghiệp vụ quan trọng — Nhập liệu qua ảnh (tính năng trọng tâm)

Áp dụng cho cả 2 loại phiếu: **sổ ghi mủ** (→ `production_records`) và **sổ bán mủ** (→ `latex_sales`).

```
Admin chọn TRƯỚC loại phiếu — "Sổ ghi mủ" hay "Sổ bán mủ" (khác schema/employee vs team, xem mục 2 UX)
  → Admin đưa ảnh vào theo 1 trong 2 cách, có thể lặp lại nhiều lần liên tục không cần chờ:
      (a) Chụp trực tiếp bằng camera (chế độ liên tục — chụp xong tự quay lại camera ngay)
      (b) Chọn NHIỀU ảnh có sẵn từ thư viện điện thoại cùng lúc (vd ảnh Tổ trưởng gửi qua Zalo)
  → Mỗi ảnh: upload lên Supabase Storage → backend gọi Claude API (vision), đồng thời:
      - yêu cầu Claude xác nhận ảnh có khớp loại phiếu Admin đã chọn không (không chỉ trích xuất mù quáng)
      - ghi 1 dòng ocr_call_logs (mục 4) — success (lỗi kỹ thuật hay không), type_mismatch (khớp loại
        phiếu hay không), duration/tokens/cost — phục vụ theo dõi chi phí/thời gian phản hồi/tỷ lệ thành công
  → Nếu type_mismatch = true: KHÔNG tạo draft — báo Admin ảnh này bị loại (không khớp loại đã chọn) để
    chụp/chọn lại đúng loại, hoặc xử lý riêng
  → Nếu khớp: ghi NGAY (các) row production_records/latex_sales với status = draft, kèm photo_url
    (1 ảnh có thể tạo NHIỀU draft row nếu có nhiều nhân viên trên cùng 1 phiếu sổ ghi mủ; backend
    fuzzy-match tên đọc được với danh sách employees cho từng dòng)
  → Frontend hiển thị bảng kết quả CÓ THỂ CHỈNH SỬA — đọc trực tiếp từ các draft row vừa tạo,
    KHÔNG phải state tạm ở client (chống mất dữ liệu nếu Admin bị gián đoạn giữa chừng)
  → Người dùng xác nhận/sửa (PATCH lên draft row, có thể làm nhiều lần / bỏ dở rồi quay lại)
  → Bấm "Lưu" → PATCH đổi status → confirmed
```

Xem `docs/adr/0006-ocr-writes-draft-immediately.md`.

**Ràng buộc bắt buộc:**
- KHÔNG được tự động đổi status thành `confirmed` khi chưa qua bước xác nhận của người dùng. Ghi `draft`
  ngay sau khi OCR trả kết quả là hợp lệ (xem ADR-0006) — đó không phải "auto-save", chỉ là lưu tạm chờ
  duyệt; `confirmed` chỉ xảy ra sau khi Admin xem/sửa và bấm "Lưu".
- Trường nào AI không chắc chắn (chữ mờ, khó đọc) → đánh dấu/highlight để người dùng chú ý.
- Ảnh không khớp loại phiếu đã chọn (`type_mismatch`) → KHÔNG tạo draft, không cố gán ép vào sai schema.
- Ảnh gốc luôn lưu kèm bản ghi (`photo_url`) để đối chiếu khi có tranh chấp số liệu.
- `latex_sales` không có employee_id — chỉ ghi tên người ký (`seller_signed_by`) dạng text, vì đây là giao dịch cấp Tổ.
- **Sổ giấy tràn nhiều trang:** form giấy in theo số lượng nhân viên nên 1 dòng/nhân viên KHÔNG BAO GIỜ bị cắt
  ngang giữa 2 trang — chỉ có SỐ LƯỢNG nhân viên tràn qua trang khi Tổ phát sinh thêm người. Không cần cơ chế
  gộp nhiều ảnh thành 1 phiếu: mỗi trang chụp riêng, mỗi dòng độc lập theo `employee_id` + `record_date` —
  các draft từ nhiều trang cùng ngày tự động gộp chung khi Admin xem lại (không phụ thuộc ảnh nào tạo ra).

### Điều hướng & UX trên Mobile (v1)

Admin dùng app chủ yếu bằng **điện thoại**, đi thực địa tới từng Tổ (xem Rủi ro §9 về mất mạng). Web/tablet
dành cho nhập liệu hàng loạt kiểu bảng tính, quản lý danh mục, báo cáo — không tối ưu cho mobile.

**4 tab chính** (đổi 2026-08-13 theo quyết định Product Owner khi làm redesign UI/UX — xem
`docs/module-1-1-frontend-redesign-progress.md` Phase 3 cho bảng mapping đầy đủ; bản gốc dưới đây đã
lỗi thời, giữ lại icon ý nghĩa nghiệp vụ không đổi):
- **Hôm nay** (mặc định khi mở app) — Home/Daily Dashboard mới: tình hình sản lượng/phiếu/tổ hôm nay,
  CTA "Chụp phiếu" nổi bật, mục "Cần chú ý"
- **Phiếu** — hub 2 lối vào: "Chụp phiếu" (luồng OCR, xem mục 5) và "Nhập tay nhanh" (sửa/thêm 1 dòng
  ngay trên điện thoại, không cần mở web — dành cho việc gấp). 2 route gốc (`capture`/`quick-entry`)
  vẫn còn nguyên vẹn, chỉ ẩn khỏi thanh tab
- **Sản lượng** (đổi tên từ "Tra cứu", route/logic không đổi) — xem lại record theo Tổ/ngày, kể cả
  `draft` chưa `confirm`
- **Hồ sơ** — thông tin cá nhân, đăng xuất

**UX riêng cho màn Chụp ảnh:**
- **V1 KHÔNG có auto-crop/sharpen tự động phát hiện cạnh giấy** (khác bản mô tả gốc — không khả thi
  trong Expo managed workflow, xem `docs/adr/0011-ocr-capture-flow-v1-scope.md`). Chỉ có crop thủ công
  đơn giản (Admin tự kéo khung nếu muốn) qua `expo-image-manipulator`; ảnh gửi Claude Vision gần như
  nguyên gốc. Đo lại nhu cầu auto-crop sau khi có dữ liệu OCR thật.
- Cảnh báo lỗi/`type_mismatch` ngay tại chỗ trên chính màn hình chụp (không phải đợi vào tab Tra cứu mới biết) — để Admin xử lý trong lúc còn đứng ở đúng Tổ; hiện dưới dạng toast/banner không chặn, kèm nút "Xem chi tiết".
- Ghi nhớ Tổ đang làm việc trong phiên — ảnh tiếp theo mặc định vẫn gán Tổ vừa chọn, có nút "Đổi Tổ" rõ ràng khi di chuyển. Lưu ở state trong bộ nhớ (không persist), reset khi app bị kill.

---

## 6. Quy ước code

- **Backend:** package theo layer (`controller`, `service`, `repository`, `dto`, `entity`); dùng Spring Data JPA; validate input bằng `jakarta.validation`.
- **Frontend:** dùng TypeScript; tổ chức theo feature folder (`features/production-records`, `features/auth`, ...); state management đơn giản trước (Context/Zustand), không thêm Redux trừ khi thật cần.
- **Naming DB:** bắt buộc tiếng Anh, snake_case cho bảng/cột (ví dụ `production_records`, `record_date`). Nhãn tiếng Việt chỉ nằm trong dữ liệu (cột `label`/`name`), không nằm trong tên schema.
- **Commit:** mỗi commit tương ứng 1 tính năng/task hoàn chỉnh, có thể chạy được — tránh commit dở dang giữa chừng.
- **Không commit secrets:** `.env`, application-secrets.yml phải nằm trong `.gitignore` ngay từ commit đầu tiên.

---

## 7. Logging & Observability

Mục tiêu: khi phát sinh lỗi ở production, trace được đầy đủ những gì đã xảy ra chỉ từ log — không cần đoán. Xem `docs/adr/0008-logging-conventions.md`.

- **Định dạng:** JSON có cấu trúc, ghi ra **stdout** (không ghi file riêng) — chưa chốt nơi host backend, nhưng hầu hết nền tảng (Railway/Render/Fly.io/VPS + `journalctl`) đều tự capture stdout; JSON dễ cắm vào bất kỳ công cụ search/aggregate log nào sau này.
- **Request/Correlation ID:** 1 servlet filter sinh UUID cho mỗi HTTP request, gắn vào SLF4J MDC (mọi dòng log trong lúc xử lý request đó tự động kèm ID này) và trả về qua response header `X-Request-Id`. Khi có lỗi, chỉ cần 1 ID để `grep`/query ra toàn bộ log liên quan, kể cả khi request đi qua nhiều service method.
- **Log level:**
  - `INFO` — sự kiện nghiệp vụ quan trọng (login, tạo/xác nhận/hủy record, gọi OCR thành công)
  - `WARN` — vấn đề tự phục hồi được (OCR trả field không chắc chắn, fuzzy-match không khớp)
  - `ERROR` — exception, luôn kèm stack trace đầy đủ + request ID (global exception handler log ở đây)
- **KHÔNG log:** `password_hash`, JWT token, nội dung ảnh phiếu (binary) — chỉ log `photo_url`/id, không log dữ liệu nhạy cảm.

---

## 8. Timeline tham chiếu (6 tuần cho Module 1)

| Tuần | Nội dung |
|---|---|
| 1 | Setup Expo + Spring Boot + Supabase (Postgres/Storage), DB schema, đăng nhập/phân quyền |
| 2 | Form nhập tay (nhiều dòng/tổ/ngày), CRUD Tổ & Nhân viên |
| 3 | Tích hợp Claude API đọc ảnh phiếu, tinh chỉnh prompt trả JSON đúng cấu trúc |
| 4 | Màn hình review/xác nhận OCR (bảng chỉnh sửa được), fuzzy-match tên nhân viên |
| 5 | Tra cứu/lọc lịch sử, lưu lịch sử chỉnh sửa |
| 6 | Báo cáo tháng (biểu đồ + xuất Excel/PDF), test với dữ liệu thật, sửa lỗi |

---

## 9. Rủi ro cần lưu ý khi code

- Độ chính xác OCR chữ viết tay có thể không cao → bước xác nhận thủ công là bắt buộc, không được bỏ qua để "tiện".
- Trùng/sai tên nhân viên khi fuzzy-match → luôn cho phép người dùng chọn thủ công nếu hệ thống không khớp chính xác.
- Dự án làm một mình → ưu tiên tính năng must-have (đúng thứ tự timeline), để UI polish/biểu đồ đẹp lại sau.
- **Mất mạng khi chụp ảnh thực địa:** Admin thao tác chính bằng điện thoại, đi thực địa tới từng Tổ (có thể sóng/wifi yếu), nhưng v1 KHÔNG có offline queue và OCR gọi đồng bộ (ADR-0005) — nếu mất mạng đúng lúc chụp ảnh, request sẽ lỗi/treo. V1 chấp nhận rủi ro này (đơn giản hóa để kịp timeline); cần thông báo lỗi rõ ràng + cho phép chụp lại/thử lại ngay trên màn hình, và cân nhắc offline queue nếu vấn đề xảy ra thường xuyên trong thực tế.