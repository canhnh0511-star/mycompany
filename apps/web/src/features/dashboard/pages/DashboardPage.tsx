import { Box, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { DashboardKpiGrid } from '../components/DashboardKpiGrid';
import { WorkQueuePanel } from '../components/WorkQueuePanel';
import { TeamStatusPanel } from '../components/TeamStatusPanel';
import { PayrollSummaryPanel } from '../components/PayrollSummaryPanel';
import { RecentDocumentsPanel } from '../components/RecentDocumentsPanel';
import { toIsoDate } from '../../../utils/format';
import { toMonthKey } from '../hooks/useDashboard';

/**
 * Home / Tổng quan — spec §6-§28.
 *
 * Ghi chú: "DashboardHeader" (title + greeting, spec §39) được gộp vào
 * <TopBar /> ở MainLayout thay vì tách component riêng — khớp ảnh reference
 * đã duyệt (docs/design/home-dashboard-reference.png), nơi title/greeting và
 * date-selector/notification/user nằm chung 1 dải header, không phải 2 hàng
 * tách biệt như bản vẽ ASCII sơ bộ ở spec §7.
 */
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const workDate = searchParams.get('date') ?? toIsoDate(new Date());
  const month = toMonthKey(workDate);

  return (
    <Stack spacing={3}>
      <DashboardKpiGrid workDate={workDate} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '9fr 11fr' } }}>
        <WorkQueuePanel workDate={workDate} />
        <TeamStatusPanel workDate={workDate} />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '9fr 11fr' } }}>
        <PayrollSummaryPanel workDate={workDate} month={month} />
        <RecentDocumentsPanel workDate={workDate} />
      </Box>
    </Stack>
  );
}
