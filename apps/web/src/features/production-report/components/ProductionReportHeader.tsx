import { Stack, Typography } from '@mui/material';
import { ProductionReportFilters } from './ProductionReportFilters';
import type { TeamOption } from '../../../api/lookups.api';
import type { QuickRange } from '../hooks/useProductionReportFilters';

/** Header + bộ lọc (spec §4) — title/subtitle bên trái, filter bar bên dưới (embedded trong tab
 * "Sản lượng" của ReportsPage, không có breadcrumb riêng vì đã đứng trong context Tabs của trang). */
export function ProductionReportHeader(props: {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onQuickRange: (quick: QuickRange) => void;
  teamId: string;
  onTeamIdChange: (value: string) => void;
  teams: TeamOption[];
  onExport: (kind: 'xlsx' | 'pdf' | 'csv') => void;
  exporting: boolean;
}) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.25}>
        <Typography variant="h2" sx={{ fontSize: 22, fontWeight: 700 }}>
          Báo cáo sản lượng
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Theo dõi xu hướng sản lượng, hiệu suất theo tổ và các bất thường
        </Typography>
      </Stack>
      <ProductionReportFilters {...props} />
    </Stack>
  );
}
