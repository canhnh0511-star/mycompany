import { Button, Stack, Typography } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

/**
 * Một widget lỗi không được làm cả dashboard fail (spec §33). Dùng ở mức
 * panel, kèm nút thử lại (invalidate/refetch của TanStack Query).
 */
export function WidgetErrorState({
  message = 'Không thể tải dữ liệu.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Stack spacing={1.25} sx={{ alignItems: 'center', py: 4, textAlign: 'center' }}>
      <ErrorOutlineRoundedIcon sx={{ color: 'error.main', fontSize: 28 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {onRetry && (
        <Button size="small" variant="outlined" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </Stack>
  );
}
