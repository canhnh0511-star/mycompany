# components/

Quy ước (ADR-0015 — `docs/adr/0015-frontend-ui-kit-gluestack.md`):

- `ui/` — component gốc do CLI `gluestack-ui add <name>` copy vào (giống shadcn/ui: source code thật,
  không phải package cài qua npm). **Không sửa tay trong `ui/`** trừ khi chấp nhận mất khi chạy lại CLI —
  cần thêm component mới thì chạy `npx gluestack-ui add <name> --path src/components/ui`, đừng tự viết.
- File `App*.tsx` ngay tại `components/` (`AppButton`, `AppInput`, `AppText`, `AppHeading`, ...) — lớp
  abstraction wrap `ui/*`. **Feature code (`features/*`, `app/*`) chỉ được import từ đây, KHÔNG import
  thẳng `@/components/ui/*`.** Đây là nơi:
  - gộp API rườm rà của compound component (`Button`+`ButtonText`+`ButtonSpinner`) thành 1 component dễ
    dùng (`AppButton` nhận thẳng `children` string + `isLoading`).
  - áp token/hành vi dùng chung của dự án sau này (vd style lỗi validate, loading state) — sửa 1 chỗ,
    không phải sửa lại từng màn hình.
  - giữ khả năng đổi UI kit khác trong tương lai mà không phải viết lại toàn bộ `features/*`.
- Component nào `ui/*` chưa có sẵn wrapper (`select`, `modal`, `checkbox`, `pressable`, `box`, `hstack`,
  `spinner`...) — thêm `App*.tsx` tương ứng NGAY KHI feature đầu tiên thực sự cần dùng, đừng tạo trước
  khi có use case thật (tránh đoán API sai).
- Token màu (`--primary`, `--background`, `--destructive`, ...) định nghĩa ở `src/global.css`
  (`@theme inline`), dùng qua class Tailwind (`className="bg-primary text-primary-foreground"`) — chạy
  được cả Native lẫn Web qua NativeWind, không cần file `theme.ts` JS riêng. Spacing/font-size/border-radius
  dùng thang mặc định của Tailwind v4 (đã đủ cho v1 theo ADR-0015 — "không xây design system phức tạp").
