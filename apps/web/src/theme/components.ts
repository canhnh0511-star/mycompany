import type { ThemeOptions } from '@mui/material/styles';
import { neutral } from './colors';

/**
 * Overrides theo component MUI — spec §6/§30: "Dùng theme tùy chỉnh theo
 * brand, không dùng Material default appearance nguyên bản."
 */
export const components: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: neutral[50],
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      outlined: {
        borderColor: neutral[200],
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        paddingLeft: 16,
        paddingRight: 16,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 600,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${neutral[200]}`,
        padding: '12px 16px',
      },
      head: {
        fontSize: 12.5,
        fontWeight: 600,
        color: neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      },
    },
  },
};
