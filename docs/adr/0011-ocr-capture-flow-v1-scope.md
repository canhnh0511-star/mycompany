# Luồng Chụp ảnh/OCR trên frontend — phạm vi v1

> **Superseded một phần bởi ADR-0021** (Scan Session/Batch model): "phiên" mô tả ở đây (Zustand
> process-lifetime, không có backend representation) được thay bằng `ScanBatch`/`ScanImage` thật —
> xem ADR-0021 và plan implementation phase 3 (frontend capture rework). Nội dung dưới đây giữ
> nguyên làm bối cảnh lịch sử.

CLAUDE.md §5 mô tả "tự động crop & làm nét ảnh trước khi gửi OCR" kiểu app scan tài liệu (phát hiện 4
cạnh giấy, warp phối cảnh) — tính năng này KHÔNG có sẵn trong Expo managed workflow:
`expo-image-manipulator` chỉ resize/rotate/crop theo tọa độ cố định, không tự phát hiện cạnh. Ngoài ra,
spec gốc chưa định nghĩa cách xử lý khi Admin chụp ảnh tiếp lúc ảnh trước còn đang xử lý, cách báo lỗi tại
chỗ, và phạm vi "phiên" của Tổ đang làm việc.

**Quyết định (v1):**
- **Bỏ auto-crop/sharpen tự động phát hiện cạnh giấy.** Giữ crop thủ công đơn giản (Admin tự kéo khung
  nếu muốn) qua `expo-image-manipulator`; nếu Admin không tự crop, gửi ảnh gần nguyên gốc cho Claude
  Vision. Đo lại nhu cầu sau khi có dữ liệu OCR thật (Phase 3 backend cũng đang chờ ảnh thật để verify —
  đo cùng lúc, xem `docs/TASKS.md`).
- **Camera liên tục xử lý qua hàng đợi TRONG BỘ NHỚ** (không phải offline queue bền vững — CLAUDE.md §9
  đã chấp nhận rủi ro mất mạng ở v1). Mỗi ảnh là 1 item với trạng thái
  `uploading → processing → done/error`, hiển thị danh sách nhỏ dưới khung camera (giống progress list
  app scan tài liệu).
- **Lỗi/`type_mismatch` hiện qua toast/banner KHÔNG chặn** (Admin vẫn chụp tiếp được), kèm nút "Xem chi
  tiết" mở ảnh lỗi để chụp lại hoặc bỏ qua.
- **Tổ đang làm việc trong phiên** lưu ở Zustand store, sống theo vòng đời app process — KHÔNG persist
  qua `AsyncStorage`. Mở lại app sau khi bị kill giữa chừng thực địa là tình huống hiếm; chọn lại Tổ 1 lần
  không phải chi phí lớn.

**Lý do:** ưu tiên tốc độ triển khai must-have (CLAUDE.md §9), tránh xây tính năng document-scanner phức
tạp (đòi hỏi native module + custom dev client, không chạy Expo Go — xem ADR-0018) khi chưa có bằng chứng
nó thực sự cần thiết để OCR đọc đúng — Claude Vision vốn chịu ảnh nghiêng/thiếu sáng khá tốt.

**Hệ quả:** câu "Tự động crop & làm nét ảnh trước khi gửi OCR" ở CLAUDE.md §5 được cập nhật lại cho khớp
quyết định này (xem commit đi kèm ADR này).
