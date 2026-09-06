import { Box, Stack, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingRoundedIcon from '@mui/icons-material/PendingRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { amber, green, neutral } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

export function DataCompletenessCard({ filters }: { filters: ProductionDashboardFilters }) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);

  return (
    <SectionPanel title="Mức độ hoàn chỉnh dữ liệu" sx={{ height: '100%' }}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={26} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được dữ liệu hoàn chỉnh." onRetry={() => refetch()} />
      ) : (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Đã chốt', value: data.completeness.confirmedDays },
                    { name: 'Còn lại', value: data.completeness.totalDaysInRange - data.completeness.confirmedDays },
                  ]}
                  dataKey="value"
                  innerRadius={38}
                  outerRadius={52}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  <Cell fill={green[600]} />
                  <Cell fill={neutral[100]} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{data.completeness.completionPercent}%</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Dữ liệu đầy đủ</Typography>
            </Box>
          </Box>

          <Stack spacing={1} sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 18, color: green[700] }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{data.completeness.confirmedDays}/{data.completeness.totalDaysInRange} ngày</Typography>
                <Typography variant="caption" color="text.secondary">Đã chốt</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PendingRoundedIcon sx={{ fontSize: 18, color: amber[600] }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{data.completeness.pendingDays} ngày</Typography>
                <Typography variant="caption" color="text.secondary">Chờ xác nhận</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <WarningAmberRoundedIcon sx={{ fontSize: 18, color: 'error.main' }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{data.completeness.documentsNeedingReview} phiếu</Typography>
                <Typography variant="caption" color="text.secondary">Cần kiểm tra</Typography>
              </Box>
            </Stack>
          </Stack>
        </Stack>
      )}
    </SectionPanel>
  );
}
