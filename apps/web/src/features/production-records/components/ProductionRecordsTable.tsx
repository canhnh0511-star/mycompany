import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { StatusBadge, type StatusTone } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatDate, formatNumber } from '../../../utils/format';
import { tableHeader, tableRow } from '../../../theme/colors';
import type { LatexTypeOption } from '../../../api/lookups.api';
import { RECORD_STATUS_LABEL } from '../api/productionRecordsList.api';
import type { ProductionRecordsAggregateRow } from '../utils/aggregateByTeamDate';

const STATUS_TONE: Record<string, StatusTone> = { DRAFT: 'warning', APPROVED: 'success', CANCELLED: 'neutral' };

/**
 * Bảng "Danh sách phiếu" — 1 dòng / (Tổ, Ngày), KHÔNG còn 1 dòng / nhân viên như bản cũ. Cột loại
 * mủ lấy ĐỘNG từ `useLatexTypes()` (không hard-code water/cup/strip/coagulated) — danh mục loại mủ
 * là danh mục MỞ (CLAUDE.md §4), thêm loại mủ mới không cần sửa bảng này.
 */
export function ProductionRecordsTable({
  rows,
  latexTypes,
  isLoading,
  isError,
  onRetry,
  onSelect,
}: {
  rows: ProductionRecordsAggregateRow[] | undefined;
  latexTypes: LatexTypeOption[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (row: ProductionRecordsAggregateRow) => void;
}) {
  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không tải được danh sách phiếu." onRetry={onRetry} />;
  if (!rows || rows.length === 0) {
    return <WidgetEmptyState title="Chưa có phiếu nào" description="Không có phiếu nào khớp bộ lọc hiện tại." />;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: tableHeader.sub }}>
          <TableCell>Ngày</TableCell>
          <TableCell>Tên tổ</TableCell>
          {latexTypes.map((latexType) => (
            <TableCell key={latexType.id} align="right">
              {latexType.label} ({latexType.unit})
            </TableCell>
          ))}
          <TableCell>Ngày upload</TableCell>
          <TableCell>Trạng thái</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow
            key={row.key}
            onClick={() => onSelect(row)}
            sx={{
              cursor: 'pointer',
              bgcolor: index % 2 === 1 ? tableRow.zebra : 'background.paper',
              '&:hover': { bgcolor: tableRow.hover },
            }}
          >
            <TableCell>{formatDate(row.recordDate)}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{row.teamName}</TableCell>
            {latexTypes.map((latexType) => (
              <TableCell key={latexType.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatNumber(row.totalKgByLatexTypeId[latexType.id] ?? 0)}
              </TableCell>
            ))}
            <TableCell>{formatDate(row.latestCreatedAt)}</TableCell>
            <TableCell>
              <StatusBadge label={RECORD_STATUS_LABEL[row.status] ?? row.status} tone={STATUS_TONE[row.status] ?? 'neutral'} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
