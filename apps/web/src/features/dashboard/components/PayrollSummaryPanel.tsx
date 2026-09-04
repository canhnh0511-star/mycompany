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
        // Đối chiếu pixel với ảnh reference: đây là 1 HÀNG 3 CỘT (text+nút bên
        // trái / donut giữa / legend phải), không phải 2 khối xếp dọc như bản
        // cũ (text ở trên, donut+legend+nút xếp chồng bên dưới).
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, md: 4 }} sx={{ alignItems: 'center' }}>
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: 200 } }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Tổng dự kiến</Typography>
            {/* Module 1 chưa tính lương tự động (Module 3 ngoài phạm vi) — backend luôn trả null,
                hiện "Chưa có dữ liệu" thay vì gọi formatCurrency(undefined) (tránh "NaN ₫"). */}
            <Typography variant="h2" sx={data.totalExpected == null ? { color: 'text.disabled' } : undefined}>
              {data.totalExpected != null ? formatCurrency(data.totalExpected) : 'Chưa có dữ liệu'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {data.employeeCount} nhân viên
              {data.needsReviewCount > 0 ? ` • ${data.needsReviewCount} cần kiểm tra` : ''}
            </Typography>

            <Button
              component={RouterLink}
              to={`/bang-luong/${month}?ref=${workDate}`}
              variant="contained"
              sx={{ mt: 3 }}
            >
              Xem bảng lương
            </Button>
          </Box>

          {data.distribution.filter((s) => s.count > 0).length > 1 ? (
            <>
              <PayrollDonutChart
                centerValue={String(data.distribution.find((s) => s.bucket === 'complete')?.count ?? data.employeeCount)}
                centerLabel="Đã đủ dữ liệu"
                slices={data.distribution.map((s) => ({
                  label: PAYROLL_BUCKET_LABEL[s.bucket],
                  value: s.count,
                  color: BUCKET_COLOR[s.bucket],
                }))}
              />
              <Stack spacing={1.25}>
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
            </>
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
        </Stack>
      )}
    </SectionPanel>
  );
}
