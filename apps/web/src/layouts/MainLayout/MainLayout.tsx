import { Box, Stack, Typography } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/navigation/Sidebar';
import { TopBar } from '../../components/navigation/TopBar';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { useNotificationCount } from '../../features/notifications/useNotificationCount';
import { getPageTitle } from './routeMeta';
import { neutral } from '../../theme/colors';

export function MainLayout() {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { data: notificationCount } = useNotificationCount();
  const isHome = location.pathname === '/';
  const firstName = user?.fullName?.split(' ').slice(-1)[0] ?? 'David Dũng';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar
          title={getPageTitle(location.pathname)}
          greeting={
            isHome
              ? `Xin chào, ${user?.fullName ?? firstName}! Chúc bạn một ngày làm việc hiệu quả.`
              : undefined
          }
          notificationCount={notificationCount ?? 0}
        />

        <Box component="main" sx={{ flex: 1, px: 3.5, py: 2.5 }}>
          <Outlet />
        </Box>

        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', px: 3.5, py: 1.75, borderTop: `1px solid ${neutral[200]}` }}
        >
          <Typography sx={{ fontSize: 11.5 }} color="text.secondary">
            © {new Date().getFullYear()} David Dũng. All rights reserved.
          </Typography>
          <Typography sx={{ fontSize: 11.5 }} color="text.secondary">
            Phiên bản 1.0.0
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
