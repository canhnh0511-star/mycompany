import { Box, Paper, Stack, Typography } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import type { ReactNode } from 'react';
import { green, red, tones, type Tone } from '../../../theme/colors';
import type { Trend } from '../model/dashboard.types';

export interface KpiCardProps {
  title: string;
  value: string;
  /** Dòng phụ dưới value — vd breakdown theo Tổ, hoặc "Đi làm / Tổng số". */
  helperLines?: string[];
  trend?: Trend;
  icon: ReactNode;
  tone: Tone;
}

/**
 * spec §11 — component không biết nghiệp vụ cụ thể, chỉ nhận props hiển thị.
 */
export function KpiCard({ title, value, helperLines, trend, icon, tone }: KpiCardProps) {
  const toneStyle = tones[tone];
  const trendColor = trend
    ? trend.semantic === 'positive'
      ? green[700]
      : trend.semantic === 'negative'
        ? red[600]
        : 'text.secondary'
    : undefined;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, height: '100%' }}>
      <Stack spacing={0.75} sx={{ height: '100%' }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            bgcolor: toneStyle.bg,
            color: toneStyle.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h2" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
            {value}
          </Typography>
        </Box>

        {helperLines && helperLines.length > 0 && (
          <Stack spacing={0.125} sx={{ flex: 1 }}>
            {helperLines.map((line) => (
              <Typography key={line} variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {line}
              </Typography>
            ))}
          </Stack>
        )}

        {trend && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 'auto' }}>
            {trend.direction === 'up' ? (
              <ArrowUpwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
            ) : trend.direction === 'down' ? (
              <ArrowDownwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
            ) : null}
            <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700 }}>
              {trend.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trend.label}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
