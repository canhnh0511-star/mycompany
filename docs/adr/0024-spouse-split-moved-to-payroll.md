# Chia đôi sản lượng vợ/chồng: chuyển từ lúc OCR sang lúc tính lương

## Bối cảnh

Tính năng "vợ/chồng cùng cạo mủ" (`employees.spouse_employee_id`, migration `004_add_employee_spouse.sql`)
trước đây tự động chia đôi kg **ngay lúc OCR tạo draft** (`ScanBatchService.splitBetweenSpouses`, gọi từ
nhánh `resolveActiveSpouse`): phiếu giấy chỉ ghi số liệu ở 1 trong 2 dòng tên (dòng còn lại bỏ trống —
quy ước ghi sổ thực tế của các tổ có vợ/chồng cùng làm), hệ thống tự tách dòng có số liệu thành 2
`production_record` — mỗi người 1 nửa.

**Vấn đề phát hiện khi test thật (2026-09-06):** việc chia đôi ngay lúc tạo draft khiến màn review/đối
chiếu OCR khó dùng — Admin nhìn ảnh phiếu gốc thấy 1 dòng ghi "18,5 kg" nhưng bảng lại hiện 2 dòng "9,2"
và "9,3" cho 2 người khác nhau, không có dòng nào khớp trực tiếp với số trên ảnh để đối chiếu bằng mắt.

## Quyết định

Chuyển việc chia đôi sang **thời điểm tính lương** (`PayrollService`), KHÔNG còn chia lúc OCR:

- `ScanBatchService`: nhánh `resolveActiveSpouse` bị xóa — dòng OCR khớp 1 nhân viên có cấu hình vợ/chồng
  giờ tạo đúng 1 `production_record` với **nguyên số liệu đọc được**, y hệt như nhân viên không có
  vợ/chồng. Dữ liệu thô (`production_records`/`production_record_items`) từ nay phản ánh ĐÚNG những gì
  ghi trên giấy — không tự suy diễn/chia gì cả.
- `PayrollService`: khi tính kg theo loại mủ cho 1 nhân viên, nếu nhân viên có `spouse_employee_id` đang
  active, cộng dồn kg thô của CẢ HAI người trong tháng rồi chia đôi (quy tắc làm tròn giữ nguyên:
  `floor(tổng/2, 2 chữ số)` cho 1 người, phần dư cho người kia — không mất mát dù tổng lẻ, xem
  `PayrollService.combinedHalf`). Việc này chỉ ảnh hưởng SỐ TIỀN LƯƠNG tính ra, không đụng tới dữ liệu
  sản lượng thô.
- **Không đổi** nhánh `matchCoupleNamePair` (phiếu ghi thẳng "Tên chồng - Tên vợ" chung 1 dòng, không cần
  cấu hình `spouse_employee_id`) — trường hợp này BẮT BUỘC phải tách thành 2 dòng vì bản thân dòng phiếu
  gốc đã gộp chung dữ liệu 2 người, không có "dòng thô của riêng từng người" nào khác để giữ nguyên; tách
  ở đây không tạo ra mâu thuẫn trực tiếp khi đối chiếu (2 dòng con cộng lại vẫn đúng bằng dòng gốc trên
  ảnh), khác hẳn tình huống đã sửa ở trên (1 dòng có số liệu bị chia thành số KHÁC với đúng dòng đó).

## Hệ quả cần biết

- Báo cáo/tra cứu sản lượng theo TỪNG NHÂN VIÊN (`ReportService`, tra cứu Sản lượng) từ nay hiển thị đúng
  y như ghi trên giấy — với cặp vợ/chồng, nghĩa là 1 người có thể hiện đủ 100% số liệu ngày đó còn người
  kia hiện 0, tùy hôm đó phiếu ghi tên ai. Đây là thay đổi CHỦ Ý theo yêu cầu (chỉ chia đôi lúc tính
  lương) — nếu sau này cần báo cáo sản lượng cũng phản ánh chia đôi, phải áp dụng lại logic tương tự
  `PayrollService.combinedHalf` ở `ReportService`.
- Không cần migration DB — cột `spouse_employee_id` giữ nguyên, chỉ đổi tầng đọc dữ liệu.
