import { useState } from 'react';
import { Box, Snackbar, Stack } from '@mui/material';
import { ProductionReportHeader } from '../components/ProductionReportHeader';
import { ProductionKpiRow } from '../components/ProductionKpiRow';
import { ProductionTrendChart } from '../components/ProductionTrendChart';
import { RubberTypeDonut } from '../components/RubberTypeDonut';
import { TeamPerformanceTable } from '../components/TeamPerformanceTable';
import { TopWorkersTable } from '../components/TopWorkersTable';
import { ProductionAlertsPanel } from '../components/ProductionAlertsPanel';
import { DataCompletenessCard } from '../components/DataCompletenessCard';
import { ProductionHeatmap } from '../components/ProductionHeatmap';
import { ProductionDayDrawer } from '../components/ProductionDayDrawer';
import { ProductionWorkerDrawer } from '../components/ProductionWorkerDrawer';
import { useProductionReportFilters } from '../hooks/useProductionReportFilters';
import { useProductionDashboard } from '../hooks/useProductionReport';
import { useTeams } from '../../../hooks/useLookups';
import { useExportProductionPdf, useExportProductionXlsx } from '../../reports/hooks/useReports';
import { downloadCsv } from '../utils/csvExport';
import type { ProductionAlert } from '../types/productionReport.types';

// Grid theo spec §3.2 (desktop >=1440) / §16 (breakpoint hẹp hơn) — repeat(12,1fr), span như mockup.
const gridSx = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
};

export function ProductionReportPage() {
  const { fromDate, setFromDate, toDate, setToDate, teamId, setTeamId, applyQuickRange, filters } =
    useProductionReportFilters();
  const { data: teams } = useTeams();
  const { data: dashboard } = useProductionDashboard(filters);
  const exportXlsx = useExportProductionXlsx();
  const exportPdf = useExportProductionPdf();
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<{ date: string; teamId?: string } | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  async function handleExport(kind: 'xlsx' | 'pdf' | 'csv') {
    try {
      if (kind === 'csv') {
        if (!dashboard) return;
        const rows: (string | number)[][] = [
          ['Tổ', 'Sản lượng (kg)', 'Nhân công', 'BQ/người (kg)', '% thay đổi', 'Trạng thái'],
          ...dashboard.teamPerformance.map((t) => [
            t.teamName,
            t.productionKg,
            t.workerCount,
            t.averagePerWorkerKg ?? '',
            t.changePercent ?? '',
            t.status,
          ]),
        ];
        downloadCsv(`bao-cao-san-luong-${fromDate}-${toDate}.csv`, rows);
        return;
      }
      await (kind === 'xlsx' ? exportXlsx : exportPdf).mutateAsync({ fromDate, toDate, teamId: teamId || undefined });
    } catch {
      setNotice('Xuất file thất bại, thử lại giúp tôi.');
    }
  }

  function handleAlertClick(alert: ProductionAlert) {
    if (alert.linkType === 'TEAM' && alert.linkTeamId) {
      setTeamId(alert.linkTeamId);
    } else if (alert.linkType === 'DATE' && alert.linkDate) {
      setSelectedDay({ date: alert.linkDate, teamId: alert.linkTeamId ?? undefined });
    } else if (alert.linkType === 'SCAN_BATCH' && alert.linkDate) {
      setSelectedDay({ date: alert.linkDate, teamId: alert.linkTeamId ?? undefined });
    }
  }

  return (
    <Stack spacing={2.5}>
      <ProductionReportHeader
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onQuickRange={applyQuickRange}
        teamId={teamId}
        onTeamIdChange={setTeamId}
        teams={teams ?? []}
        onExport={handleExport}
        exporting={exportXlsx.isPending || exportPdf.isPending}
      />

      <ProductionKpiRow filters={filters} />

      <Box sx={gridSx}>
        <Box sx={{ gridColumn: { md: 'span 8' } }}>
          <ProductionTrendChart filters={filters} onDayClick={(date) => setSelectedDay({ date })} />
        </Box>
        <Box sx={{ gridColumn: { md: 'span 4' } }}>
          <RubberTypeDonut filters={filters} />
        </Box>

        <Box sx={{ gridColumn: { md: 'span 5' } }}>
          <TeamPerformanceTable filters={filters} onSelectTeam={setTeamId} />
        </Box>
        <Box sx={{ gridColumn: { md: 'span 3' } }}>
          <TopWorkersTable filters={filters} onSelectWorker={setSelectedWorkerId} />
        </Box>
        <Box sx={{ gridColumn: { md: 'span 4' } }}>
          <ProductionAlertsPanel filters={filters} onAlertClick={handleAlertClick} />
        </Box>

        <Box sx={{ gridColumn: { md: 'span 4' } }}>
          <DataCompletenessCard filters={filters} />
        </Box>
        <Box sx={{ gridColumn: { md: 'span 8' } }}>
          <ProductionHeatmap filters={filters} onCellClick={(team, date) => setSelectedDay({ date, teamId: team })} />
        </Box>
      </Box>

      <ProductionDayDrawer
        date={selectedDay?.date ?? null}
        teamId={selectedDay?.teamId ?? null}
        data={dashboard}
        onClose={() => setSelectedDay(null)}
      />
      <ProductionWorkerDrawer employeeId={selectedWorkerId} filters={filters} onClose={() => setSelectedWorkerId(null)} />

      <Snackbar open={!!notice} autoHideDuration={3000} onClose={() => setNotice(null)} message={notice} />
    </Stack>
  );
}
