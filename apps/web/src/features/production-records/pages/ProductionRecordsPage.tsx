import { useMemo, useState } from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { toIsoDate } from '../../../utils/format';
import { ProductionRecordsFilterBar } from '../components/ProductionRecordsFilterBar';
import { ProductionRecordsTable } from '../components/ProductionRecordsTable';
import { ProductionRecordDetailPanel } from '../components/ProductionRecordDetailPanel';
import { useEmployees, useProductionRecordsList, useTeams } from '../hooks/useProductionRecordsList';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

/**
 * Danh sách phiếu (/san-luong) — tra cứu/lọc/duyệt/hủy Production Records + xem lịch sử chỉnh sửa.
 * Path giữ nguyên từ nav cũ (`TeamStatusPanel` ở Home deep-link `/san-luong?date=...`) — đọc
 * `date` từ query string để mặc định khoảng ngày = đúng ngày đó khi đi từ Home vào.
 */
export function ProductionRecordsPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const [teamId, setTeamId] = useState(searchParams.get('teamId') ?? '');
  const [employeeId, setEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(dateParam ?? daysAgoIso(6));
  const [toDate, setToDate] = useState(dateParam ?? toIsoDate(new Date()));
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canShowInlinePanel = useMediaQuery('(min-width:1440px)');

  const filters = useMemo(
    () => ({
      teamId: teamId || undefined,
      employeeId: employeeId || undefined,
      fromDate,
      toDate,
      status: status || undefined,
    }),
    [teamId, employeeId, fromDate, toDate, status],
  );

  const { data, isLoading, isError, refetch } = useProductionRecordsList(filters, 0);
  const { data: teams } = useTeams();
  const { data: employees } = useEmployees(teamId ? { teamId } : undefined);

  return (
    <Stack spacing={2.5}>
      <ProductionRecordsFilterBar
        teamId={teamId}
        onTeamIdChange={setTeamId}
        employeeId={employeeId}
        onEmployeeIdChange={setEmployeeId}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        status={status}
        onStatusChange={setStatus}
        teams={teams ?? []}
        employees={employees ?? []}
      />

      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionPanel title="Danh sách phiếu" noContentPadding>
            <ProductionRecordsTable
              records={data?.content}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </SectionPanel>
        </Box>
        {selectedId && canShowInlinePanel && (
          <ProductionRecordDetailPanel recordId={selectedId} onClose={() => setSelectedId(null)} variant="inline" />
        )}
      </Stack>

      {selectedId && !canShowInlinePanel && (
        <ProductionRecordDetailPanel recordId={selectedId} onClose={() => setSelectedId(null)} variant="drawer" />
      )}
    </Stack>
  );
}
