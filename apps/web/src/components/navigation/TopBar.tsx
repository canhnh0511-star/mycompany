import { Badge, Box, IconButton, Stack, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { DateSelector } from './DateSelector';
import { UserMenu } from './UserMenu';
import { neutral } from '../../theme/colors';
import { uiTokens } from '../../theme/tokens';

interface TopBarProps {
  title: string;
  greeting?: string;
  /** Số thông báo chưa đọc — chỉ hiển thị badge khi > 0 (spec §9), không mock. */
  notificationCount?: number;
  /** Mở Drawer sidebar — chỉ truyền ở mobile/tablet nhỏ, nút hamburger chỉ hiện khi có prop này. */
  onMenuClick?: () => void;
}

export function TopBar({ title, greeting, notificationCount = 0, onMenuClick }: TopBarProps) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, md: 3.5 },
        py: 1.75,
        borderBottom: `1px solid ${neutral[200]}`,
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
        gap: { xs: 1, md: 2 },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {onMenuClick && (
          <IconButton
            size="small"
            aria-label="Mở menu điều hướng"
            onClick={onMenuClick}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, flexShrink: 0 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" noWrap>
            {title}
          </Typography>
          {greeting && (
            <Typography
              sx={{ fontSize: 14.5, fontWeight: 500, color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}
              noWrap
            >
              {greeting}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DateSelector />
        <IconButton
          size="small"
          aria-label="Thông báo"
          sx={{
            border: `1px solid ${neutral[200]}`,
            borderRadius: `${uiTokens.radius.input}px`,
            width: 38,
            height: 38,
          }}
        >
          <Badge color="error" badgeContent={notificationCount} max={9} invisible={notificationCount === 0}>
            <NotificationsOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          </Badge>
        </IconButton>
        <UserMenu />
      </Stack>
    </Stack>
  );
}
