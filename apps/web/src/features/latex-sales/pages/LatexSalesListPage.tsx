import { useMemo, useState } from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { toIsoDate } from '../../../utils/format';
import { LatexSalesFilterBar } from '../components/LatexSalesFilterBar';
import { LatexSalesTable } from '../components/LatexSalesTable';
import { LatexSaleDetailPanel } from '../components/LatexSaleDetailPanel';
import { useLatexSalesList, useTeams } from '../hooks/useLatexSales';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

export function LatexSalesListPage() {
  const [teamId, setTeamId] = useState('');
  const [fromDate, setFromDate] = useState(daysAgoIso(6));
  const [toDate, setToDate] = useState(toIsoDate(new Date()));
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canShowInlinePanel = useMediaQuery('(min-width:1440px)');

  const filters = useMemo(
    () => ({ teamId: teamId || undefined, fromDate, toDate, status: status || undefined }),
    [teamId, fromDate, toDate, status],
  );

  const { data, isLoading, isError, refetch } = useLatexSalesList(filters, 0);
  const { data: teams } = useTeams();

  return (
    <Stack spacing={2.5}>
      <LatexSalesFilterBar
        teamId={teamId}
        onTeamIdChange={setTeamId}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        status={status}
        onStatusChange={setStatus}
        teams={teams ?? []}
      />

      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionPanel title="Danh sách phiếu bán mủ" noContentPadding>
            <LatexSalesTable
              sales={data?.content}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </SectionPanel>
        </Box>
        {selectedId && canShowInlinePanel && (
          <LatexSaleDetailPanel saleId={selectedId} onClose={() => setSelectedId(null)} variant="inline" />
        )}
      </Stack>

      {selectedId && !canShowInlinePanel && (
        <LatexSaleDetailPanel saleId={selectedId} onClose={() => setSelectedId(null)} variant="drawer" />
      )}
    </Stack>
  );
}
