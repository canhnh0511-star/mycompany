import type { ThemeOptions } from '@mui/material/styles';

/**
 * Typography — spec §31.
 * Font ưu tiên Inter, fallback system-ui. Nạp qua Google Fonts trong index.html.
 */
export const fontFamily = [
  'Inter',
  'system-ui',
  '-apple-system',
  'Arial',
  'sans-serif',
].join(',');

export const typography: ThemeOptions['typography'] = {
  fontFamily,
  /**
   * Page title (vd "Tổng quan") — đối chiếu `typography-fix-mockup.html`:
   * 26px/800/-0.02em, hierarchy với subtitle mượn ở weight subtitle tăng lên
   * thay vì giảm size H1 (H1 mockup vẫn giữ nguyên 26px).
   */
  h1: { fontSize: 26, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' },
  /** KPI value lớn (vd "Tổng dự kiến") — mockup .payroll-value: 22–24px/700. */
  h2: { fontSize: 24, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
  /** Section/panel title (vd "Cần xử lý") — mockup .panel-title: 15px/600. */
  h3: { fontSize: 15, fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: 16, fontWeight: 600 },
  body1: { fontSize: 15, fontWeight: 400 },
  body2: { fontSize: 14, fontWeight: 400 },
  caption: { fontSize: 12.5, fontWeight: 400, lineHeight: 1.5 },
  button: { fontWeight: 600, textTransform: 'none' },
};

/**
 * "Eyebrow" label dùng chung (UI audit vòng 1, mục 4) — nhãn nhỏ viết hoa phía
 * trên 1 khối nội dung (vd nhóm nav trong Sidebar, tiêu đề nhóm trong
 * PayrollDetailPanel: "Thu nhập theo sản lượng"...). Text truyền vào PHẢI viết
 * chữ thường bình thường (có dấu tiếng Việt) — `textTransform: 'uppercase'` ở
 * đây tự lo việc viết hoa, không gõ cứng uppercase trong JSX (mất khả năng
 * đọc trong code + không đồng bộ letterSpacing giữa các nơi dùng).
 */
export const eyebrowSx = {
  fontSize: 12.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: 'text.secondary',
} as const;
