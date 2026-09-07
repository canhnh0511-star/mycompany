import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ReactNode } from 'react';
import { green, neutral, red } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import type { TrendSemantic } from '../utils/productionReportCalculations';

export interface ProductionKpiCardProps {
  title: string;
  icon: ReactNode;
  /** Giá trị chính — đã format sẵn (spec §5). */
  value: string;
  /** Dòng phụ dưới value (vd "Trung bình 30 ngày", "Trên 211 công nhân"). */
  secondary?: string;
  trendValue?: string;
  trendSemantic?: TrendSemantic;
  /** Tooltip giải thích cách tính (spec §5.4 "UI phải có tooltip giải thích"). */
  helpText?: string;
}

/** KPI card dùng chung cho 5 thẻ đầu Dashboard "Báo cáo sản lượng" (spec §5.1). */
export function ProductionKpiCard({ title, icon, value, secondary, trendValue, trendSemantic: semantic, helpText }: ProductionKpiCardProps) {
  const trendColor = semantic === 'positive' ? green[700] : semantic === 'negative' ? red[600] : 'text.secondary';

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: `${uiTokens.radius.card}px`, p: 2, height: '100%', boxShadow: uiTokens.shadow.panel }}
    >
      <Stack spacing={1} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <Box sx={{ display: 'flex', color: green[600] }}>{icon}</Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} noWrap>
            {title}
          </Typography>
          {helpText && (
            <Tooltip title={helpText} arrow>
              <InfoOutlinedIcon sx={{ fontSize: 14, color: neutral[400], cursor: 'help' }} aria-label={`Giải thích: ${title}`} />
            </Tooltip>
          )}
        </Stack>

        <Typography
          sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}
          noWrap
        >
          {value}
        </Typography>

        <Box sx={{ mt: 'auto' }}>
          {trendValue ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {semantic === 'positive' ? (
                <ArrowUpwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
              ) : semantic === 'negative' ? (
                <ArrowDownwardRoundedIcon sx={{ fontSize: 15, color: trendColor }} />
              ) : null}
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700 }}>
                {trendValue}
              </Typography>
            </Stack>
          ) : null}
          {secondary && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {secondary}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
