import { useMemo, useState } from 'react';
import { Box, Snackbar, Stack, Typography, useMediaQuery } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { formatMonthLabel } from '../../../utils/format';
import { PayrollKpiRow } from '../components/PayrollKpiRow';
import { PayrollFilterBar } from '../components/PayrollFilterBar';
import { PayrollTable } from '../components/PayrollTable';
import { PayrollDetailPanel } from '../components/PayrollDetailPanel';
import {
  useExportPayrollXlsx,
  useLockPayrollMutation,
  usePayrollSummary,
  useTeams,
  useUnlockPayrollMutation,
} from '../hooks/usePayroll';
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
  // Ngưỡng 1440px (UI audit vòng 2): đủ rộng để đứng cạnh bảng lương (minWidth 1400) + panel 380px
  // mà không tràn ngang kép. Dưới ngưỡng này panel chuyển sang Drawer thay vì chiếm chỗ cố định.
  const canShowInlinePanel = useMediaQuery('(min-width:1440px)');

  const filters = useMemo(
    () => ({ yearMonth, teamId: teamId || undefined, status: status || undefined, query: query || undefined }),
    [yearMonth, teamId, status, query],
  );

  const { data: summary, isLoading, isError, refetch } = usePayrollSummary(filters);
  const { data: teams } = useTeams();
  const lockMutation = useLockPayrollMutation();
  const unlockMutation = useUnlockPayrollMutation();
  const exportMutation = useExportPayrollXlsx();

  const locked = summary?.locked ?? false;

  async function handleExport() {
    try {
      await exportMutation.mutateAsync(filters);
    } catch {
      setNotice('Xuất Excel thất bại, thử lại giúp tôi.');
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {formatMonthLabel(yearMonth)} · Kiểm tra nhanh toàn bộ thành phần lương theo từng công nhân
        </Typography>
      </Box>

      <PayrollKpiRow summary={summary} isLoading={isLoading} />

      {/* Breakpoint khớp với breakpoint nội bộ của PayrollFilterBar (md) — UI audit vòng 3: trước
          đây khối này chỉ xuống dòng ở `lg` (1200px) trong khi filter bar bên trong đã chuyển
          sang row đủ 4 field từ `md` (900px), tạo 1 khoảng rộng 900-1199px vừa đủ để mọi thứ cố
          nhồi 1 hàng ngang (filter bar row + nút "Chốt lương") mà không có chỗ co giãn, dễ vỡ layout. */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
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
            onExport={handleExport}
            exporting={exportMutation.isPending}
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
        {selectedEmployeeId && canShowInlinePanel && (
          <PayrollDetailPanel
            employeeId={selectedEmployeeId}
            yearMonth={yearMonth}
            locked={locked}
            onClose={() => setSelectedEmployeeId(null)}
            variant="inline"
          />
        )}
      </Stack>

      {selectedEmployeeId && !canShowInlinePanel && (
        <PayrollDetailPanel
          employeeId={selectedEmployeeId}
          yearMonth={yearMonth}
          locked={locked}
          onClose={() => setSelectedEmployeeId(null)}
          variant="drawer"
        />
      )}

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
