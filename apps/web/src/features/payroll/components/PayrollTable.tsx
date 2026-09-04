import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { borderStrong, green, red, tableHeader, tableRow, text } from '../../../theme/colors';
import { PAYROLL_ROW_STATUS_LABEL, TECHNICAL_GRADE_LABEL, type PayrollRow, type PayrollSummary } from '../model/payroll.types';

const STATUS_TONE = {
  CONFIRMED: 'success',
  NEEDS_REVIEW: 'warning',
  MISSING_DATA: 'error',
} as const;

// Kích thước 2 cột ghim trái (STT + Họ tên) khi cuộn ngang — mục 19.
const STT_COL_WIDTH = 44;
const NAME_COL_WIDTH = 180;

// Chiều cao 2 tầng header — dùng để tính offset `top` cho tầng dưới khi sticky — mục 17.
const GROUP_ROW_HEIGHT = 40;
const SUB_ROW_HEIGHT = 37;

const pinnedRightEdgeSx = { boxShadow: `2px 0 0 ${borderStrong}` } as const;

// Tầng 1 (group header): tên nhóm chỉ số, colspan gộp cột con, căn giữa, sticky top — mục 11/16/17.
const groupHeaderSx = {
  position: 'sticky',
  top: 0,
  zIndex: 3,
  height: GROUP_ROW_HEIGHT,
  boxSizing: 'border-box',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 600,
  color: text.primary,
  bgcolor: tableHeader.group,
  whiteSpace: 'nowrap',
} as const;
// Ô đầu mỗi nhóm cột: border-left đậm hơn để nhận ra ranh giới nhóm không cần đọc chữ — mục 18.
const groupStartHeaderSx = { ...groupHeaderSx, borderLeft: `1px solid ${borderStrong}` } as const;

// rowSpan=2 (STT/Họ tên/Tổng lương/Trừ-Tạm ứng/Thực lãnh/Trạng thái): che phủ cả 2 tầng header.
const rowSpanHeaderSx = {
  position: 'sticky',
  top: 0,
  zIndex: 3,
  verticalAlign: 'bottom',
  bgcolor: tableHeader.sub,
} as const;

// Tầng 2 (sub header): tên cột con, căn phải (trừ 2 cột text đầu), sticky top dưới tầng 1 — mục 11/16/17.
const subHeaderSx = {
  position: 'sticky',
  top: GROUP_ROW_HEIGHT,
  zIndex: 3,
  height: SUB_ROW_HEIGHT,
  boxSizing: 'border-box',
  textAlign: 'right',
  color: text.secondary,
  fontSize: 12,
  fontWeight: 500,
  bgcolor: tableHeader.sub,
  whiteSpace: 'nowrap',
} as const;
const groupStartSubHeaderSx = { ...subHeaderSx, borderLeft: `1px solid ${borderStrong}` } as const;

// 2 cột ghim trái trong header — sticky cả top lẫn left, z-index cao nhất — mục 19.
const pinnedSttHeaderSx = { ...rowSpanHeaderSx, left: 0, zIndex: 4, textAlign: 'left' } as const;
const pinnedNameHeaderSx = {
  ...rowSpanHeaderSx,
  left: STT_COL_WIDTH,
  zIndex: 4,
  textAlign: 'left',
  ...pinnedRightEdgeSx,
} as const;

// Padding dòng dữ liệu tăng nhẹ so với mặc định (10px) để bớt dồn cục khi >10 cột — mục 15.
const tdBaseSx = { paddingTop: '12px', paddingBottom: '12px' } as const;
const numCellSx = { ...tdBaseSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;
const textCellSx = { ...tdBaseSx, whiteSpace: 'nowrap' } as const;

// 2 cột ghim trái trong data row — sticky left, bgcolor 'inherit' để tự ăn theo màu dòng
// (zebra/hover/selected) do <tr> quyết định — mục 19/20.
const pinnedSttCellSx = { ...textCellSx, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'inherit' } as const;
const pinnedNameCellSx = {
  ...textCellSx,
  position: 'sticky',
  left: STT_COL_WIDTH,
  zIndex: 2,
  bgcolor: 'inherit',
  ...pinnedRightEdgeSx,
} as const;

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
 * Style 1 ô số trong bảng: giá trị 0 -> text-muted (mắt lướt nhanh tìm số có ý nghĩa),
 * giá trị âm/khấu trừ -> đỏ chuẩn hóa (mục 12/13). `groupStart` thêm border-left đậm
 * đánh dấu ô đầu 1 nhóm cột (mục 18).
 */
function amountCellSx(value: number, opts?: { negative?: boolean; groupStart?: boolean; bold?: boolean }) {
  const isNegativeEffect = (opts?.negative && value !== 0) || value < 0;
  return {
    ...numCellSx,
    ...(opts?.groupStart ? { borderLeft: `1px solid ${borderStrong}` } : null),
    color: isNegativeEffect ? red[600] : value === 0 ? text.muted : undefined,
    fontWeight: isNegativeEffect || opts?.bold ? 600 : undefined,
  } as const;
}

/**
 * Bảng chính "Bảng lương" — header 2 tầng sticky (nhóm thành phần lương + đơn vị con),
 * đối chiếu mockup `payroll-table-typography-mockup.html`. Cột STT + Họ tên ghim trái khi
 * cuộn ngang; số liệu căn phải/tabular-nums; ô = 0 tô mờ; số âm/khấu trừ tô đỏ chuẩn hóa.
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
      <Box sx={{ maxHeight: 640, overflowY: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ ...pinnedSttHeaderSx, width: STT_COL_WIDTH, minWidth: STT_COL_WIDTH }}>
                STT
              </TableCell>
              <TableCell rowSpan={2} sx={{ ...pinnedNameHeaderSx, width: NAME_COL_WIDTH, minWidth: NAME_COL_WIDTH }}>
                Họ tên công nhân
              </TableCell>
              <TableCell colSpan={2} sx={groupHeaderSx}>
                Mủ nước
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Mủ tạp
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Bồi thuốc
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Chuyên cần
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Hạng kỹ thuật
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Công mưa bão
              </TableCell>
              <TableCell colSpan={2} sx={groupStartHeaderSx}>
                Công thời vụ
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{ ...rowSpanHeaderSx, ...numCellSx, borderLeft: `1px solid ${borderStrong}` }}
              >
                Tổng lương
              </TableCell>
              <TableCell rowSpan={2} sx={{ ...rowSpanHeaderSx, ...numCellSx }}>
                Trừ / Tạm ứng
              </TableCell>
              <TableCell rowSpan={2} sx={{ ...rowSpanHeaderSx, ...numCellSx }}>
                Thực lãnh
              </TableCell>
              <TableCell rowSpan={2} sx={rowSpanHeaderSx}>
                Trạng thái
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={subHeaderSx}>Số lượng</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Số lượng</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Số lượng</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Ngày</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Loại</TableCell>
              <TableCell sx={subHeaderSx}>Tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Ngày</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
              <TableCell sx={groupStartSubHeaderSx}>Ngày</TableCell>
              <TableCell sx={subHeaderSx}>Thành tiền</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.rows.map((row, index) => {
              const selected = row.employeeId === selectedEmployeeId;
              const zebra = index % 2 === 1;
              return (
                <TableRow
                  key={row.employeeId}
                  onClick={() => onSelectEmployee(row.employeeId)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selected ? green[50] : zebra ? tableRow.zebra : 'background.paper',
                    '&:hover': { bgcolor: selected ? green[50] : tableRow.hover },
                  }}
                >
                  <TableCell sx={pinnedSttCellSx}>{index + 1}</TableCell>
                  <TableCell sx={{ ...pinnedNameCellSx, fontWeight: 500 }}>{row.employeeName}</TableCell>
                  <TableCell sx={amountCellSx(row.waterKg)}>{formatNumber(row.waterKg)}</TableCell>
                  <TableCell sx={amountCellSx(row.waterAmount)}>{formatNumber(row.waterAmount)}</TableCell>
                  <TableCell sx={amountCellSx(row.mixedLatexKg, { groupStart: true })}>
                    {formatNumber(row.mixedLatexKg)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.mixedLatexAmount)}>{formatNumber(row.mixedLatexAmount)}</TableCell>
                  <TableCell sx={amountCellSx(row.medicationCount, { groupStart: true })}>
                    {formatNumber(row.medicationCount)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.medicationAmount)}>{formatNumber(row.medicationAmount)}</TableCell>
                  <TableCell sx={amountCellSx(row.attendanceDays, { groupStart: true })}>
                    {formatNumber(row.attendanceDays)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.attendanceAmount)}>{formatNumber(row.attendanceAmount)}</TableCell>
                  <TableCell
                    sx={{
                      ...textCellSx,
                      textAlign: 'center',
                      borderLeft: `1px solid ${borderStrong}`,
                      color: row.technicalGrade ? undefined : text.muted,
                    }}
                  >
                    {row.technicalGrade ? TECHNICAL_GRADE_LABEL[row.technicalGrade].replace('Loại ', '') : '—'}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.technicalGradeAmount)}>
                    {formatNumber(row.technicalGradeAmount)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.stormAllowanceDays, { groupStart: true })}>
                    {formatNumber(row.stormAllowanceDays)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.stormAllowanceAmount)}>
                    {formatNumber(row.stormAllowanceAmount)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.seasonalWorkDays, { groupStart: true })}>
                    {formatNumber(row.seasonalWorkDays)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.seasonalWorkAmount)}>
                    {formatNumber(row.seasonalWorkAmount)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.totalPay, { bold: true, groupStart: true })}>
                    {formatNumber(row.totalPay)}
                  </TableCell>
                  <TableCell sx={amountCellSx(row.deduction, { negative: true })}>
                    {formatNumber(row.deduction)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...numCellSx,
                      fontWeight: 700,
                      color: row.netPay < 0 ? red[600] : green[700],
                    }}
                  >
                    {formatNumber(row.netPay)}
                  </TableCell>
                  <TableCell sx={textCellSx}>
                    <StatusBadge label={PAYROLL_ROW_STATUS_LABEL[row.rowStatus]} tone={STATUS_TONE[row.rowStatus]} />
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ bgcolor: 'background.paper' }}>
              <TableCell
                colSpan={2}
                sx={{
                  ...textCellSx,
                  fontWeight: 700,
                  borderBottom: 'none',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  bgcolor: 'inherit',
                  ...pinnedRightEdgeSx,
                }}
              >
                Cộng
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.waterKg, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.waterKg)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.waterAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.waterAmount)}
              </TableCell>
              <TableCell
                sx={{ ...amountCellSx(totals.mixedLatexKg, { bold: true, groupStart: true }), borderBottom: 'none' }}
              >
                {formatNumber(totals.mixedLatexKg)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.mixedLatexAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.mixedLatexAmount)}
              </TableCell>
              <TableCell
                sx={{
                  ...amountCellSx(totals.medicationCount, { bold: true, groupStart: true }),
                  borderBottom: 'none',
                }}
              >
                {formatNumber(totals.medicationCount)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.medicationAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.medicationAmount)}
              </TableCell>
              <TableCell
                sx={{
                  ...amountCellSx(totals.attendanceDays, { bold: true, groupStart: true }),
                  borderBottom: 'none',
                }}
              >
                {formatNumber(totals.attendanceDays)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.attendanceAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.attendanceAmount)}
              </TableCell>
              <TableCell sx={{ borderBottom: 'none', borderLeft: `1px solid ${borderStrong}` }} />
              <TableCell sx={{ ...amountCellSx(totals.technicalGradeAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.technicalGradeAmount)}
              </TableCell>
              <TableCell
                sx={{
                  ...amountCellSx(totals.stormAllowanceDays, { bold: true, groupStart: true }),
                  borderBottom: 'none',
                }}
              >
                {formatNumber(totals.stormAllowanceDays)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.stormAllowanceAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.stormAllowanceAmount)}
              </TableCell>
              <TableCell
                sx={{
                  ...amountCellSx(totals.seasonalWorkDays, { bold: true, groupStart: true }),
                  borderBottom: 'none',
                }}
              >
                {formatNumber(totals.seasonalWorkDays)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.seasonalWorkAmount, { bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.seasonalWorkAmount)}
              </TableCell>
              <TableCell
                sx={{
                  ...amountCellSx(totals.totalPay, { bold: true, groupStart: true }),
                  borderBottom: 'none',
                }}
              >
                {formatNumber(totals.totalPay)}
              </TableCell>
              <TableCell sx={{ ...amountCellSx(totals.deduction, { negative: true, bold: true }), borderBottom: 'none' }}>
                {formatNumber(totals.deduction)}
              </TableCell>
              <TableCell
                sx={{
                  ...numCellSx,
                  fontWeight: 700,
                  color: totals.netPay < 0 ? red[600] : green[700],
                  borderBottom: 'none',
                }}
              >
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
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Tổng thực lãnh: {formatCurrency(totals.netPay)}
      </Typography>
    </Box>
  );
}
