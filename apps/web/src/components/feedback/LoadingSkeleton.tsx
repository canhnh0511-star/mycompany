import { Skeleton, Stack } from '@mui/material';

/**
 * Skeleton cho từng widget (spec §33) — không dùng full-screen spinner khi
 * layout shell đã tải.
 */
export function LoadingSkeleton({ rows = 3, rowHeight = 22 }: { rows?: number; rowHeight?: number }) {
  return (
    <Stack spacing={1.25} sx={{ py: 1 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={rowHeight} />
      ))}
    </Stack>
  );
}
