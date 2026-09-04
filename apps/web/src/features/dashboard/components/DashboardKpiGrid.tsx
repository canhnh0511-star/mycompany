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

const iconSx = { fontSize: 20 } as const;

/**
 * Desktop (lg+): flex thay vì grid 5×1fr chia đều — 1fr ép mọi card cùng
 * width bất kể nội dung dài/ngắn, card có nội dung dài nhất (vd breakdown
 * theo Tổ) bị bóp hẹp → chữ xuống dòng → row height bị kéo cao theo, kéo
 * luôn 4 card còn lại cao lên dù nội dung chúng ngắn. flex-basis "auto" để
 * mỗi card rộng theo đúng nội dung của nó trước, rồi mới chia đều phần dư ra
 * (flexGrow) — tránh xuống dòng không cần thiết mà vẫn lấp đầy hàng.
 */
const kpiRowSx = {
  display: { xs: 'grid', lg: 'flex' },
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
  flexWrap: { lg: 'wrap' as const },
  gap: 2,
};

const kpiItemSx = { flex: { lg: '1 1 auto' }, minWidth: { lg: 0 } };

export function DashboardKpiGrid({ workDate }: { workDate: string }) {
  const { data, isLoading, isError, refetch } = useDashboardKpis(workDate);

  if (isLoading) {
    return (
      <Box sx={kpiRowSx}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box key={index} sx={kpiItemSx}>
            <LoadingSkeleton rows={3} rowHeight={20} />
          </Box>
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
    <Box sx={kpiRowSx}>
      <Box sx={kpiItemSx}>
        <KpiCard
          title="Sản lượng hôm nay"
          value={data.productionKg != null ? formatKg(data.productionKg) : 'Chưa có dữ liệu'}
          helperLines={data.productionByTeam?.map((t) => `${t.teamName}: ${formatKg(t.kg)}`)}
          trend={data.trends?.production}
          icon={<WaterDropRoundedIcon sx={iconSx} />}
          tone="green"
        />
      </Box>
      <Box sx={kpiItemSx}>
        <KpiCard
          title="Nhân công hôm nay"
          value={workforceValue}
          helperLines={data.workforceExpected != null ? ['Đi làm / Tổng số'] : undefined}
          trend={data.trends?.workforce}
          icon={<PeopleAltRoundedIcon sx={iconSx} />}
          tone="blue"
        />
      </Box>
      <Box sx={kpiItemSx}>
        <KpiCard
          title="Đã bán hôm nay"
          value={data.soldKg != null ? formatKg(data.soldKg) : 'Chưa có dữ liệu'}
          helperLines={data.soldRevenue != null ? [formatCurrency(data.soldRevenue)] : undefined}
          trend={data.trends?.sold}
          icon={<ShoppingCartRoundedIcon sx={iconSx} />}
          tone="amber"
        />
      </Box>
      <Box sx={kpiItemSx}>
        <KpiCard
          title="Chi phí hôm nay"
          value={data.costAmount != null ? formatCurrency(data.costAmount) : 'Chưa có dữ liệu'}
          helperLines={data.costCount != null ? [`${data.costCount} khoản chi`] : undefined}
          trend={data.trends?.cost}
          icon={<AccountBalanceWalletRoundedIcon sx={iconSx} />}
          tone="purple"
        />
      </Box>
      <Box sx={kpiItemSx}>
        <KpiCard
          title="Lợi nhuận ước tính"
          value={data.estimatedProfit != null ? formatCurrency(data.estimatedProfit) : 'Chưa có dữ liệu'}
          helperLines={['Hôm nay']}
          trend={data.trends?.estimatedProfit}
          icon={<TrendingUpRoundedIcon sx={iconSx} />}
          tone="green"
        />
      </Box>
    </Box>
  );
}
