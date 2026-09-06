import { MenuItem, Stack, TextField } from '@mui/material';
import type { EmployeeOption, TeamOption } from '../../../api/lookups.api';
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_TYPES, ATTENDANCE_TYPE_LABEL } from '../api/attendance.api';

const selectSx = { minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const dateSx = { minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;

export function AttendanceFilterBar({
  teamId,
  onTeamIdChange,
  employeeId,
  onEmployeeIdChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  attendanceType,
  onAttendanceTypeChange,
  status,
  onStatusChange,
  teams,
  employees,
}: {
  teamId: string;
  onTeamIdChange: (value: string) => void;
  employeeId: string;
  onEmployeeIdChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  attendanceType: string;
  onAttendanceTypeChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  teams: TeamOption[];
  employees: EmployeeOption[];
}) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}>
      <TextField
        select
        size="small"
        label="Tổ"
        value={teamId}
        onChange={(event) => {
          onTeamIdChange(event.target.value);
          onEmployeeIdChange('');
        }}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả Tổ</MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
        ))}
      </TextField>
      <TextField select size="small" label="Nhân viên" value={employeeId} onChange={(event) => onEmployeeIdChange(event.target.value)} sx={selectSx}>
        <MenuItem value="">Tất cả</MenuItem>
        {employees.map((emp) => (
          <MenuItem key={emp.id} value={emp.id}>{emp.fullName}</MenuItem>
        ))}
      </TextField>
      <TextField
        type="date"
        size="small"
        label="Từ ngày"
        value={fromDate}
        onChange={(event) => onFromDateChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={dateSx}
      />
      <TextField
        type="date"
        size="small"
        label="Đến ngày"
        value={toDate}
        onChange={(event) => onToDateChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={dateSx}
      />
      <TextField select size="small" label="Loại" value={attendanceType} onChange={(event) => onAttendanceTypeChange(event.target.value)} sx={selectSx}>
        <MenuItem value="">Tất cả</MenuItem>
        {ATTENDANCE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>{ATTENDANCE_TYPE_LABEL[type]}</MenuItem>
        ))}
      </TextField>
      <TextField select size="small" label="Trạng thái" value={status} onChange={(event) => onStatusChange(event.target.value)} sx={selectSx}>
        <MenuItem value="">Tất cả</MenuItem>
        {Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => (
          <MenuItem key={value} value={value}>{label}</MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
