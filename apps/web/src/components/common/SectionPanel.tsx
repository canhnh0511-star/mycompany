import { Box, Button, Paper, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { green, neutral, red } from '../../theme/colors';
import { uiTokens } from '../../theme/tokens';

/**
 * `href` -> action điều hướng (link "Xem tất cả" kiểu Home, chevron cuối dòng).
 * `onClick` -> action tại chỗ (nút "Thêm dòng mới" kiểu ConfigPanel cũ, icon Add + nền đặc).
 * 2 kiểu render KHÁC NHAU nhưng gộp qua 1 field `action` vì cùng vị trí/vai trò trong header.
 */
type SectionPanelAction = { label: string } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

interface SectionPanelProps {
  title: string;
  /** Icon badge tròn bên trái title (vd phân biệt nhanh nhiều panel xếp dọc trên 1 trang — Hồ sơ).
   * Optional — đa số panel hiện có (Home, 4 tab Thành phần lương...) không cần, chỉ title là đủ. */
  icon?: ReactNode;
  /** Dòng mô tả nhỏ dưới title (vd mô tả phạm vi áp dụng 1 cấu hình — trước đây là `ConfigPanel.description`). */
  description?: string;
  /** Số đếm nổi bật cạnh title (vd "Cần xử lý" — badge đỏ số lượng issue). */
  badgeCount?: number;
  action?: SectionPanelAction;
  /**
   * Bỏ padding mặc định của phần content — dùng khi children là 1 bảng full-bleed cần tự quản lý
   * overflow-x (vd ConfigTable, trước đây là hành vi riêng của `ConfigPanel`). Mặc định `false` giữ
   * đúng padding cũ của SectionPanel (nội dung dạng list/stack thông thường).
   */
  noContentPadding?: boolean;
  /** Cho phép ghi đè layout của panel khi đứng trong 1 stack cần co giãn (vd `flex: 1` để lấp đầy
   * chiều cao còn lại — bảng "Danh sách công nhân" ở Nhập phiếu hàng ngày, theo mockup đã duyệt). */
  sx?: SxProps<Theme>;
  children: ReactNode;
}

/**
 * Khung panel dùng chung — gộp `SectionPanel` (Home: spec §17/§20/§23/§26, title+badge trái/action
 * link phải) và `ConfigPanel` cũ (4 tab Thành phần lương: title+description trái/nút "Thêm" phải)
 * vì cùng 1 cấu trúc Panel > Header(Title, Action) > Content — 2 component riêng trước đây chỉ khác
 * mỗi kiểu action (link điều hướng vs nút onClick), không đáng để duy trì 2 nơi (UI audit vòng 3).
 */
export function SectionPanel({ title, icon, description, badgeCount, action, noContentPadding, sx, children }: SectionPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: `${uiTokens.radius.panel}px`,
        // KHÔNG height:'100%' mặc định — panel phải cao theo đúng nội dung của nó, không bị kéo
        // giãn bằng panel bên cạnh trong cùng hàng (vd panel "Tình hình theo tổ" chỉ có 2 Tổ thực tế
        // sẽ thấp hơn hẳn "Cần xử lý" có 5 việc, không nên có khoảng trắng thừa trong card). Xem
        // alignItems:'start' ở DashboardPage.tsx — phần bù cần thiết còn lại. Nơi nào CẦN co giãn lấp
        // đầy (vd cột trái Nhập phiếu hàng ngày) thì truyền `sx={{ flex: 1 }}` qua prop `sx` ở trên.
        boxShadow: uiTokens.shadow.panel,
        display: 'flex',
        flexDirection: 'column',
        ...sx,
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
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: green[50],
                color: green[600],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
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
            {description && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{description}</Typography>
            )}
          </Box>
        </Stack>

        {action &&
          ('href' in action && action.href ? (
            <Stack
              component={RouterLink}
              to={action.href}
              direction="row"
              sx={{ alignItems: 'center', color: green[700], textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
            >
              {action.label}
              <ChevronRightOutlinedIcon sx={{ fontSize: 18 }} />
            </Stack>
          ) : (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<AddOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={action.onClick}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {action.label}
            </Button>
          ))}
      </Stack>
      <Box sx={noContentPadding ? { overflowX: 'auto', flex: 1, minHeight: 0 } : { px: 2.5, py: 1.75, flex: 1, minHeight: 0 }}>
        {children}
      </Box>
    </Paper>
  );
}
