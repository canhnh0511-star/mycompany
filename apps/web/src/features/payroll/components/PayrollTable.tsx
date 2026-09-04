import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { green, neutral } from '../../../theme/colors';
import { PAYROLL_ROW_STATUS_LABEL, TECHNICAL_GRADE_LABEL, type PayrollRow, type PayrollSummary } from '../model/payroll.types';

const STATUS_TONE = {
  CONFIRMED: 'success',
  NEEDS_REVIEW: 'warning',
  MISSING_DATA: 'error',
} as const;

const numCellSx = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;
const groupHeaderSx = {
  textAlign: 'center',
  fontWeight: 700,
  borderLeft: `1px solid ${neutral[200]}`,
  whiteSpace: 'nowrap',
} as const;
const subHeaderSx = { textAlign: 'right', color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' } as const;

interface Totals {
  waterKg: number;
  waterAmount: number;
  mixedLatexKg: number;
  mixedLatexAmount: number;
  medicationCount: number;
  medicationAmount: number;
  attendanceDays: number;
  attendanceAmount: number;
  technicalGradeAmount: number;
  stormAllowanceDays: number;
  stormAllowanceAmount: number;
  seasonalWorkDays: number;
  seasonalWorkAmount: number;
  totalPay: number;
  deduction: number;
  netPay: number;
}

function sumRows(rows: PayrollRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, row) => ({
      waterKg: acc.waterKg + row.waterKg,
      waterAmount: acc.waterAmount + row.waterAmount,
      mixedLatexKg: acc.mixedLatexKg + row.mixedLatexKg,
      mixedLatexAmount: acc.mixedLatexAmount + row.mixedLatexAmount,
      medicationCount: acc.medicationCount + row.medicationCount,
      medicationAmount: acc.medicationAmount + row.medicationAmount,
      attendanceDays: acc.attendanceDays + row.attendanceDays,
      attendanceAmount: acc.attendanceAmount + row.attendanceAmount,
      technicalGradeAmount: acc.technicalGradeAmount + row.technicalGradeAmount,
      stormAllowanceDays: acc.stormAllowanceDays + row.stormAllowanceDays,
      stormAllowanceAmount: acc.stormAllowanceAmount + row.stormAllowanceAmount,
      seasonalWorkDays: acc.seasonalWorkDays + row.seasonalWorkDays,
      seasonalWorkAmount: acc.seasonalWorkAmount + row.seasonalWorkAmount,
      totalPay: acc.totalPay + row.totalPay,
      deduction: acc.deduction + row.deduction,
      netPay: acc.netPay + row.netPay,
    }),
    {
      waterKg: 0,
      waterAmount: 0,
      mixedLatexKg: 0,
      mixedLatexAmount: 0,
      medicationCount: 0,
      medicationAmount: 0,
      attendanceDays: 0,
      attendanceAmount: 0,
      technicalGradeAmount: 0,
      stormAllowanceDays: 0,
      stormAllowanceAmount: 0,
      seasonalWorkDays: 0,
      seasonalWorkAmount: 0,
      totalPay: 0,
      deduction: 0,
      netPay: 0,
    },
  );
}

/**
 * Bảng chính "Bảng lương" — 2 hàng header (nhóm thành phần lương + đơn vị con), đối chiếu mockup.
 * Mỗi field *Amount đã tính sẵn từ backend — bảng chỉ hiển thị, KHÔNG tự tính lại (mục 0 spec).
 * Click 1 dòng -> mở panel chi tiết bên phải (PayrollDetailPanel, quản lý state ở PayrollPage).
 */
export function PayrollTable({
  summary,
  isLoading,
  isError,
  onRetry,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  summary: PayrollSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string) => void;
}) {
  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không thể tải bảng lương." onRetry={onRetry} />;
  if (!summary || summary.rows.length === 0) {
    return <WidgetEmptyState title="Chưa có dữ liệu" description="Không có nhân viên nào khớp bộ lọc hiện tại." />;
  }

  const totals = sumRows(summary.rows);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1400 }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>
              STT
            </TableCell>
            <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>
              Họ tên công nhân
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Mủ nước
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Mủ tạp
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Bồi thuốc
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Chuyên cần
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Hạng kỹ thuật
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Công mưa bão
            </TableCell>
            <TableCell colSpan={2} sx={groupHeaderSx}>
              Công thời vụ
            </TableCell>
            <TableCell rowSpan={2} sx={{ ...numCellSx, verticalAlign: 'bottom', borderLeft: `1px solid ${neutral[200]}` }}>
              Tổng lương
            </TableCell>
            <TableCell rowSpan={2} sx={{ ...numCellSx, verticalAlign: 'bottom' }}>
              Trừ / Tạm ứng
            </TableCell>
            <TableCell rowSpan={2} sx={{ ...numCellSx, verticalAlign: 'bottom' }}>
              Thực lãnh
            </TableCell>
            <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>
              Trạng thái
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={subHeaderSx}>Số lượng</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            <TableCell sx={subHeaderSx}>Số lượng</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            <TableCell sx={subHeaderSx}>Số lượng</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            <TableCell sx={subHeaderSx}>Ngày</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            <TableCell sx={subHeaderSx}>Loại</TableCell>
            <TableCell sx={subHeaderSx}>Tiền</TableCell>
            <TableCell sx={subHeaderSx}>Ngày</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            <TableCell sx={subHeaderSx}>Ngày</TableCell>
            <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summary.rows.map((row, index) => {
            const selected = row.employeeId === selectedEmployeeId;
            return (
              <TableRow
                key={row.employeeId}
                onClick={() => onSelectEmployee(row.employeeId)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: selected ? green[50] : undefined,
                  '&:hover': { bgcolor: selected ? green[50] : 'action.hover' },
                }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employeeName}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.waterKg)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.waterAmount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.mixedLatexKg)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.mixedLatexAmount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.medicationCount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.medicationAmount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.attendanceDays)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.attendanceAmount)}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {row.technicalGrade ? TECHNICAL_GRADE_LABEL[row.technicalGrade].replace('Loại ', '') : '—'}
                </TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.technicalGradeAmount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.stormAllowanceDays)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.stormAllowanceAmount)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.seasonalWorkDays)}</TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.seasonalWorkAmount)}</TableCell>
                <TableCell sx={{ ...numCellSx, borderLeft: `1px solid ${neutral[200]}`, fontWeight: 600 }}>
                  {formatNumber(row.totalPay)}
                </TableCell>
                <TableCell sx={numCellSx}>{formatNumber(row.deduction)}</TableCell>
                <TableCell sx={{ ...numCellSx, fontWeight: 700, color: green[700] }}>
                  {formatNumber(row.netPay)}
                </TableCell>
                <TableCell>
                  <StatusBadge label={PAYROLL_ROW_STATUS_LABEL[row.rowStatus]} tone={STATUS_TONE[row.rowStatus]} />
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell colSpan={2} sx={{ fontWeight: 700, borderBottom: 'none' }}>
              Cộng
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.waterKg)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.waterAmount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.mixedLatexKg)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.mixedLatexAmount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.medicationCount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.medicationAmount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.attendanceDays)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.attendanceAmount)}
            </TableCell>
            <TableCell sx={{ borderBottom: 'none' }} />
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.technicalGradeAmount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.stormAllowanceDays)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.stormAllowanceAmount)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.seasonalWorkDays)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.seasonalWorkAmount)}
            </TableCell>
            <TableCell
              sx={{
                ...numCellSx,
                fontWeight: 700,
                borderLeft: `1px solid ${neutral[200]}`,
                borderBottom: 'none',
              }}
            >
              {formatNumber(totals.totalPay)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, borderBottom: 'none' }}>
              {formatNumber(totals.deduction)}
            </TableCell>
            <TableCell sx={{ ...numCellSx, fontWeight: 700, color: green[700], borderBottom: 'none' }}>
              {formatNumber(totals.netPay)}
            </TableCell>
            <TableCell sx={{ borderBottom: 'none' }}>
              <Typography sx={{ fontSize: 13 }} color="text.secondary">
                —
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Tổng thực lãnh: {formatCurrency(totals.netPay)}
      </Typography>
    </Box>
  );
}
