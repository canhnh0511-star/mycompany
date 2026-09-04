import { Box, Button, Stack, Typography } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { Link as RouterLink } from 'react-router-dom';
import { amber, blue, green, red } from '../../../theme/colors';
import type { WorkQueueItemData } from '../model/dashboard.types';

const SEVERITY_STYLE = {
  warning: { icon: WarningAmberRoundedIcon, color: amber[600], bg: amber[50] },
  error: { icon: ErrorRoundedIcon, color: red[600], bg: red[50] },
  info: { icon: InfoRoundedIcon, color: blue[600], bg: blue[50] },
} as const;

/** spec §18 — mô tả vấn đề bằng ngôn ngữ nghiệp vụ, CTA cụ thể, deep-link. */
export function WorkQueueItem({ item }: { item: WorkQueueItemData }) {
  const { icon: Icon, color, bg } = SEVERITY_STYLE[item.severity];

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', py: 1 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: bg,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.title}
        </Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary">
            {item.description}
          </Typography>
        )}
      </Box>

      <Button
        component={RouterLink}
        to={item.actionHref}
        size="small"
        variant="outlined"
        sx={{
          flexShrink: 0,
          minHeight: 30,
          fontSize: 12.5,
          px: 1.5,
          borderColor: green[700],
          color: green[700],
          '&:hover': { borderColor: green[800], bgcolor: green[50] },
        }}
      >
        {item.actionLabel}
      </Button>
    </Stack>
  );
}
