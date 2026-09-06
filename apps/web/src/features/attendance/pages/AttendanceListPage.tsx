import { useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { toIsoDate } from '../../../utils/format';
import { AttendanceFilterBar } from '../components/AttendanceFilterBar';
import { AttendanceTable } from '../components/AttendanceTable';
import { useAttendanceList, useCancelAttendance, useEmployees, useTeams } from '../hooks/useAttendance';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

export function AttendanceListPage() {
  const [teamId, setTeamId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(daysAgoIso(6));
  const [toDate, setToDate] = useState(toIsoDate(new Date()));
  const [attendanceType, setAttendanceType] = useState('');
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () => ({
      teamId: teamId || undefined,
      employeeId: employeeId || undefined,
      fromDate,
      toDate,
      attendanceType: attendanceType || undefined,
      status: status || undefined,
    }),
    [teamId, employeeId, fromDate, toDate, attendanceType, status],
  );

  const { data, isLoading, isError, refetch } = useAttendanceList(filters, 0);
  const { data: teams } = useTeams();
  const { data: employees } = useEmployees(teamId ? { teamId } : undefined);
  const cancelMutation = useCancelAttendance();

  return (
    <Stack spacing={2.5}>
      <AttendanceFilterBar
        teamId={teamId}
        onTeamIdChange={setTeamId}
        employeeId={employeeId}
        onEmployeeIdChange={setEmployeeId}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        attendanceType={attendanceType}
        onAttendanceTypeChange={setAttendanceType}
        status={status}
        onStatusChange={setStatus}
        teams={teams ?? []}
        employees={employees ?? []}
      />

      <SectionPanel title="Danh sách chấm công" noContentPadding>
        <AttendanceTable
          records={data?.content}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onCancel={(id) => cancelMutation.mutate(id)}
        />
      </SectionPanel>
    </Stack>
  );
}
