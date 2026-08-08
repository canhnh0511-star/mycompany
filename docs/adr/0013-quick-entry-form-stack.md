# Form "Nhập tay nhanh" — react-hook-form + zod, lỗi map theo index

Form nhiều dòng động (thêm/xóa dòng, mỗi dòng nhiều loại mủ) cần 1 thư viện quản lý form phù hợp, và cần
quyết định validate phía client trùng lặp với Jakarta Validation phía backend đến mức nào — trong khi lỗi
trả về từ API là `BatchResult<T>` theo `index` (ADR-0007), không phải theo field name.

**Quyết định:** dùng **react-hook-form** (`useFieldArray` cho danh sách dòng động) + **zod** cho schema
validate. Chỉ validate ở client những gì rẻ/rõ ràng (required field, số âm, ngày hợp lệ) — KHÔNG mô phỏng
lại business rule phía backend (vd overlap `effective_from`/`effective_to`, partial unique index) vì
nguồn sự thật vẫn là response `BatchResult`. Lỗi từng dòng từ response batch map ngược lại đúng dòng
trong `useFieldArray` theo `index`, hiển thị inline tại dòng đó — không phải alert chung cho cả form.

**Lý do:** react-hook-form hiệu năng tốt với danh sách dài trên mobile (không re-render toàn form mỗi
lần gõ); giữ nguyên 1 nguồn sự thật cho business rule ở backend tránh 2 nơi có logic lệch nhau theo thời
gian.
