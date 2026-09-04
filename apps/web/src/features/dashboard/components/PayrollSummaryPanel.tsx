import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { PayrollDonutChart } from './PayrollDonutChart';
import { usePayrollSummary } from '../hooks/useDashboard';
import { PAYROLL_BUCKET_LABEL, type PayrollBucket } from '../model/dashboard.types';
import { formatCurrency } from '../../../utils/format';
import { amber, blue, green, neutral } from '../../../theme/colors';

const BUCKET_COLOR: Record<PayrollBucket, string> = {
  complete: green[600],
  incomplete: amber[600],
  pending_confirmation: blue[600],
  finalized: neutral[400],
};

export function PayrollSummaryPanel({ workDate, month }: { workDate: string; month: string }) {
  const { data, isLoading, isError, refetch } = usePayrollSummary(month);
  const monthLabel = `${month.slice(5, 7)}/${month.slice(0, 4)}`;

  return (
    <SectionPanel title={`Bảng lương tháng ${monthLabel}`} actionLabel="Xem chi tiết" actionHref={`/bang-luong/${month}`}>
      {isLoading ? (
        <LoadingSkeleton rows={3} rowHeight={32} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không thể tải dữ liệu bảng lương." onRetry={() => refetch()} />
      ) : (
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Tổng dự kiến
            </Typography>
            <Typography variant="h2">{formatCurrency(data.totalExpected)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {data.employeeCount} nhân viên
              {data.needsReviewCount > 0 ? ` • ${data.needsReviewCount} cần kiểm tra` : ''}
            </Typography>
          </Box>

          {data.distribution.filter((s) => s.count > 0).length > 1 ? (
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
              <PayrollDonutChart
                centerValue={String(data.distribution.find((s) => s.bucket === 'complete')?.count ?? data.employeeCount)}
                centerLabel="Đã đủ dữ liệu"
                slices={data.distribution.map((s) => ({
                  label: PAYROLL_BUCKET_LABEL[s.bucket],
                  value: s.count,
                  color: BUCKET_COLOR[s.bucket],
                }))}
              />
              <Stack spacing={1}>
                {data.distribution.map((slice) => (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} key={slice.bucket}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BUCKET_COLOR[slice.bucket] }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 20 }}>
                      {slice.count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {PAYROLL_BUCKET_LABEL[slice.bucket]}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          ) : (
            // spec §24: chỉ 1 trạng thái -> dùng progress summary thay vì chart.
            <Stack spacing={0.5}>
              {data.distribution
                .filter((s) => s.count > 0)
                .map((slice) => (
                  <Typography variant="body2" key={slice.bucket}>
                    {slice.count} {PAYROLL_BUCKET_LABEL[slice.bucket]}
                  </Typography>
                ))}
            </Stack>
          )}

          <Button
            component={RouterLink}
            to={`/bang-luong/${month}?ref=${workDate}`}
            variant="contained"
            sx={{ alignSelf: 'flex-start', bgcolor: green[800], '&:hover': { bgcolor: green[900] } }}
          >
            Xem bảng lương
          </Button>
        </Stack>
      )}
    </SectionPanel>
  );
}
