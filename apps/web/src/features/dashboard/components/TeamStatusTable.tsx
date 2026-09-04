import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { TEAM_STATUS_LABEL, TEAM_STATUS_TONE, type TeamStatusRow } from '../model/dashboard.types';
import { formatNumber } from '../../../utils/format';
import { green } from '../../../theme/colors';

/**
 * spec §21 — số căn phải, text căn trái, hover nhẹ, footer Tổng.
 *
 * Đối chiếu pixel: chỉ dòng "Tổng" in đậm — tên Tổ ở các dòng thường KHÔNG
 * in đậm (trước đó đang in đậm rải rác gây cảm giác nặng/tối không cần thiết).
 */
export function TeamStatusTable({ rows }: { rows: TeamStatusRow[] }) {
  const totals = rows.reduce(
    (acc, row) => ({
      productionKg: acc.productionKg + row.productionKg,
      workforcePresent: acc.workforcePresent + row.workforcePresent,
      workforceExpected: acc.workforceExpected + row.workforceExpected,
      soldKg: acc.soldKg + row.soldKg,
    }),
    { productionKg: 0, workforcePresent: 0, workforceExpected: 0, soldKg: 0 },
  );

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Tổ</TableCell>
          <TableCell align="right">Sản lượng (kg)</TableCell>
          <TableCell align="right">Nhân công</TableCell>
          <TableCell align="right">Đã bán (kg)</TableCell>
          <TableCell>Trạng thái</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.teamId} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
            <TableCell>{row.teamName}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(row.productionKg)}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {row.workforcePresent} / {row.workforceExpected}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(row.soldKg)}
            </TableCell>
            <TableCell>
              <StatusBadge label={TEAM_STATUS_LABEL[row.status]} tone={TEAM_STATUS_TONE[row.status]} />
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell sx={{ fontWeight: 700, borderBottom: 'none' }}>Tổng</TableCell>
          <TableCell
            align="right"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: 'none', color: green[700] }}
          >
            {formatNumber(totals.productionKg)}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: 'none' }}>
            {totals.workforcePresent} / {totals.workforceExpected}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: 'none' }}>
            {formatNumber(totals.soldKg)}
          </TableCell>
          <TableCell sx={{ borderBottom: 'none' }}>—</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
