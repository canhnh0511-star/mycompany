import { Box, Stack, Typography, alpha } from '@mui/material';
import { NavLink } from 'react-router-dom';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { green } from '../../theme/colors';
import { SIDEBAR_WIDTH } from '../../theme/theme';
import { overviewNavItem, sidebarSections } from './navConfig';
import type { NavItem } from '../../types/nav';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';

/** Tên thương hiệu tĩnh (logo sidebar) — độc lập với user đang đăng nhập. */
const BRAND_NAME = 'DAVID DŨNG';

function NavRow({ item }: { item: NavItem }) {
  return (
    <Box
      component={NavLink}
      to={item.path}
      end={item.path === '/'}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        textDecoration: 'none',
        color: alpha('#FFFFFF', 0.82),
        fontSize: 14,
        fontWeight: 500,
        transition: 'background-color .15s ease, color .15s ease',
        '&:hover': { backgroundColor: alpha('#FFFFFF', 0.06) },
        '&.active': {
          backgroundColor: green[700],
          color: '#FFFFFF',
          fontWeight: 600,
        },
      }}
    >
      <Box sx={{ display: 'flex', color: 'inherit' }}>{item.icon}</Box>
      <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 'inherit' }}>
        {item.label}
      </Typography>
    </Box>
  );
}

export function Sidebar() {
  const { data: user } = useCurrentUser();

  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        bgcolor: green[900],
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo area */}
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2.5, py: 3 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: alpha('#FFFFFF', 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ParkRoundedIcon fontSize="small" sx={{ color: '#FFFFFF' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.4,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
            }}
          >
            {BRAND_NAME}
          </Typography>
          <Typography sx={{ fontSize: 12, color: alpha('#FFFFFF', 0.62), lineHeight: 1.3 }}>
            Nông trường cao su
          </Typography>
        </Box>
      </Stack>

      {/* Nav */}
      <Stack spacing={2.5} sx={{ px: 1.5, flex: 1, overflowY: 'auto', pb: 2 }}>
        <Stack spacing={0.5}>
          <NavRow item={overviewNavItem} />
        </Stack>

        {sidebarSections.map((section) =>
          section.kind === 'item' ? (
            <Stack spacing={0.5} key={section.item.path}>
              <NavRow item={section.item} />
            </Stack>
          ) : (
            <Stack spacing={0.5} key={section.group.label}>
              <Typography
                sx={{
                  px: 1.5,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: alpha('#FFFFFF', 0.42),
                }}
              >
                {section.group.label}
              </Typography>
              {section.group.items.map((item) => (
                <NavRow item={item} key={item.path} />
              ))}
            </Stack>
          ),
        )}
      </Stack>

      {/* Footer — user */}
      <Box sx={{ borderTop: `1px solid ${alpha('#FFFFFF', 0.12)}`, px: 2, py: 2 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: alpha('#FFFFFF', 0.14),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(user?.fullName ?? 'David Dũng')}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {user?.fullName ?? 'David Dũng'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: alpha('#FFFFFF', 0.6), lineHeight: 1.3 }} noWrap>
              {user?.position || 'Quản lý'}
            </Typography>
          </Box>
          <ExpandMoreRoundedIcon fontSize="small" sx={{ color: alpha('#FFFFFF', 0.6) }} />
        </Stack>
      </Box>
    </Box>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? 'D').toUpperCase();
}
