import { useMemo, useState } from 'react';
import { Snackbar, Stack, Table, TableBody, TableCell, TableFooter, TableHead, TableRow } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { tableHeader, tableRow } from '../../../theme/colors';
import { formatNumber, toIsoDate } from '../../../utils/format';
import { ReportFilterBar } from './ReportFilterBar';
import { useExportLatexSalePdf, useExportLatexSaleXlsx, useLatexSaleReport, useTeams } from '../hooks/useReports';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

export function LatexSaleReportTab() {
  const [fromDate, setFromDate] = useState(daysAgoIso(29));
  const [toDate, setToDate] = useState(toIsoDate(new Date()));
  const [teamId, setTeamId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const filters = useMemo(() => ({ fromDate, toDate, teamId: teamId || undefined }), [fromDate, toDate, teamId]);
  const { data, isLoading, isError, refetch } = useLatexSaleReport(filters, !!fromDate && !!toDate);
  const { data: teams } = useTeams();
  const exportXlsx = useExportLatexSaleXlsx();
  const exportPdf = useExportLatexSalePdf();

  async function handleExport(kind: 'xlsx' | 'pdf') {
    try {
      await (kind === 'xlsx' ? exportXlsx : exportPdf).mutateAsync(filters);
    } catch {
      setNotice('Xuất file thất bại, thử lại giúp tôi.');
    }
  }

  return (
    <Stack spacing={2.5}>
      <ReportFilterBar
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        teamId={teamId}
        onTeamIdChange={setTeamId}
        teams={teams ?? []}
        exporting={exportXlsx.isPending || exportPdf.isPending}
        onExportXlsx={() => handleExport('xlsx')}
        onExportPdf={() => handleExport('pdf')}
      />

      <SectionPanel title="Bán mủ theo Tổ" noContentPadding>
        {isLoading ? (
          <LoadingSkeleton rows={6} rowHeight={36} />
        ) : isError ? (
          <WidgetErrorState message="Không tải được báo cáo bán mủ." onRetry={() => refetch()} />
        ) : !data || data.rows.length === 0 ? (
          <WidgetEmptyState title="Chưa có dữ liệu" description="Không có phiếu bán mủ nào đã duyệt trong khoảng ngày này." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: tableHeader.sub }}>
                <TableCell>Tổ</TableCell>
                {data.latexTypeCodes.map((code) => (
                  <TableCell key={code} align="right">{data.latexTypeLabels[code] ?? code} (kg)</TableCell>
                ))}
                <TableCell align="right">Tổng (kg)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={row.teamId} sx={{ bgcolor: index % 2 === 1 ? tableRow.zebra : 'background.paper' }}>
                  <TableCell sx={{ fontWeight: 500 }}>{row.teamName}</TableCell>
                  {data.latexTypeCodes.map((code) => (
                    <TableCell key={code} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(row.kgByLatexType[code] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumber(row.totalKg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 700 } }}>
                <TableCell>Tổng cộng</TableCell>
                {data.latexTypeCodes.map((code) => (
                  <TableCell key={code} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumber(data.grandTotalByLatexType[code] ?? 0)}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(data.grandTotalKg)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </SectionPanel>

      <Snackbar open={!!notice} autoHideDuration={3000} onClose={() => setNotice(null)} message={notice} />
    </Stack>
  );
}
