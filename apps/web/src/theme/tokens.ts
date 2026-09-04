/**
 * Design tokens dùng chung, không thuộc bảng màu (spec §41 "Shared Design
 * Tokens") — mọi nơi cần border-radius/spacing cố định phải đọc từ đây thay
 * vì hard-code rải rác.
 *
 * Lưu ý về border-radius: giá trị ở đây LUÔN là px thật. Khi dùng trong sx,
 * truyền dạng chuỗi `${uiTokens.radius.card}px` — KHÔNG truyền số trần, vì sx
 * nhân số trần với `theme.shape.borderRadius` (xem theme.ts), dễ gây bug bo
 * góc sai (đã từng xảy ra: `borderRadius: 3` bị nhân thành 30px).
 */
export const uiTokens = {
  sidebarWidth: 240,
  radius: {
    /** input, date selector */
    input: 8,
    /** button */
    button: 8,
    /** sidebar active nav item */
    nav: 9,
    /** KPI card, panel */
    card: 12,
    panel: 12,
    /** status badge, chip tròn */
    badge: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
} as const;
