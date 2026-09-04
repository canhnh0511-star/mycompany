import type { ThemeOptions } from '@mui/material/styles';
import { neutral, pageBackground } from './colors';
import { uiTokens } from './tokens';

/**
 * Overrides theo component MUI — spec §6/§30: "Dùng theme tùy chỉnh theo
 * brand, không dùng Material default appearance nguyên bản."
 *
 * Border-radius ở đây dùng số px thật (styleOverrides không đi qua transform
 * nhân với theme.shape.borderRadius như sx — an toàn hơn, xem theme/tokens.ts).
 */
export const components: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: pageBackground,
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
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: uiTokens.radius.card,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: uiTokens.radius.button,
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
        padding: '10px 16px',
      },
      head: {
        fontSize: 12,
        fontWeight: 600,
        color: neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
    },
  },
};
