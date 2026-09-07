import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { ProductionReportPage } from '../../production-report/pages/ProductionReportPage';
import { LatexSaleReportTab } from '../components/LatexSaleReportTab';

/** Báo cáo — dùng CHUNG cho cả 2 route nav (`/bao-cao` và `/san-luong/bao-cao`, xem navConfig) vì
 * ReportController chỉ có đúng 1 bộ endpoint báo cáo cho mỗi loại (Sản lượng/Bán mủ) — xây 2 UI
 * riêng cho 2 route là trùng lặp không cần thiết. Cả 2 route đều mặc định tab "Sản lượng".
 *
 * Tab "Sản lượng" render dashboard đầy đủ ở `features/production-report/` (WEB UI SPEC — BÁO CÁO
 * SẢN LƯỢNG — KPI/trend/donut/team performance/top workers/alerts/completeness/heatmap), thay cho
 * bảng đơn giản `ProductionReportTab` cũ (vẫn còn file, không xóa — export Excel/PDF vẫn dùng đúng
 * DTO/endpoint cũ, chỉ không còn được route tới từ đây nữa). Tab "Bán mủ" giữ nguyên không đổi. */
export function ReportsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }}>
        <Tab label="Sản lượng" />
        <Tab label="Bán mủ" />
      </Tabs>
      {tab === 0 && <ProductionReportPage />}
      {tab === 1 && <LatexSaleReportTab />}
    </Box>
  );
}
