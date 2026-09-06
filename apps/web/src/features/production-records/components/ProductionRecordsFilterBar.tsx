import { MenuItem, Stack, TextField } from '@mui/material';
import type { TeamOption } from '../../../api/lookups.api';
import { RECORD_STATUS_LABEL } from '../api/productionRecordsList.api';

const selectSx = { minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const dateSx = { minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;

// Bỏ filter "Nhân viên" (khác bản cũ) — bảng giờ aggregate 1 dòng / (Tổ, Ngày), lọc theo 1 nhân
// viên rồi vẫn hiện tổng cả Tổ sẽ gây hiểu nhầm số liệu; Tổ/khoảng ngày/trạng thái vẫn khớp ý nghĩa
// nên giữ nguyên.
export function ProductionRecordsFilterBar({
  teamId,
  onTeamIdChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  status,
  onStatusChange,
  teams,
}: {
  teamId: string;
  onTeamIdChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  teams: TeamOption[];
}) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}>
      <TextField
        select
        size="small"
        label="Tổ"
        value={teamId}
        onChange={(event) => onTeamIdChange(event.target.value)}
        sx={selectSx}
      >
        <MenuItem value="">Tất cả Tổ</MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
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
