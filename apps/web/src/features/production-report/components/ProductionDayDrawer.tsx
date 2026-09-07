import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useLatexTypes } from '../../../hooks/useLookups';
import { amber, blue, red } from '../../../theme/colors';
import { formatDate, formatKg } from '../utils/productionReportFormatters';
import type { ProductionDashboardResponse } from '../types/productionReport.types';

const SEVERITY_COLOR = { RED: red[600], AMBER: amber[700], BLUE: blue[700] } as const;

/** Drawer chi tiết 1 ngày (spec §6.4) / 1 ô heatmap (spec §12.6) — derive HOÀN TOÀN từ dữ liệu
 * dashboard đã tải (không gọi API riêng): heatmap cell đã có breakdown theo Tổ/loại mủ cho mọi ngày
 * trong khoảng lọc hiện tại. `teamId` optional — click từ Trend chart (không có Tổ cụ thể) truyền
 * null để gộp tất cả Tổ; click từ 1 ô heatmap truyền đúng Tổ đó. */
export function ProductionDayDrawer({
  date,
  teamId,
  data,
  onClose,
}: {
  date: string | null;
  teamId?: string | null;
  data: ProductionDashboardResponse | undefined;
  onClose: () => void;
}) {
  const { data: latexTypes } = useLatexTypes();
  const latexLabels = Object.fromEntries((latexTypes ?? []).map((t) => [t.code, t.label]));

  const cells = date && data ? data.heatmap.filter((c) => c.date === date && (!teamId || c.teamId === teamId)) : [];
  const totalKg = cells.reduce((sum, c) => sum + (c.productionKg ?? 0), 0);
  const totalWorkers = cells.reduce((sum, c) => sum + (c.workerCount ?? 0), 0);
  const totalDocs = cells.reduce((sum, c) => sum + c.documentCount, 0);
  const byLatexType: Record<string, number> = {};
  for (const cell of cells) {
    for (const [code, kg] of Object.entries(cell.kgByLatexType)) {
      byLatexType[code] = (byLatexType[code] ?? 0) + kg;
    }
  }
  const alertsForDay = date && data ? data.alerts.filter((a) => a.linkDate === date) : [];

  return (
    <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontSize: 16, fontWeight: 700 }}>{date ? formatDate(date) : ''}</Typography>
            {teamId && cells[0] && <Typography variant="body2" color="text.secondary">{cells[0].teamName}</Typography>}
          </Box>
          <IconButton onClick={onClose} aria-label="Đóng"><CloseRoundedIcon /></IconButton>
        </Stack>

        {cells.length === 0 || totalDocs === 0 ? (
          <Typography variant="body2" color="text.secondary">Chưa có dữ liệu ngày này.</Typography>
        ) : (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Tổng sản lượng</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{formatKg(totalKg)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Công nhân</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{totalWorkers}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Số phiếu</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{totalDocs}</Typography>
              </Box>
            </Stack>

            {!teamId && cells.length > 1 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Theo Tổ</Typography>
                <Stack spacing={0.75}>
                  {cells.filter((c) => c.productionKg != null).map((c) => (
                    <Stack key={c.teamId} direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">{c.teamName}</Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatKg(c.productionKg ?? 0)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Theo loại mủ</Typography>
              <Stack spacing={0.75}>
                {Object.entries(byLatexType).map(([code, kg]) => (
                  <Stack key={code} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">{latexLabels[code] ?? code}</Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatKg(kg)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {alertsForDay.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Cảnh báo</Typography>
                <Stack spacing={1}>
                  {alertsForDay.map((alert) => (
                    <Stack key={alert.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                      <WarningAmberRoundedIcon sx={{ fontSize: 16, color: SEVERITY_COLOR[alert.severity], mt: 0.25 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{alert.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{alert.description}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
