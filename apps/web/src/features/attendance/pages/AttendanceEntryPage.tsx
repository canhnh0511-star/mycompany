import { useState } from 'react';
import { Box, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { neutral } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import { toIsoDate } from '../../../utils/format';
import { useTeams } from '../../../hooks/useLookups';
import { AttendanceRosterTable } from '../components/AttendanceRosterTable';

/** Ngày làm việc — chọn Tổ+Ngày -> roster cố định, KHÔNG có OCR (chỉ nhập tay, CLAUDE.md không đề
 * cập luồng ảnh cho chấm công) nên không có control "Tải ảnh phiếu"/cột ảnh bên phải như Nhập phiếu
 * hàng ngày/Bán mủ. */
export function AttendanceEntryPage() {
  const [recordDate, setRecordDate] = useState(toIsoDate(new Date()));
  const [teamId, setTeamId] = useState('');
  const { data: teams } = useTeams();

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: `${uiTokens.radius.panel}px`, boxShadow: uiTokens.shadow.panel }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-end' }, p: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Ngày *</Typography>
            <TextField
              type="date"
              size="small"
              value={recordDate}
              onChange={(event) => event.target.value && setRecordDate(event.target.value)}
              sx={{ minWidth: 170 }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Tổ *</Typography>
            <TextField select size="small" value={teamId} onChange={(event) => setTeamId(event.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Chọn Tổ…</MenuItem>
              {(teams ?? []).map((team) => (
                <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Stack>
      </Paper>

      {!teamId ? (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontSize: 13.5, border: `1px dashed ${neutral[200]}`, borderRadius: '12px' }}>
          Chọn Tổ và Ngày để chấm công.
        </Box>
      ) : (
        <SectionPanel title="Chấm công" noContentPadding>
          <AttendanceRosterTable teamId={teamId} recordDate={recordDate} />
        </SectionPanel>
      )}
    </Stack>
  );
}
