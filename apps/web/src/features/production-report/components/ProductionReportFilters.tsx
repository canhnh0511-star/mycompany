import { useState } from 'react';
import { Button, Chip, MenuItem, Stack, TextField } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import Menu from '@mui/material/Menu';
import type { TeamOption } from '../../../api/lookups.api';
import type { QuickRange } from '../hooks/useProductionReportFilters';

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'last7', label: '7 ngày gần nhất' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
];

const dateSx = { minWidth: 150, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const selectSx = { minWidth: 170, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;

export function ProductionReportFilters({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onQuickRange,
  teamId,
  onTeamIdChange,
  teams,
  onExport,
  exporting,
}: {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onQuickRange: (quick: QuickRange) => void;
  teamId: string;
  onTeamIdChange: (value: string) => void;
  teams: TeamOption[];
  onExport: (kind: 'xlsx' | 'pdf' | 'csv') => void;
  exporting: boolean;
}) {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const activeTeam = teams.find((t) => t.id === teamId);

  return (
    <Stack spacing={1.5}>
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
        <TextField select size="small" label="Tổ" value={teamId} onChange={(event) => onTeamIdChange(event.target.value)} sx={selectSx}>
          <MenuItem value="">Tất cả Tổ</MenuItem>
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Loại phiếu"
          value=""
          sx={selectSx}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">Tất cả loại phiếu</MenuItem>
        </TextField>

        <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={exporting}
            onClick={(event) => setExportAnchor(event.currentTarget)}
          >
            Xuất báo cáo
          </Button>
          <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => { setExportAnchor(null); onExport('xlsx'); }}>Excel</MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); onExport('pdf'); }}>PDF</MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); onExport('csv'); }}>CSV</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {QUICK_RANGES.map((range) => (
          <Chip key={range.value} label={range.label} size="small" variant="outlined" onClick={() => onQuickRange(range.value)} />
        ))}
        {activeTeam && (
          <Chip
            label={`Tổ: ${activeTeam.name}`}
            size="small"
            color="success"
            onDelete={() => onTeamIdChange('')}
            sx={{ ml: 1 }}
          />
        )}
      </Stack>
    </Stack>
  );
}
