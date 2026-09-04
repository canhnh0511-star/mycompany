import { Badge, Box, IconButton, Stack, Typography } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import { DateSelector } from './DateSelector';
import { UserMenu } from './UserMenu';
import { neutral } from '../../theme/colors';

interface TopBarProps {
  title: string;
  greeting?: string;
  /** Số thông báo chưa đọc — chỉ hiển thị badge khi > 0 (spec §9), không mock. */
  notificationCount?: number;
}

export function TopBar({ title, greeting, notificationCount = 0 }: TopBarProps) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 4,
        py: 2.5,
        borderBottom: `1px solid ${neutral[200]}`,
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h1" sx={{ lineHeight: 1.25 }}>
          {title}
        </Typography>
        {greeting && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {greeting}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <DateSelector />
        <IconButton size="small" aria-label="Thông báo" sx={{ border: `1px solid ${neutral[200]}` }}>
          <Badge color="error" variant="dot" invisible={notificationCount === 0}>
            <NotificationsRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          </Badge>
        </IconButton>
        <UserMenu />
      </Stack>
    </Stack>
  );
}
