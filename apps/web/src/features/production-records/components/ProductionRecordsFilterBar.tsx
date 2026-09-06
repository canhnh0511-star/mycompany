import { MenuItem, Stack, TextField } from '@mui/material';
import type { EmployeeOption, TeamOption } from '../../../api/lookups.api';
import { RECORD_STATUS_LABEL } from '../api/productionRecordsList.api';

const selectSx = { minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const dateSx = { minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;

export function ProductionRecordsFilterBar({
  teamId,
  onTeamIdChange,
  employeeId,
  onEmployeeIdChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
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
          onEmployeeIdChange(''); // đổi Tổ -> reset Nhân viên đã chọn (khác Tổ mới thì không còn hợp lệ)
        }}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả Tổ</MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Nhân viên"
        value={employeeId}
        onChange={(event) => onEmployeeIdChange(event.target.value)}
        sx={selectSx}
      >
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

      <TextField
        select
        size="small"
        label="Trạng thái"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả</MenuItem>
        {Object.entries(RECORD_STATUS_LABEL).map(([value, label]) => (
          <MenuItem key={value} value={value}>{label}</MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
