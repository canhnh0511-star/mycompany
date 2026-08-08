# Phạm vi test frontend — v1

Dự án làm một mình (CLAUDE.md §9); backend Phase 5 (unit + integration test) cũng còn treo
(`docs/TASKS.md`). Cần chốt frontend có test từ đầu hay để sau, và test tầng nào.

**Quyết định:** v1 **chưa viết e2e** (Detox/Maestro). Chỉ viết unit test cho phần logic thuần không phụ
thuộc UI, dễ vỡ nhất khi sửa: mapping lỗi `BatchResult` → field form (ADR-0013), interceptor 401
(ADR-0009), hiển thị `unmatchedLines` từ fuzzy-match (luồng OCR). Component test và e2e để dành tới khi
tính năng ổn định.

**Lý do:** ưu tiên tính năng must-have đúng thứ tự timeline (CLAUDE.md §9), tránh đầu tư test suite sớm
cho UI còn thay đổi nhiều trong giai đoạn đầu.
