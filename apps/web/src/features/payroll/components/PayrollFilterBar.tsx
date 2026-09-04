import { Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { neutral } from '../../../theme/colors';
import { PAYROLL_ROW_STATUS_LABEL } from '../model/payroll.types';
import type { TeamOption } from '../api/payroll.api';
import { MonthSelector } from './MonthSelector';

const selectSx = {
  minWidth: 160,
  '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
} as const;

export function PayrollFilterBar({
  yearMonth,
  onYearMonthChange,
  teamId,
  onTeamIdChange,
  status,
  onStatusChange,
  query,
  onQueryChange,
  teams,
  onExport,
}: {
  yearMonth: string;
  onYearMonthChange: (value: string) => void;
  teamId: string;
  onTeamIdChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  teams: TeamOption[];
  onExport: () => void;
}) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
      <MonthSelector value={yearMonth} onChange={onYearMonthChange} />

      <TextField
        select
        size="small"
        value={teamId}
        onChange={(event) => onTeamIdChange(event.target.value)}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả Tổ</MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>
            {team.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        sx={selectSx}
      >
        <MenuItem value="">Trạng thái</MenuItem>
        {Object.entries(PAYROLL_ROW_STATUS_LABEL).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        placeholder="Tìm kiếm theo họ tên công nhân..."
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: neutral[400] }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Button
        variant="contained"
        color="success"
        startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
        onClick={onExport}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Xuất bảng lương
      </Button>
    </Stack>
  );
}
