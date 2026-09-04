import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { ComingSoonPage } from '../components/common/ComingSoonPage';
import { RequireAuth } from '../components/common/RequireAuth';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { PayrollPage } from '../features/payroll/pages/PayrollPage';
import { navGroups, reportsNavItem } from '../components/navigation/navConfig';

// Chỉ nav item status:'pending' mới auto-map sang ComingSoonPage (spec §44/§47) — item 'ready' phải
// có route thật khai báo tường minh bên dưới, tránh 2 route cùng path (Bảng lương giờ đã ready).
const pendingItems = [reportsNavItem, ...navGroups.flatMap((group) => group.items)].filter(
  (item) => item.status === 'pending',
);

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
      ...pendingItems.map((item) => ({
        path: item.path,
        element: <ComingSoonPage title={item.label} />,
      })),
    ],
  },
]);
