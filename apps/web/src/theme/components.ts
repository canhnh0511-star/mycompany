import type { ThemeOptions } from '@mui/material/styles';
import { neutral, pageBackground, text } from './colors';
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
        fontVariantNumeric: 'tabular-nums',
      },
      // Bỏ uppercase+letter-spacing (typography fix) — phân cấp header bảng
      // bằng weight/màu thay vì viết hoa, đối chiếu mockup .note.
      head: {
        fontSize: 12.5,
        fontWeight: 600,
        color: text.secondary,
        textTransform: 'none',
        letterSpacing: 0,
      },
    },
  },
};
