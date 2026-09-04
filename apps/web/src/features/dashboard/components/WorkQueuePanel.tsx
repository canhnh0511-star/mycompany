import { Divider, Stack } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WorkQueueItem } from './WorkQueueItem';
import { useWorkQueue } from '../hooks/useDashboard';
import { green } from '../../../theme/colors';

export function WorkQueuePanel({ workDate }: { workDate: string }) {
  const { data, isLoading, isError, refetch } = useWorkQueue(workDate);

  return (
    <SectionPanel title="Cần xử lý" badgeCount={data?.length} actionLabel="Xem tất cả" actionHref={`/phieu?date=${workDate}`}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={40} />
      ) : isError ? (
        <WidgetErrorState message="Không thể tải danh sách việc cần xử lý." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <WidgetEmptyState
          icon={<CheckCircleRoundedIcon sx={{ color: green[600], fontSize: 28 }} />}
          title="Không có việc cần xử lý"
          description="Dữ liệu hôm nay đã đầy đủ."
        />
      ) : (
        <Stack divider={<Divider />} spacing={2}>
          {data.map((item) => (
            <WorkQueueItem key={item.id} item={item} />
          ))}
        </Stack>
      )}
    </SectionPanel>
  );
}
