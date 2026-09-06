import { Button, MenuItem, Stack, TextField } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import type { EmployeeOption, TeamOption } from '../../../api/lookups.api';

const selectSx = { minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const dateSx = { minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;

export function ReportFilterBar({
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  teamId,
  onTeamIdChange,
  employeeId,
  onEmployeeIdChange,
  teams,
  employees,
  onExportXlsx,
  onExportPdf,
  exporting,
}: {
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  teamId: string;
  onTeamIdChange: (value: string) => void;
  employeeId?: string;
  onEmployeeIdChange?: (value: string) => void;
  teams: TeamOption[];
  employees?: EmployeeOption[];
  onExportXlsx: () => void;
  onExportPdf: () => void;
  exporting: boolean;
}) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}>
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
        label="Tổ"
        value={teamId}
        onChange={(event) => {
          onTeamIdChange(event.target.value);
          onEmployeeIdChange?.('');
        }}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả Tổ</MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
        ))}
      </TextField>
      {employees && onEmployeeIdChange && (
        <TextField select size="small" label="Nhân viên" value={employeeId} onChange={(event) => onEmployeeIdChange(event.target.value)} sx={selectSx}>
          <MenuItem value="">Tất cả</MenuItem>
          {employees.map((emp) => (
            <MenuItem key={emp.id} value={emp.id}>{emp.fullName}</MenuItem>
          ))}
        </TextField>
      )}
      <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
        <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={exporting} onClick={onExportXlsx}>
          Excel
        </Button>
        <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={exporting} onClick={onExportPdf}>
          PDF
        </Button>
      </Stack>
    </Stack>
  );
}
