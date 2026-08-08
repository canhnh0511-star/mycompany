# Bảng review OCR — nguồn sự thật vẫn là server, không giữ list draft riêng ở client

ADR-0006 yêu cầu bảng review sau OCR đọc TRỰC TIẾP từ draft row (không phải state tạm ở client) để chống
mất dữ liệu nếu Admin bị gián đoạn. Cần chốt: sau khi `POST /ocr/capture` trả về danh sách draft vừa tạo,
bảng review render từ đâu, và render lại thế nào nếu Admin rời màn rồi quay lại.

**Quyết định:** render NGAY bằng response của `POST /ocr/capture` (tránh 1 round-trip GET thừa ngay sau
khi vừa capture xong), đồng thời `queryClient.setQueryData`/invalidate đúng query key "draft list"
(TanStack Query, ADR-0009) để đồng bộ cache. Nếu Admin rời màn rồi quay lại — kể cả sau khi app bị kill —
màn review (hoặc tab Tra cứu) PHẢI fetch lại bằng `GET .../records?status=draft&...`, KHÔNG được giữ list
draft riêng ở `AsyncStorage`. Sửa trên bảng review gọi thẳng `PATCH /production-records/{id}` (hoặc
`/latex-sales/{id}`) từng dòng — không gom thành batch riêng, vì đây là sửa 1 aggregate đã tồn tại, khác
với tạo mới hàng loạt ở Phase 2 (ADR-0007).

**Lý do:** giữ đúng tinh thần ADR-0006 (nguồn sự thật luôn là server, response `capture` chỉ là optimistic
render ban đầu) trong khi vẫn tránh 1 lần gọi GET thừa ngay sau capture.
