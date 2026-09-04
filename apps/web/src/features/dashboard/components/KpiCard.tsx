import { Box, Paper, Stack, Typography } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import type { ReactNode } from 'react';
import { green, red, tones, type Tone } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import type { Trend } from '../model/dashboard.types';

export interface KpiCardProps {
  title: string;
  value: string;
  /** Dòng phụ dưới value — vd breakdown theo Tổ, hoặc "Đi làm / Tổng số". */
  helperLines?: string[];
  trend?: Trend;
  icon: ReactNode;
  tone: Tone;
  /** value là placeholder dạng chữ (vd "Chưa có dữ liệu") — hiển thị nhỏ/nhạt hơn số liệu thật. */
  muted?: boolean;
}

/**
 * spec §11 — component không biết nghiệp vụ cụ thể, chỉ nhận props hiển thị.
 *
 * Layout đối chiếu pixel với ảnh reference (không phải đoán): icon nằm CÙNG
 * HÀNG với title (không phải phía trên), value xuống dòng riêng bên dưới;
 * icon là hình vuông bo góc (không phải hình tròn) nền màu ĐẶC + icon trắng;
 * breakdown theo Tổ nằm chung 1 dòng (không xuống dòng từng Tổ); trend value
 * và label nằm 2 dòng riêng (không chung 1 hàng).
 */
export function KpiCard({ title, value, helperLines, trend, icon, tone, muted }: KpiCardProps) {
  const toneStyle = tones[tone];
  const trendColor = trend
    ? trend.semantic === 'positive'
      ? green[700]
      : trend.semantic === 'negative'
        ? red[600]
        : 'text.secondary'
    : undefined;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: `${uiTokens.radius.card}px`,
        p: 2,
        height: '100%',
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: toneStyle.bg,
              color: toneStyle.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.secondary' }} noWrap>
              {title}
            </Typography>
            <Typography
              sx={
                muted
                  ? { fontSize: 17, fontWeight: 600, color: 'text.disabled', mt: 0.25, lineHeight: 1.25 }
                  : {
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      fontVariantNumeric: 'tabular-nums',
                      mt: 0.25,
                      lineHeight: 1.1,
                      color: 'text.primary',
                    }
              }
              noWrap
            >
              {value}
            </Typography>
          </Box>
        </Stack>

        {helperLines && helperLines.length > 0 && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
            {helperLines.join('   ')}
          </Typography>
        )}

        {trend && (
          <Box sx={{ mt: 'auto' }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {trend.direction === 'up' ? (
                <ArrowUpwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
              ) : trend.direction === 'down' ? (
                <ArrowDownwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
              ) : null}
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700 }}>
                {trend.value}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {trend.label}
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
