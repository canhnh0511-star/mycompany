import { Box } from '@mui/material';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { KpiCard } from './KpiCard';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { useDashboardKpis } from '../hooks/useDashboard';
import { formatCurrency, formatKg } from '../../../utils/format';

const iconSx = { fontSize: 18 } as const;

export function DashboardKpiGrid({ workDate }: { workDate: string }) {
  const { data, isLoading, isError, refetch } = useDashboardKpis(workDate);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingSkeleton key={index} rows={3} rowHeight={20} />
        ))}
      </Box>
    );
  }

  if (isError || !data) {
    return <WidgetErrorState message="Không thể tải dữ liệu tổng quan hôm nay." onRetry={() => refetch()} />;
  }

  const workforceValue =
    data.workforceExpected != null
      ? `${data.workforcePresent ?? 0} / ${data.workforceExpected}`
      : data.workforcePresent != null
        ? `${data.workforcePresent} người có mặt`
        : '—';

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
      }}
    >
      <KpiCard
        title="Sản lượng hôm nay"
        value={data.productionKg != null ? formatKg(data.productionKg) : 'Chưa có dữ liệu'}
        helperLines={data.productionByTeam?.map((t) => `${t.teamName}: ${formatKg(t.kg)}`)}
        trend={data.trends?.production}
        icon={<WaterDropRoundedIcon sx={iconSx} />}
        tone="green"
      />
      <KpiCard
        title="Nhân công hôm nay"
        value={workforceValue}
        helperLines={data.workforceExpected != null ? ['Đi làm / Tổng số'] : undefined}
        trend={data.trends?.workforce}
        icon={<PeopleAltRoundedIcon sx={iconSx} />}
        tone="blue"
      />
      <KpiCard
        title="Đã bán hôm nay"
        value={data.soldKg != null ? formatKg(data.soldKg) : 'Chưa có dữ liệu'}
        helperLines={data.soldRevenue != null ? [formatCurrency(data.soldRevenue)] : undefined}
        trend={data.trends?.sold}
        icon={<ShoppingCartRoundedIcon sx={iconSx} />}
        tone="amber"
      />
      <KpiCard
        title="Chi phí hôm nay"
        value={data.costAmount != null ? formatCurrency(data.costAmount) : 'Chưa có dữ liệu'}
        helperLines={data.costCount != null ? [`${data.costCount} khoản chi`] : undefined}
        trend={data.trends?.cost}
        icon={<AccountBalanceWalletRoundedIcon sx={iconSx} />}
        tone="purple"
      />
      <KpiCard
        title="Lợi nhuận ước tính"
        value={data.estimatedProfit != null ? formatCurrency(data.estimatedProfit) : 'Chưa có dữ liệu'}
        helperLines={['Hôm nay']}
        trend={data.trends?.estimatedProfit}
        icon={<TrendingUpRoundedIcon sx={iconSx} />}
        tone="green"
      />
    </Box>
  );
}
