import { Box, Typography } from '@mui/material';
import { amber, blue, green, neutral, red } from '../../theme/colors';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONE_STYLES: Record<StatusTone, { bg: string; text: string }> = {
  success: { bg: green[50], text: green[700] },
  warning: { bg: amber[50], text: amber[700] },
  error: { bg: red[50], text: red[700] },
  info: { bg: blue[50], text: blue[700] },
  neutral: { bg: neutral[100], text: neutral[700] },
};

/**
 * Badge trạng thái dùng chung — spec §22. Không chỉ dựa vào màu để truyền
 * đạt trạng thái (accessibility §37): luôn kèm text.
 */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const style = TONE_STYLES[tone];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.375,
        borderRadius: 999,
        bgcolor: style.bg,
      }}
    >
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: style.text, lineHeight: 1.4 }}>
        {label}
      </Typography>
    </Box>
  );
}
