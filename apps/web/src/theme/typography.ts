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
  /** Page title (vd "Tổng quan") — spec §11: 24–26px/700/line-height 1.2. */
  h1: { fontSize: 26, fontWeight: 700, lineHeight: 1.2 },
  /** KPI value — spec §13: 22–26px/700. */
  h2: { fontSize: 24, fontWeight: 700, lineHeight: 1.25 },
  /** Section title (vd "Cần xử lý") — spec §11: 16px/600–700. */
  h3: { fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  h4: { fontSize: 16, fontWeight: 600 },
  body1: { fontSize: 15, fontWeight: 400 },
  body2: { fontSize: 14, fontWeight: 400 },
  caption: { fontSize: 12.5, fontWeight: 400 },
  button: { fontWeight: 600, textTransform: 'none' },
};
