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
 *
 * Layout 2 cột kiểu "masonry" (mỗi cột 1 Stack riêng) thay vì 2 hàng grid
 * độc lập: nếu tách 2 hàng grid, panel ngắn ở hàng 1 (vd "Tình hình theo
 * tổ" chỉ 2-3 Tổ) đã không còn bị kéo giãn theo panel dài cùng hàng (fix
 * trước), nhưng panel ở hàng 2 CÙNG CỘT với nó ("Phiếu mới nhất") vẫn bị đẩy
 * xuống theo chiều cao hàng 1 (tính theo panel dài nhất — "Cần xử lý"), tạo
 * khoảng trắng bất thường giữa 2 panel cùng cột. Gộp thành 1 Stack mỗi cột
 * để panel dưới luôn cách panel trên đúng 1 gap cố định, không phụ thuộc
 * chiều cao cột bên cạnh.
 */
export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const workDate = searchParams.get('date') ?? toIsoDate(new Date());
  const month = toMonthKey(workDate);

  return (
    <Stack spacing={2.5}>
      <DashboardKpiGrid workDate={workDate} />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '9fr 11fr' }, alignItems: 'start' }}>
        <Stack spacing={2.5}>
          <WorkQueuePanel workDate={workDate} />
          <PayrollSummaryPanel workDate={workDate} month={month} />
        </Stack>
        <Stack spacing={2.5}>
          <TeamStatusPanel workDate={workDate} />
          <RecentDocumentsPanel workDate={workDate} />
        </Stack>
      </Box>
    </Stack>
  );
}
