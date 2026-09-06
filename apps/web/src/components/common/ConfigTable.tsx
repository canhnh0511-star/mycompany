import { IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { ReactNode } from 'react';
import { LoadingSkeleton } from '../feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../feedback/WidgetEmptyState';
import { WidgetErrorState } from '../feedback/WidgetErrorState';
import { tableHeader, tableRow } from '../../theme/colors';

export interface ConfigColumn<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

interface ConfigRow {
  id: string;
}

/**
 * Bảng danh sách dùng chung — ban đầu chỉ phục vụ 4 tab "Thành phần lương" (cấu hình time-versioned,
 * sắp xếp theo `effectiveFrom` mới nhất trước), giờ promote lên `components/common/` để dùng chung
 * cho cả danh mục KHÔNG time-versioned (Tổ/Nhân viên — Cấu hình hệ thống), Danh sách phiếu, Bán mủ.
 * `sortBy` optional — truyền vào khi cần sắp xếp (vd `(row) => row.effectiveFrom`), bỏ qua thì giữ
 * nguyên thứ tự `rows` được truyền vào (vd đã sort sẵn từ server).
 */
export function ConfigTable<T extends ConfigRow>({
  rows,
  isLoading,
  isError,
  onRetry,
  emptyMessage,
  columns,
  onEdit,
  sortBy,
}: {
  rows: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage: string;
  columns: ConfigColumn<T>[];
  onEdit: (row: T) => void;
  sortBy?: (row: T) => string;
}) {
  if (isLoading) return <LoadingSkeleton rows={4} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không thể tải danh sách." onRetry={onRetry} />;
  if (!rows || rows.length === 0) {
    return <WidgetEmptyState title="Chưa có dữ liệu" description={emptyMessage} />;
  }

  const sorted = sortBy ? [...rows].sort((a, b) => sortBy(b).localeCompare(sortBy(a))) : rows;

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: tableHeader.sub }}>
          {columns.map((col) => (
            <TableCell key={col.header} sx={{ textAlign: col.align ?? 'left' }}>
              {col.header}
            </TableCell>
          ))}
          <TableCell sx={{ width: 48 }} />
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row, index) => (
          <TableRow
            key={row.id}
            sx={{
              bgcolor: index % 2 === 1 ? tableRow.zebra : 'background.paper',
              '&:hover': { bgcolor: tableRow.hover },
            }}
          >
            {columns.map((col) => (
              <TableCell key={col.header} sx={{ textAlign: col.align ?? 'left' }}>
                {col.render(row)}
              </TableCell>
            ))}
            <TableCell sx={{ textAlign: 'right' }}>
              <IconButton size="small" aria-label="Sửa" onClick={() => onEdit(row)}>
                <EditOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
