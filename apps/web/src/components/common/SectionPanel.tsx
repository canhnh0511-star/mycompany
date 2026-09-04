import { Box, Paper, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { green, neutral, red } from '../../theme/colors';
import { uiTokens } from '../../theme/tokens';

interface SectionPanelProps {
  title: string;
  /** Số đếm nổi bật cạnh title (vd "Cần xử lý" — badge đỏ số lượng issue). */
  badgeCount?: number;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
}

/**
 * Khung panel dùng chung cho các section Home (Cần xử lý / Tình hình theo tổ
 * / Bảng lương / Phiếu mới nhất) — spec §17/§20/§23/§26 đều chung 1 header
 * pattern: title (+ badge) trái, action link phải.
 */
export function SectionPanel({ title, badgeCount, actionLabel, actionHref, children }: SectionPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: `${uiTokens.radius.panel}px`,
        // KHÔNG height:'100%' — panel phải cao theo đúng nội dung của nó,
        // không bị kéo giãn bằng panel bên cạnh trong cùng hàng (vd panel
        // "Tình hình theo tổ" chỉ có 2 Tổ thực tế sẽ thấp hơn hẳn "Cần xử
        // lý" có 5 việc, không nên có khoảng trắng thừa trong card). Xem
        // alignItems:'start' ở DashboardPage.tsx — phần bù cần thiết còn lại.
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${neutral[200]}`,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h3">{title}</Typography>
          {!!badgeCount && (
            <Box
              sx={{
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 999,
                bgcolor: red[600],
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {badgeCount}
            </Box>
          )}
        </Stack>
        {actionLabel && actionHref && (
          <Stack
            component={RouterLink}
            to={actionHref}
            direction="row"
            sx={{ alignItems: 'center', color: green[700], textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}
          >
            {actionLabel}
            <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
          </Stack>
        )}
      </Stack>
      <Box sx={{ px: 2.5, py: 1.75 }}>{children}</Box>
    </Paper>
  );
}
