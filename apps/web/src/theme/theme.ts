import { createTheme } from '@mui/material/styles';
import { amber, blue, green, neutral, pageBackground, red, text } from './colors';
import { typography } from './typography';
import { components } from './components';
import { uiTokens } from './tokens';

/** Chiều rộng sidebar — spec §8 (240px, cho phép 224–256px). */
export const SIDEBAR_WIDTH = uiTokens.sidebarWidth;

export const theme = createTheme({
  palette: {
    mode: 'light',
    // primary.main = green[600] — đo màu nút "Xem bảng lương" trên ảnh
    // reference (~#3B7A56) khớp green[600] (#1E7A4D) hơn hẳn green[800] cũ
    // (#0F5C3B, quá trầm) — xem colors.ts.
    primary: {
      main: green[600],
      dark: green[800],
      light: green[100],
      contrastText: '#FFFFFF',
    },
    success: { main: green[600], light: green[50], dark: green[700] },
    warning: { main: amber[600], light: amber[50], dark: amber[700] },
    error: { main: red[600], light: red[50], dark: red[700] },
    info: { main: blue[600], light: blue[50], dark: blue[700] },
    background: { default: pageBackground, paper: neutral[0] },
    // 3 token text chuẩn hóa (typography fix) — primary/secondary/muted;
    // "muted" (vd "Chưa có dữ liệu") đọc qua `text.disabled` — MUI không có
    // field thứ 3 sẵn cho text nên mượn slot này thay vì thêm field lạ.
    text: { primary: text.primary, secondary: text.secondary, disabled: text.muted },
    divider: neutral[200],
  },
  shape: { borderRadius: 10 },
  typography,
  components,
});

export type AppTheme = typeof theme;
