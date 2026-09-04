import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function WidgetEmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Stack spacing={0.75} sx={{ alignItems: 'center', py: 4, textAlign: 'center' }}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Stack>
  );
}
