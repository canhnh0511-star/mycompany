import { Box } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { TeamStatusTable } from './TeamStatusTable';
import { useTeamStatus } from '../hooks/useDashboard';

export function TeamStatusPanel({ workDate }: { workDate: string }) {
  const { data, isLoading, isError, refetch } = useTeamStatus(workDate);

  return (
    <SectionPanel title="Tình hình theo tổ (hôm nay)" actionLabel="Xem chi tiết" actionHref={`/san-luong?date=${workDate}`}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={36} />
      ) : isError ? (
        <WidgetErrorState message="Không thể tải tình hình theo tổ." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <WidgetEmptyState title="Chưa có dữ liệu tổ nào hôm nay" />
      ) : (
        <Box sx={{ overflowX: 'auto', mx: -3 }}>
          <Box sx={{ minWidth: 480, px: 3 }}>
            <TeamStatusTable rows={data} />
          </Box>
        </Box>
      )}
    </SectionPanel>
  );
}
