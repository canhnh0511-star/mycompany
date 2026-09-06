import { useEffect, useRef, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Typography } from '@mui/material';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { DecimalField } from '../../../components/common/DecimalField';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { useEmployees } from '../../../hooks/useLookups';
import { borderStrong, tableHeader, tableRow } from '../../../theme/colors';
import { ATTENDANCE_TYPES, ATTENDANCE_TYPE_LABEL, type AttendanceRecordFull } from '../api/attendance.api';
import { useAttendanceByTeamAndDate, useCreateAttendanceBatch, useUpdateAttendance } from '../hooks/useAttendance';
import type { AttendanceRowDraft } from '../model/attendanceEntry.types';
import type { EmployeeOption } from '../../../api/lookups.api';

const cellSx = { verticalAlign: 'top', py: 1 } as const;
const numColSx = { minWidth: 100 } as const;

function buildRow(employee: EmployeeOption, records: AttendanceRecordFull[]): AttendanceRowDraft {
  const mine = records.filter((r) => r.employeeId === employee.id);
  const cells = ATTENDANCE_TYPES.map((type) => {
    const existing = mine.find((r) => r.attendanceType === type);
    return { attendanceType: type, recordId: existing?.id ?? null, quantity: existing ? String(existing.quantity) : '' };
  });
  return { employeeId: employee.id, employeeName: employee.fullName, cells, rowStatus: 'idle' };
}

/**
 * Ngày làm việc (chấm công) — tái dùng CẤU TRÚC `ProductionRosterTable` (roster cố định theo Tổ đã
 * chọn, dirty-tracking, "Lưu tất cả" gộp POST batch + PATCH riêng) nhưng KHÔNG có OCR (CLAUDE.md
 * không đề cập OCR cho chấm công — chỉ nhập tay) nên bảng full-width, không có cột ảnh bên phải.
 * Cột là 5 `AttendanceType` thay vì 4 loại mủ — mỗi ô là 1 bản ghi ĐỘC LẬP (không có "items" con như
 * production_records), xem `model/attendanceEntry.types.ts`.
 */
export function AttendanceRosterTable({ teamId, recordDate }: { teamId: string; recordDate: string }) {
  const { data: employees, isLoading: loadingEmployees } = useEmployees({ teamId, status: 'ACTIVE' });
  const { data: records, isLoading: loadingRecords, isError, refetch } = useAttendanceByTeamAndDate(teamId, recordDate);
  const batchMutation = useCreateAttendanceBatch();
  const updateMutation = useUpdateAttendance();

  const [rows, setRows] = useState<AttendanceRowDraft[]>([]);
  const dirtyCellKeys = useRef<Set<string>>(new Set());
  const rosterKey = `${teamId}|${recordDate}`;
  const prevRosterKey = useRef(rosterKey);

  useEffect(() => {
    if (!employees || !records) return;
    const rosterChanged = prevRosterKey.current !== rosterKey;
    if (rosterChanged) {
      dirtyCellKeys.current = new Set();
      prevRosterKey.current = rosterKey;
    }
    setRows((prev) => {
      const prevByEmployee = new Map(prev.map((r) => [r.employeeId, r]));
      return employees.map((employee) => {
        const freshRow = buildRow(employee, records.content);
        if (rosterChanged) return freshRow;
        const prevRow = prevByEmployee.get(employee.id);
        if (!prevRow) return freshRow;
        // Giữ nguyên state cục bộ ở đúng Ô đang bị sửa dở, merge dữ liệu server vào các ô còn "sạch".
        const mergedCells = freshRow.cells.map((freshCell, i) => {
          const key = `${employee.id}:${freshCell.attendanceType}`;
          return dirtyCellKeys.current.has(key) ? prevRow.cells[i] : freshCell;
        });
        return { ...freshRow, cells: mergedCells };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, records, rosterKey]);

  function updateCell(employeeId: string, cellIndex: number, quantity: string) {
    const type = ATTENDANCE_TYPES[cellIndex];
    dirtyCellKeys.current.add(`${employeeId}:${type}`);
    setRows((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId
          ? { ...row, cells: row.cells.map((c, i) => (i === cellIndex ? { ...c, quantity } : c)) }
          : row,
      ),
    );
  }

  async function handleSaveAll() {
    const creates: { employeeId: string; type: (typeof ATTENDANCE_TYPES)[number]; quantity: number }[] = [];
    const updates: { employeeId: string; id: string; type: (typeof ATTENDANCE_TYPES)[number]; quantity: number }[] = [];

    for (const row of rows) {
      row.cells.forEach((cell) => {
        const key = `${row.employeeId}:${cell.attendanceType}`;
        if (cell.recordId && !dirtyCellKeys.current.has(key)) return; // chưa đụng gì -> bỏ qua
        const quantity = Number(cell.quantity);
        if (!cell.quantity || Number.isNaN(quantity) || quantity <= 0) return; // ô trống -> bỏ qua
        if (cell.recordId) updates.push({ employeeId: row.employeeId, id: cell.recordId, type: cell.attendanceType, quantity });
        else creates.push({ employeeId: row.employeeId, type: cell.attendanceType, quantity });
      });
    }
    if (creates.length === 0 && updates.length === 0) return;

    setRows((prev) => prev.map((row) => ({ ...row, rowStatus: 'pending', rowError: undefined })));

    const [createOutcome, updateOutcomes] = await Promise.all([
      creates.length > 0
        ? batchMutation
            .mutateAsync(creates.map((c) => ({ recordDate, employeeId: c.employeeId, attendanceType: c.type, quantity: c.quantity, notes: null })))
            .then(
              (value) => ({ status: 'fulfilled' as const, value }),
              (reason: unknown) => ({ status: 'rejected' as const, reason }),
            )
        : null,
      Promise.allSettled(
        updates.map((u) =>
          updateMutation.mutateAsync({
            id: u.id,
            body: { recordDate, employeeId: u.employeeId, attendanceType: u.type, quantity: u.quantity, notes: null },
          }),
        ),
      ),
    ]);

    for (const c of creates) dirtyCellKeys.current.delete(`${c.employeeId}:${c.type}`);
    for (const u of updates) dirtyCellKeys.current.delete(`${u.employeeId}:${u.type}`);

    const anyError =
      (createOutcome && createOutcome.status === 'rejected') ||
      (createOutcome && createOutcome.status === 'fulfilled' && createOutcome.value.results.some((r) => !r.success)) ||
      updateOutcomes.some((o) => o.status === 'rejected');

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        rowStatus: anyError ? 'error' : 'saved',
        rowError: anyError ? 'Một số ô lưu thất bại — kiểm tra lại giá trị đã nhập.' : undefined,
      })),
    );
  }

  const isLoading = loadingEmployees || loadingRecords;
  const dirtyCount = rows.reduce(
    (sum, row) =>
      sum +
      row.cells.filter((c) => {
        const key = `${row.employeeId}:${c.attendanceType}`;
        return c.quantity && (dirtyCellKeys.current.has(key) || !c.recordId);
      }).length,
    0,
  );

  if (isLoading) return <LoadingSkeleton rows={4} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không tải được dữ liệu chấm công." onRetry={() => refetch()} />;
  if (!employees || employees.length === 0) {
    return <WidgetEmptyState title="Tổ này chưa có công nhân" description="Thêm công nhân cho Tổ trước khi chấm công." />;
  }

  const totals = ATTENDANCE_TYPES.map((type) =>
    rows.reduce((sum, row) => {
      const cell = row.cells.find((c) => c.attendanceType === type);
      const qty = Number(cell?.quantity);
      return sum + (Number.isNaN(qty) ? 0 : qty);
    }, 0),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 44, bgcolor: tableHeader.sub }}>STT</TableCell>
              <TableCell sx={{ minWidth: 180, bgcolor: tableHeader.sub }}>Tên công nhân</TableCell>
              {ATTENDANCE_TYPES.map((type) => (
                <TableCell key={type} align="right" sx={{ ...numColSx, bgcolor: tableHeader.sub }}>
                  {ATTENDANCE_TYPE_LABEL[type]}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={row.employeeId}
                sx={{
                  bgcolor: rowIndex % 2 === 1 ? tableRow.zebra : 'background.paper',
                  '&:hover': { bgcolor: tableRow.hover },
                }}
              >
                <TableCell sx={cellSx}>{rowIndex + 1}</TableCell>
                <TableCell sx={cellSx}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{row.employeeName}</Typography>
                  {row.rowStatus === 'error' && row.rowError && (
                    <Typography sx={{ fontSize: 11, color: 'error.main' }}>{row.rowError}</Typography>
                  )}
                </TableCell>
                {row.cells.map((cell, cellIndex) => (
                  <TableCell key={cell.attendanceType} sx={cellSx}>
                    <DecimalField
                      size="small"
                      placeholder="—"
                      value={cell.quantity}
                      onValueChange={(quantity) => updateCell(row.employeeId, cellIndex, quantity)}
                      sx={{ ...numColSx, '& input': { textAlign: 'right' } }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& td': { borderTop: `2px solid ${borderStrong}`, fontWeight: 700 } }}>
              <TableCell colSpan={2}>Tổng cộng</TableCell>
              {totals.map((total, i) => (
                <TableCell key={ATTENDANCE_TYPES[i]} align="right" sx={numColSx}>
                  {total.toLocaleString('vi-VN')}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2.5, py: 2 }}>
        <LoadingButton
          variant="contained"
          color="success"
          loading={batchMutation.isPending || updateMutation.isPending}
          disabled={dirtyCount === 0}
          onClick={handleSaveAll}
        >
          {`Lưu tất cả (${dirtyCount} ô)`}
        </LoadingButton>
      </Box>
    </Box>
  );
}
