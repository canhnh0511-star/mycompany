import { createTheme } from '@mui/material/styles';
import { amber, blue, green, neutral, red } from './colors';
import { typography } from './typography';
import { components } from './components';

/** Chiều rộng sidebar — spec §8 (240px, cho phép 224–256px). */
export const SIDEBAR_WIDTH = 240;

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: green[800],
      dark: green[900],
      light: green[100],
      contrastText: '#FFFFFF',
    },
    success: { main: green[600], light: green[50], dark: green[700] },
    warning: { main: amber[600], light: amber[50], dark: amber[700] },
    error: { main: red[600], light: red[50], dark: red[700] },
    info: { main: blue[600], light: blue[50], dark: blue[700] },
    background: { default: neutral[50], paper: neutral[0] },
    text: { primary: neutral[900], secondary: neutral[500] },
    divider: neutral[200],
  },
  shape: { borderRadius: 10 },
  typography,
  components,
});

export type AppTheme = typeof theme;
