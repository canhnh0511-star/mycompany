import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { StatusBadge, type StatusTone } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatDate, formatNumber } from '../../../utils/format';
import { green, tableHeader, tableRow } from '../../../theme/colors';
import { RECORD_STATUS_LABEL, type ProductionRecordFull } from '../api/productionRecordsList.api';

const STATUS_TONE: Record<string, StatusTone> = { DRAFT: 'warning', APPROVED: 'success', CANCELLED: 'neutral' };
const SOURCE_LABEL: Record<string, string> = { manual: 'Nhập tay', ocr_import: 'Ảnh (OCR)' };

function totalKg(row: ProductionRecordFull): number {
  return row.items.reduce((sum, item) => sum + item.kg, 0);
}

export function ProductionRecordsTable({
  records,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onSelect,
}: {
  records: ProductionRecordFull[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không tải được danh sách phiếu." onRetry={onRetry} />;
  if (!records || records.length === 0) {
    return <WidgetEmptyState title="Chưa có phiếu nào" description="Không có phiếu nào khớp bộ lọc hiện tại." />;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: tableHeader.sub }}>
          <TableCell>Ngày</TableCell>
          <TableCell>Nhân viên</TableCell>
          <TableCell>Tổ</TableCell>
          <TableCell align="right">Tổng kg</TableCell>
          <TableCell>Nguồn</TableCell>
          <TableCell>Trạng thái</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((row, index) => (
          <TableRow
            key={row.id}
            onClick={() => onSelect(row.id)}
            sx={{
              cursor: 'pointer',
              bgcolor: row.id === selectedId ? green[50] : index % 2 === 1 ? tableRow.zebra : 'background.paper',
              '&:hover': { bgcolor: row.id === selectedId ? green[50] : tableRow.hover },
            }}
          >
            <TableCell>{formatDate(row.recordDate)}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{row.employeeName}</TableCell>
            <TableCell>{row.teamName}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(totalKg(row))}</TableCell>
            <TableCell>{SOURCE_LABEL[row.source] ?? row.source}</TableCell>
            <TableCell>
              <StatusBadge label={RECORD_STATUS_LABEL[row.status] ?? row.status} tone={STATUS_TONE[row.status] ?? 'neutral'} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
