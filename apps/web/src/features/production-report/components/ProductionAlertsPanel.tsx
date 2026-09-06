import { Stack, Typography } from '@mui/material';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { amber, blue, neutral, red } from '../../../theme/colors';
import { useProductionDashboard } from '../hooks/useProductionReport';
import type { ProductionAlert, ProductionDashboardFilters } from '../types/productionReport.types';

const SEVERITY_STYLE = {
  RED: { color: red[600], icon: ErrorRoundedIcon },
  AMBER: { color: amber[700], icon: WarningAmberRoundedIcon },
  BLUE: { color: blue[700], icon: InfoRoundedIcon },
} as const;

export function ProductionAlertsPanel({
  filters,
  onAlertClick,
}: {
  filters: ProductionDashboardFilters;
  onAlertClick: (alert: ProductionAlert) => void;
}) {
  const { data, isLoading, isError, refetch } = useProductionDashboard(filters);

  return (
    <SectionPanel title="Cảnh báo / Điểm cần chú ý" badgeCount={data?.alerts.length || undefined} sx={{ height: '100%' }}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={40} />
      ) : isError || !data ? (
        <WidgetErrorState message="Không tải được cảnh báo." onRetry={() => refetch()} />
      ) : data.alerts.length === 0 ? (
        <WidgetEmptyState title="Không có cảnh báo" description="Mọi thứ đang ổn trong khoảng ngày này." />
      ) : (
        <Stack spacing={1.5}>
          {data.alerts.map((alert) => {
            const style = SEVERITY_STYLE[alert.severity];
            const Icon = style.icon;
            const clickable = alert.linkType != null;
            return (
              <Stack
                key={alert.id}
                direction="row"
                spacing={1.25}
                sx={{
                  alignItems: 'flex-start',
                  cursor: clickable ? 'pointer' : 'default',
                  borderRadius: 1,
                  p: 0.75,
                  '&:hover': clickable ? { bgcolor: neutral[50] } : undefined,
                }}
                onClick={() => clickable && onAlertClick(alert)}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? 'button' : undefined}
                onKeyDown={(e) => {
                  if (clickable && (e.key === 'Enter' || e.key === ' ')) onAlertClick(alert);
                }}
              >
                <Icon sx={{ fontSize: 20, color: style.color, mt: 0.25, flexShrink: 0 }} />
                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{alert.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{alert.description}</Typography>
                  {clickable && (
                    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: style.color }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Xem chi tiết</Typography>
                      <ChevronRightRoundedIcon sx={{ fontSize: 15 }} />
                    </Stack>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </SectionPanel>
  );
}
