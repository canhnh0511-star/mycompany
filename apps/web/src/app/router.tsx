import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { ComingSoonPage } from '../components/common/ComingSoonPage';
import { RequireAuth } from '../components/common/RequireAuth';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { PayrollPage } from '../features/payroll/pages/PayrollPage';
import { SalaryComponentsPage } from '../features/salary-components/pages/SalaryComponentsPage';
import { DailyEntryPage } from '../features/daily-entry/pages/DailyEntryPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { SystemConfigPage } from '../features/system-config/pages/SystemConfigPage';
import { ProductionRecordsPage } from '../features/production-records/pages/ProductionRecordsPage';
import { allNavItems } from '../components/navigation/navConfig';

// Chỉ nav item status:'pending' mới auto-map sang ComingSoonPage (spec §44/§47) — item 'ready' phải
// có route thật khai báo tường minh bên dưới, tránh 2 route cùng path (Bảng lương/Thành phần lương/
// Nhập phiếu hàng ngày giờ đã ready). Dùng `allNavItems` (đã gộp sẵn overview/report/Ngày làm việc/
// submenu Sản lượng/group items) thay vì tự ghép lại từng phần — tránh sót mục khi navConfig đổi cấu
// trúc (vd "Sản lượng" giờ là expandable, không còn nằm trong `navGroups`).
const pendingItems = allNavItems.filter((item) => item.status === 'pending');

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/bang-luong', element: <PayrollPage /> },
      { path: '/thanh-phan-luong', element: <SalaryComponentsPage /> },
      { path: '/phieu', element: <DailyEntryPage /> },
      { path: '/ho-so', element: <ProfilePage /> },
      { path: '/cau-hinh-he-thong', element: <SystemConfigPage /> },
      { path: '/san-luong', element: <ProductionRecordsPage /> },
      ...pendingItems.map((item) => ({
        path: item.path,
        element: <ComingSoonPage title={item.label} />,
      })),
    ],
  },
]);
