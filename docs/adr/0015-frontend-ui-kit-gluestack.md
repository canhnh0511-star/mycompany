# Frontend UI kit — gluestack-ui + lớp abstraction `App*`

Cần chọn 1 UI kit dùng chung cho Expo Native + Web, thay vì tự build toàn bộ component (Button, Input,
Modal, DataTable...) từ đầu, đúng tinh thần CLAUDE.md §9 ("ưu tiên must-have, UI polish để sau").

**Quyết định:** dùng **gluestack-ui** làm nền tảng UI. Các component phổ biến (Button, Input, Modal,
Select, Checkbox, Toast...) được **wrap qua lớp abstraction riêng của project** (`AppButton`, `AppInput`,
...) — feature code KHÔNG import thẳng component gluestack. Component nghiệp vụ xây riêng trên abstraction
này. Ưu tiên component dùng chung giữa Expo Native và Expo Web; những UI khác biệt lớn giữa mobile/web
(DataTable, Sidebar, Dashboard layout) được phép có implementation riêng theo platform (tách file
`.native.tsx`/`.web.tsx` hoặc tương đương). KHÔNG xây design system phức tạp ở v1 — chỉ định nghĩa token
cơ bản: color, spacing, font size, border radius.

**Lý do:** gluestack-ui hỗ trợ tốt cả Native lẫn Web, khớp yêu cầu "1 codebase cho iOS/Android/Web"
(CLAUDE.md §3). Lớp abstraction `App*` giữ khả năng đổi UI kit sau này mà không phải sửa lại toàn bộ
feature code, đồng thời là nơi áp token riêng của dự án và các hành vi dùng chung (vd style lỗi
validate, loading state).

**Hệ quả:** thay thế đề xuất ban đầu (`react-native-paper`) đã nêu ở buổi grilling trước
(`docs/frontend-grilling-plan.md` §2.8 bản cũ) — quyết định này ghi đè, không dùng react-native-paper.
Mọi component dùng chung phải nằm trong `components/` (wrap gluestack), không import gluestack trực tiếp
trong `features/*`.
