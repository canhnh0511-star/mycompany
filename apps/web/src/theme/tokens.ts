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
  /**
   * box-shadow dùng chung (UI audit vòng 1, mục 2) — trước đây chuỗi
   * `'0 1px 2px rgba(16, 24, 40, 0.04)'` bị copy-paste y hệt ở 5 nơi
   * (KpiCard, PayrollKpiRow, SectionPanel, ConfigPanel, PayrollDetailPanel).
   * Mọi Paper/Card dạng panel phẳng phải đọc `shadow.panel` thay vì viết lại.
   */
  shadow: {
    /** shadow rất nhẹ cho panel/card phẳng (KPI card, SectionPanel, ConfigPanel, detail panel) */
    panel: '0 1px 2px rgba(16, 24, 40, 0.04)',
    /** shadow đậm hơn riêng cho card đăng nhập (nổi hẳn trên nền trang) */
    loginCard: '0 8px 28px rgba(16, 24, 40, 0.08)',
  },
} as const;
