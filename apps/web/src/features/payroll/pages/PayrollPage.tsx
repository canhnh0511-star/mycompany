import { useMemo, useState } from 'react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { formatMonthLabel } from '../../../utils/format';
import { PayrollKpiRow } from '../components/PayrollKpiRow';
import { PayrollFilterBar } from '../components/PayrollFilterBar';
import { PayrollTable } from '../components/PayrollTable';
import { PayrollDetailPanel } from '../components/PayrollDetailPanel';
import { usePayrollSummary, useTeams, useLockPayrollMutation, useUnlockPayrollMutation } from '../hooks/usePayroll';
import { toIsoDate } from '../../../utils/format';

function currentMonthKey(): string {
  return toIsoDate(new Date()).slice(0, 7);
}

/**
 * Bảng lương — Module 3 (docs/specs/spec-3-bang-luong-v1-draft.md). Đối chiếu 2 ảnh mockup Admin
 * chia sẻ: KPI row 4 thẻ, filter bar (tháng/Tổ/trạng thái/tìm kiếm), bảng chính 2 hàng header, panel
 * chi tiết bên phải khi click 1 dòng. Backend đã có đầy đủ (PayrollController), gọi thẳng — không
 * dùng fixture dev như panel Home (viết trước khi Module 3 tồn tại).
 */
export function PayrollPage() {
  const [yearMonth, setYearMonth] = useState(currentMonthKey());
  const [teamId, setTeamId] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filters = useMemo(
    () => ({ yearMonth, teamId: teamId || undefined, status: status || undefined, query: query || undefined }),
    [yearMonth, teamId, status, query],
  );

  const { data: summary, isLoading, isError, refetch } = usePayrollSummary(filters);
  const { data: teams } = useTeams();
  const lockMutation = useLockPayrollMutation();
  const unlockMutation = useUnlockPayrollMutation();

  const locked = summary?.locked ?? false;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {formatMonthLabel(yearMonth)} · Kiểm tra nhanh toàn bộ thành phần lương theo từng công nhân
        </Typography>
      </Box>

      <PayrollKpiRow summary={summary} isLoading={isLoading} />

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ alignItems: { lg: 'center' }, justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <PayrollFilterBar
            yearMonth={yearMonth}
            onYearMonthChange={setYearMonth}
            teamId={teamId}
            onTeamIdChange={setTeamId}
            status={status}
            onStatusChange={setStatus}
            query={query}
            onQueryChange={setQuery}
            teams={teams ?? []}
            onExport={() => setNotice('Xuất Excel sẽ có ở phiên bản sau.')}
          />
        </Box>
        <LoadingButton
          variant={locked ? 'outlined' : 'contained'}
          color={locked ? 'inherit' : 'success'}
          startIcon={locked ? <LockOpenOutlinedIcon /> : <LockOutlinedIcon />}
          loading={lockMutation.isPending || unlockMutation.isPending}
          onClick={() => (locked ? unlockMutation.mutate(yearMonth) : lockMutation.mutate(yearMonth))}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {locked ? 'Mở khóa' : 'Chốt lương'}
        </LoadingButton>
      </Stack>

      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PayrollTable
            summary={summary}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />
        </Box>
        {selectedEmployeeId && (
          <PayrollDetailPanel
            employeeId={selectedEmployeeId}
            yearMonth={yearMonth}
            locked={locked}
            onClose={() => setSelectedEmployeeId(null)}
          />
        )}
      </Stack>

      <Snackbar
        open={!!notice}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
