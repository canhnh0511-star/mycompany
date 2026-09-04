import { Button, CircularProgress, type ButtonProps } from '@mui/material';

/**
 * `@mui/material` (bản đang dùng) chưa có prop `loading` sẵn trên `Button` — wrapper nhỏ dùng chung
 * cho mọi action ghi (chốt/mở lương, lưu form...) thay vì tự vẽ spinner rải rác từng nơi gọi.
 */
export function LoadingButton({ loading = false, disabled, startIcon, children, ...props }: ButtonProps & { loading?: boolean }) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {children}
    </Button>
  );
}
