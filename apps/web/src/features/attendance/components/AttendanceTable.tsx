import { Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { StatusBadge, type StatusTone } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatDate, formatNumber } from '../../../utils/format';
import { tableHeader, tableRow } from '../../../theme/colors';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_TYPE_LABEL, type AttendanceRecordFull } from '../api/attendance.api';

const STATUS_TONE: Record<string, StatusTone> = { DRAFT: 'warning', CONFIRMED: 'success', CANCELLED: 'neutral' };

export function AttendanceTable({
  records,
  isLoading,
  isError,
  onRetry,
  onCancel,
}: {
  records: AttendanceRecordFull[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCancel: (id: string) => void;
}) {
  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không tải được dữ liệu chấm công." onRetry={onRetry} />;
  if (!records || records.length === 0) {
    return <WidgetEmptyState title="Chưa có dữ liệu" description="Không có bản ghi chấm công nào khớp bộ lọc hiện tại." />;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: tableHeader.sub }}>
          <TableCell>Ngày</TableCell>
          <TableCell>Nhân viên</TableCell>
          <TableCell>Loại</TableCell>
          <TableCell align="right">Số lượng</TableCell>
          <TableCell>Trạng thái</TableCell>
          <TableCell sx={{ width: 90 }} />
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((row, index) => (
          <TableRow key={row.id} sx={{ bgcolor: index % 2 === 1 ? tableRow.zebra : 'background.paper', '&:hover': { bgcolor: tableRow.hover } }}>
            <TableCell>{formatDate(row.recordDate)}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{row.employeeName}</TableCell>
            <TableCell>{ATTENDANCE_TYPE_LABEL[row.attendanceType]}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.quantity)}</TableCell>
            <TableCell>
              <StatusBadge label={ATTENDANCE_STATUS_LABEL[row.status] ?? row.status} tone={STATUS_TONE[row.status] ?? 'neutral'} />
            </TableCell>
            <TableCell>
              {row.status !== 'CANCELLED' && (
                <Button size="small" color="error" onClick={() => onCancel(row.id)}>
                  Hủy
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
