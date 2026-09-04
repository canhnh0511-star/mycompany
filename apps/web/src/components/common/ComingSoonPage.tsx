import { Box, Stack, Typography } from '@mui/material';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

/**
 * Placeholder cho mọi route PENDING PREVIEW (spec §44/§47) — không invent
 * UI/business behavior cho các màn chưa được duyệt thiết kế.
 */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 420,
      }}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 360 }}>
        <ConstructionRoundedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
        <Typography variant="h3">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          Màn hình này đang trong quá trình thiết kế và sẽ sớm được triển khai.
        </Typography>
      </Stack>
    </Box>
  );
}
