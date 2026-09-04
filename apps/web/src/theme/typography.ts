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
  h1: { fontSize: 28, fontWeight: 700 },
  h2: { fontSize: 24, fontWeight: 700 },
  h3: { fontSize: 18, fontWeight: 700 },
  h4: { fontSize: 16, fontWeight: 600 },
  body1: { fontSize: 15, fontWeight: 400 },
  body2: { fontSize: 14, fontWeight: 400 },
  caption: { fontSize: 12.5, fontWeight: 400 },
  button: { fontWeight: 600, textTransform: 'none' },
};
