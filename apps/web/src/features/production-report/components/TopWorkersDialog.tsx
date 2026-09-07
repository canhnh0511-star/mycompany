import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { tableHeader, tableRow, text } from '../../../theme/colors';
import { formatKg } from '../utils/productionReportFormatters';
import type { ProductionDashboardResponse } from '../types/productionReport.types';

/**
 * Popup "Xem thêm" của panel "Top công nhân theo sản lượng" — panel rút gọn chỉ hiện top 4 (đủ dùng
 * để nhìn nhanh, khớp chiều cao 2 panel cùng hàng — Hiệu suất theo Tổ/Cảnh báo), bấm "Xem thêm" mới
 * cần bảng đầy đủ top 10 KÈM breakdown từng loại mủ (phản hồi trực tiếp) — tách riêng component để
 * không kéo nặng panel chính bằng 1 bảng nhiều cột luôn render sẵn.
 */
export function TopWorkersDialog({
  open,
  onClose,
  dashboard,
}: {
  open: boolean;
  onClose: () => void;
  dashboard: ProductionDashboardResponse;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        Top 10 công nhân theo sản lượng
        <IconButton size="small" onClick={onClose} aria-label="Đóng">
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {dashboard.topWorkers.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 2 }}>
            Không có công nhân nào có sản lượng đã chốt trong kỳ.
          </Typography>
        ) : (
          <Table size="small" sx={{ '& td, & th': { fontVariantNumeric: 'tabular-nums' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32, bgcolor: tableHeader.sub }}>#</TableCell>
                <TableCell sx={{ bgcolor: tableHeader.sub }}>Công nhân</TableCell>
                <TableCell sx={{ bgcolor: tableHeader.sub }}>Tổ</TableCell>
                {dashboard.latexTypeCodes.map((code) => (
                  <TableCell key={code} align="right" sx={{ bgcolor: tableHeader.sub }}>
                    {dashboard.latexTypeLabels[code] ?? code} (kg)
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ bgcolor: tableHeader.sub, fontWeight: 700 }}>
                  Tổng (kg)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboard.topWorkers.map((worker, index) => (
                <TableRow key={worker.employeeId} sx={{ bgcolor: index % 2 === 1 ? tableRow.zebra : undefined }}>
                  <TableCell sx={{ color: text.secondary, fontWeight: 600 }}>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{worker.employeeName}</TableCell>
                  <TableCell sx={{ color: text.secondary }}>{worker.teamName}</TableCell>
                  {dashboard.latexTypeCodes.map((code) => (
                    <TableCell key={code} align="right">
                      {formatKg(worker.kgByLatexType[code] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatKg(worker.productionKg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
