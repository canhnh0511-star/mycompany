import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { ComingSoonPage } from '../components/common/ComingSoonPage';
import { RequireAuth } from '../components/common/RequireAuth';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { navGroups, reportsNavItem } from '../components/navigation/navConfig';

const pendingItems = [reportsNavItem, ...navGroups.flatMap((group) => group.items)];

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
      ...pendingItems.map((item) => ({
        path: item.path,
        element: <ComingSoonPage title={item.label} />,
      })),
    ],
  },
]);
