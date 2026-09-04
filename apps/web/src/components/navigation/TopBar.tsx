import { Badge, Box, IconButton, Stack, Typography } from '@mui/material';
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
}

export function TopBar({ title, greeting, notificationCount = 0 }: TopBarProps) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3.5,
        py: 1.75,
        borderBottom: `1px solid ${neutral[200]}`,
        bgcolor: 'background.paper',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h1">{title}</Typography>
        {greeting && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>{greeting}</Typography>
        )}
      </Box>

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
