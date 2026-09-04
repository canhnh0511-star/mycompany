import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import type { ReactNode } from 'react';
import { tones, type Tone } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import { formatCurrency } from '../../../utils/format';
import type { PayrollSummary } from '../model/payroll.types';

const iconSx = { fontSize: 20 } as const;

/**
 * 4 KPI card đầu trang Bảng lương — đối chiếu ảnh mockup (docs/design/payroll mục 2 màn hình):
 * card 1 nhãn nhỏ NẰM TRÊN giá trị lớn ("Tổng thực lãnh" -> số tiền); 3 card còn lại NGƯỢC LẠI,
 * giá trị lớn nằm trên, nhãn phụ nhỏ nằm dưới ("17 công nhân" -> "Đang làm việc") — khác thứ tự
 * với KpiCard dùng ở Home nên viết riêng thay vì tái dùng.
 */
function Kpi({ tone, icon, primary, secondary }: { tone: Tone; icon: ReactNode; primary: ReactNode; secondary: ReactNode }) {
  const toneStyle = tones[tone];
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: `${uiTokens.radius.card}px`,
        p: 2,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
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
        <Box sx={{ minWidth: 0 }}>
          {primary}
          {secondary}
        </Box>
      </Stack>
    </Paper>
  );
}

const primarySx = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
  fontVariantNumeric: 'tabular-nums',
  color: 'text.primary',
} as const;
const secondarySx = { fontSize: 12.5, fontWeight: 500, color: 'text.secondary' } as const;

export function PayrollKpiRow({ summary, isLoading }: { summary: PayrollSummary | undefined; isLoading: boolean }) {
  if (isLoading || !summary) {
    return (
      <Stack direction="row" spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{ borderRadius: `${uiTokens.radius.card}px`, p: 2, flex: '1 1 0', minWidth: 0 }}
          >
            <Skeleton variant="rounded" height={40} />
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Kpi
        tone="green"
        icon={<AccountBalanceWalletRoundedIcon sx={iconSx} />}
        primary={<Typography sx={secondarySx}>Tổng thực lãnh</Typography>}
        secondary={
          <Typography sx={{ ...primarySx, color: 'success.dark' }} noWrap>
            {formatCurrency(summary.totalNetPay)}
          </Typography>
        }
      />
      <Kpi
        tone="blue"
        icon={<PeopleAltRoundedIcon sx={iconSx} />}
        primary={<Typography sx={primarySx}>{summary.totalEmployees} công nhân</Typography>}
        secondary={<Typography sx={secondarySx}>Đang làm việc</Typography>}
      />
      <Kpi
        tone="amber"
        icon={<WarningAmberRoundedIcon sx={iconSx} />}
        primary={
          <Typography sx={primarySx}>
            {summary.needsReviewCount + summary.missingDataCount} cần kiểm tra
          </Typography>
        }
        secondary={<Typography sx={secondarySx}>Thiếu dữ liệu</Typography>}
      />
      <Kpi
        tone="purple"
        icon={<LockRoundedIcon sx={iconSx} />}
        primary={<Typography sx={primarySx}>{summary.locked ? 'Đã chốt' : 'Chưa chốt'}</Typography>}
        secondary={
          <Typography sx={secondarySx}>{summary.locked ? 'Đã chốt lương' : 'Chưa chốt lương'}</Typography>
        }
      />
    </Stack>
  );
}
