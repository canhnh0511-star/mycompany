import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { PayrollRowResponse, PayrollRowStatus, PayrollSummaryResponse, TechnicalGrade } from '@/types/api';
import { usePayrollDetailQuery, usePayrollMutations, usePayrollSummaryQuery } from './usePayroll';

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

function fmtKg(n: number): string {
  return n.toFixed(1);
}

function rowStatusLabel(status: PayrollRowStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'NEEDS_REVIEW':
      return 'Cần kiểm tra';
    case 'MISSING_DATA':
      return 'Thiếu dữ liệu';
  }
}

function rowStatusTone(status: PayrollRowStatus): StatusTone {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'NEEDS_REVIEW':
      return 'warning';
    case 'MISSING_DATA':
      return 'error';
  }
}

const STATUS_CHIPS: { label: string; value: PayrollRowStatus | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Cần kiểm tra', value: 'NEEDS_REVIEW' },
  { label: 'Thiếu dữ liệu', value: 'MISSING_DATA' },
];

const GRADE_OPTIONS: { label: string; value: TechnicalGrade | '' }[] = [
  { label: 'Chưa xếp hạng', value: '' },
  { label: 'Loại A', value: 'A' },
  { label: 'Loại B', value: 'B' },
  { label: 'Loại C', value: 'C' },
];

/**
 * Module 3 — Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md). Layout web/desktop 2 cột: bảng
 * tổng hợp bên trái (chỉ đọc — cùng pattern `ProductionReportScreen`), panel chi tiết bên phải khi
 * bấm 1 dòng (giống ảnh mockup gốc mục 24 spec) — CHỈ ở panel này mới sửa được Trừ/Tạm ứng và Hạng
 * kỹ thuật, không sửa inline trong bảng (tránh AppSelect phá layout bảng nhiều cột).
 * Chưa có "Xuất Excel" — backend `/api/v1/payroll/export` (SHOULD, spec mục 39) chưa implement.
 */
export function PayrollScreen() {
  const { showToast } = useAppToast();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<PayrollRowStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const filters = {
    yearMonth,
    teamId: teamId ?? undefined,
    status: status === 'all' ? undefined : status,
    query: query || undefined,
  };
  const { data: summary, isLoading, isError, error, refetch } = usePayrollSummaryQuery(filters);
  const { lock, unlock } = usePayrollMutations();

  const teamOptions = [{ label: 'Tất cả Tổ', value: '' }, ...(teams ?? []).map((t) => ({ label: t.name, value: t.id }))];

  async function handleToggleLock() {
    if (!summary) return;
    try {
      if (summary.locked) {
        await unlock.mutateAsync(yearMonth);
        showToast({ title: 'Đã mở chốt lương', variant: 'success' });
      } else {
        await lock.mutateAsync(yearMonth);
        showToast({ title: 'Đã chốt lương', variant: 'success' });
      }
    } catch (err) {
      showToast({
        title: 'Thao tác thất bại',
        description: err instanceof ApiError ? err.message : undefined,
        variant: 'error',
      });
    }
  }

  return (
    <HStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <HStack className="items-center justify-between">
            <AppHeading size="xl">Bảng lương</AppHeading>
            {summary ? (
              <AppButton
                variant={summary.locked ? 'outline' : undefined}
                size="sm"
                isLoading={lock.isPending || unlock.isPending}
                onPress={handleToggleLock}
              >
                {summary.locked ? 'Mở chốt lương' : 'Chốt lương'}
              </AppButton>
            ) : null}
          </HStack>

          <HStack space="sm" className="flex-wrap items-end">
            <Box className="w-32">
              <AppInput label="Tháng" value={yearMonth} onChangeText={setYearMonth} placeholder="yyyy-MM" />
            </Box>
            <Box className="w-48">
              <AppSelect
                label="Tổ"
                placeholder="Tất cả Tổ"
                value={teamId}
                options={teamOptions}
                onChange={(v) => setTeamId(v || null)}
              />
            </Box>
            <Box className="w-64">
              <AppInput label="Tìm nhân viên" value={query} onChangeText={setQuery} placeholder="Họ tên công nhân..." />
            </Box>
          </HStack>

          <HStack space="xs" className="flex-wrap">
            {STATUS_CHIPS.map((chip) => (
              <FilterChip
                key={chip.value}
                label={chip.label}
                active={status === chip.value}
                onPress={() => setStatus(chip.value)}
              />
            ))}
          </HStack>

          {summary ? <SummaryCards summary={summary} /> : null}

          {isLoading ? <LoadingState /> : null}
          {isError ? (
            <ErrorState message="Không tải được bảng lương." detail={getErrorMessage(error)} onRetry={refetch} />
          ) : null}
          {summary && summary.rows.length === 0 ? (
            <EmptyState message={`Chưa có nhân viên nào khớp bộ lọc trong ${yearMonth}.`} />
          ) : null}
          {summary && summary.rows.length > 0 ? (
            <PayrollTable rows={summary.rows} selectedEmployeeId={selectedEmployeeId} onSelectRow={setSelectedEmployeeId} />
          ) : null}
        </VStack>
      </ScrollView>

      {selectedEmployeeId ? (
        <PayrollDetailPanel
          employeeId={selectedEmployeeId}
          yearMonth={yearMonth}
          onClose={() => setSelectedEmployeeId(null)}
        />
      ) : null}
    </HStack>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className={`rounded-full px-3 py-1.5 border ${active ? 'bg-primary/10 border-primary' : 'border-border'}`}>
        <AppText size="sm" className={active ? 'text-primary font-medium' : undefined}>
          {label}
        </AppText>
      </Box>
    </Pressable>
  );
}

/** Tổng thực lãnh / số công nhân / cần kiểm tra / trạng thái chốt — 4 số Admin cần thấy ngay
 * (khớp 4 KPI card trên cùng ở ảnh mockup gốc). */
function SummaryCards({ summary }: { summary: PayrollSummaryResponse }) {
  return (
    <HStack space="sm" className="flex-wrap">
      <SummaryCard label="Tổng thực lãnh" value={`${fmtMoney(summary.totalNetPay)} đ`} tone="success" />
      <SummaryCard label="Công nhân" value={`${summary.totalEmployees}`} tone="info" />
      <SummaryCard label="Cần kiểm tra" value={`${summary.needsReviewCount}`} tone="warning" />
      <SummaryCard label="Trạng thái tháng" value={summary.locked ? 'Đã chốt' : 'Chưa chốt'} tone={summary.locked ? 'success' : 'neutral'} />
    </HStack>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: StatusTone }) {
  return (
    <AppCard className="min-w-[160px] flex-1">
      <AppText size="xs" className="text-muted-foreground">
        {label}
      </AppText>
      <AppText size="lg" className={`font-semibold mt-1 ${tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : ''}`}>
        {value}
      </AppText>
    </AppCard>
  );
}

const NAME_COL_WIDTH = 160;
const NUM_COL_WIDTH = 90;

function PayrollTable({
  rows,
  selectedEmployeeId,
  onSelectRow,
}: {
  rows: PayrollRowResponse[];
  selectedEmployeeId: string | null;
  onSelectRow: (employeeId: string) => void;
}) {
  return (
    <AppCard className="p-0 overflow-hidden">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <VStack>
          <HStack className="bg-muted border-b border-border">
            <HeaderCell width={NAME_COL_WIDTH} label="Họ tên công nhân" align="left" />
            <HeaderCell width={110} label="Tổ" align="left" />
            <HeaderCell width={NUM_COL_WIDTH} label="Mủ nước" />
            <HeaderCell width={NUM_COL_WIDTH} label="Mủ tạp" />
            <HeaderCell width={NUM_COL_WIDTH} label="Bồi thuốc" />
            <HeaderCell width={NUM_COL_WIDTH} label="Chuyên cần" />
            <HeaderCell width={NUM_COL_WIDTH} label="Mưa bão" />
            <HeaderCell width={NUM_COL_WIDTH} label="Thời vụ" />
            <HeaderCell width={80} label="Hạng" />
            <HeaderCell width={110} label="Tổng lương" />
            <HeaderCell width={100} label="Tạm ứng" />
            <HeaderCell width={110} label="Thực lãnh" />
            <HeaderCell width={110} label="Trạng thái" align="left" />
          </HStack>

          {rows.map((row, i) => (
            <Pressable key={row.employeeId} onPress={() => onSelectRow(row.employeeId)}>
              <HStack
                className={`items-center ${i > 0 ? 'border-t border-border' : ''} ${
                  selectedEmployeeId === row.employeeId ? 'bg-primary/5' : ''
                }`}
                style={{ minHeight: 44 }}
              >
                <Box style={{ width: NAME_COL_WIDTH }} className="px-2.5 py-1.5">
                  <AppText size="sm" numberOfLines={1}>
                    {row.employeeName}
                  </AppText>
                </Box>
                <Box style={{ width: 110 }} className="px-2.5">
                  <AppText size="sm" className="text-muted-foreground" numberOfLines={1}>
                    {row.teamName}
                  </AppText>
                </Box>
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.waterAmount)}`} />
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.mixedLatexAmount)}`} />
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.medicationAmount)}`} />
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.attendanceAmount)}`} />
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.stormAllowanceAmount)}`} />
                <NumCell width={NUM_COL_WIDTH} value={`${fmtMoney(row.seasonalWorkAmount)}`} />
                <Box style={{ width: 80 }} className="px-2.5 items-end">
                  <AppText size="sm">{row.technicalGrade ?? '—'}</AppText>
                </Box>
                <NumCell width={110} value={fmtMoney(row.totalPay)} bold />
                <NumCell width={100} value={fmtMoney(row.deduction)} />
                <NumCell width={110} value={fmtMoney(row.netPay)} bold tone="success" />
                <Box style={{ width: 110 }} className="px-2.5">
                  <StatusBadge label={rowStatusLabel(row.rowStatus)} tone={rowStatusTone(row.rowStatus)} />
                </Box>
              </HStack>
            </Pressable>
          ))}
        </VStack>
      </ScrollView>
    </AppCard>
  );
}

function HeaderCell({ width, label, align = 'right' }: { width: number; label: string; align?: 'left' | 'right' }) {
  return (
    <Box style={{ width }} className={`px-2.5 py-2.5 ${align === 'right' ? 'items-end' : ''}`}>
      <AppText size="xs" className="text-muted-foreground font-medium">
        {label}
      </AppText>
    </Box>
  );
}

function NumCell({ width, value, bold, tone }: { width: number; value: string; bold?: boolean; tone?: StatusTone }) {
  return (
    <Box style={{ width }} className="px-2.5 items-end">
      <AppText
        size="sm"
        className={`font-mono ${bold ? 'font-semibold' : ''} ${tone === 'success' ? 'text-success' : ''}`}
      >
        {value}
      </AppText>
    </Box>
  );
}

/**
 * Panel chi tiết 1 nhân viên — breakdown "số lượng × đơn giá = thành tiền" (drill-down, spec mục 4),
 * kèm sửa Trừ/Tạm ứng + Hạng kỹ thuật ĐÚNG cho tháng đang xem (mục 2.2/2.6 — không ảnh hưởng tháng
 * khác). "Xem ảnh gốc"/"In phiếu lương" (LATER, mục 5 spec) chưa có ở v1.
 */
function PayrollDetailPanel({
  employeeId,
  yearMonth,
  onClose,
}: {
  employeeId: string;
  yearMonth: string;
  onClose: () => void;
}) {
  const { showToast } = useAppToast();
  const { data: detail, isLoading, isError, error } = usePayrollDetailQuery(employeeId, yearMonth);
  const { updateDeduction, updateTechnicalGrade } = usePayrollMutations();

  const [deductionInput, setDeductionInput] = useState('');

  // Đồng bộ lại state cục bộ mỗi khi mở panel cho nhân viên/tháng khác, hoặc detail vừa tải xong —
  // không giữ giá trị cũ của nhân viên trước.
  useEffect(() => {
    if (detail) {
      setDeductionInput(String(Math.round(detail.deduction)));
    }
  }, [detail?.employeeId, detail?.yearMonth, detail?.deduction]);

  async function handleSaveDeduction() {
    const amount = Number(deductionInput);
    if (!deductionInput || Number.isNaN(amount) || amount < 0) {
      showToast({ title: 'Số tiền không hợp lệ', variant: 'error' });
      return;
    }
    try {
      await updateDeduction.mutateAsync({ employeeId, yearMonth, amount });
      showToast({ title: 'Đã lưu Trừ/Tạm ứng', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Lưu thất bại', description: err instanceof ApiError ? err.message : undefined, variant: 'error' });
    }
  }

  async function handleChangeGrade(value: string) {
    const grade = (value || null) as TechnicalGrade | null;
    try {
      await updateTechnicalGrade.mutateAsync({ employeeId, yearMonth, grade });
      showToast({ title: 'Đã cập nhật hạng kỹ thuật', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Cập nhật thất bại', description: err instanceof ApiError ? err.message : undefined, variant: 'error' });
    }
  }

  return (
    <Box className="w-96 border-l border-border bg-background">
      <ScrollView contentContainerClassName="p-4">
        <VStack space="md">
          <HStack className="items-center justify-between">
            <AppHeading size="lg">{detail?.employeeName ?? 'Chi tiết'}</AppHeading>
            <Pressable onPress={onClose}>
              <AppText size="lg" className="text-muted-foreground">
                ✕
              </AppText>
            </Pressable>
          </HStack>

          {isLoading ? <LoadingState /> : null}
          {isError ? <ErrorState message="Không tải được chi tiết." detail={getErrorMessage(error)} /> : null}

          {detail ? (
            <>
              <HStack className="items-center justify-between">
                <AppText size="sm" className="text-muted-foreground">
                  {`${detail.teamName} · ${detail.yearMonth}`}
                </AppText>
                <StatusBadge label={rowStatusLabel(detail.rowStatus)} tone={rowStatusTone(detail.rowStatus)} />
              </HStack>

              <AppCard className="p-0 overflow-hidden">
                {detail.lines.length === 0 ? (
                  <Box className="p-3">
                    <AppText size="sm" className="text-muted-foreground">
                      Chưa có khoản nào trong tháng này.
                    </AppText>
                  </Box>
                ) : (
                  detail.lines.map((line, i) => (
                    <HStack
                      key={line.label}
                      className={`items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}
                    >
                      <VStack className="flex-1">
                        <AppText size="sm">{line.label}</AppText>
                        <AppText size="xs" className="text-muted-foreground">
                          {`${fmtKg(line.quantity)} ${line.unit} × ${fmtMoney(line.unitPrice)}đ`}
                        </AppText>
                      </VStack>
                      <AppText size="sm" className="font-mono">{`${fmtMoney(line.amount)}đ`}</AppText>
                    </HStack>
                  ))
                )}
              </AppCard>

              <VStack space="xs">
                <AppText size="xs" className="text-muted-foreground">
                  Hạng kỹ thuật (chỉ áp dụng tháng {detail.yearMonth})
                </AppText>
                <AppSelect
                  placeholder="Chưa xếp hạng"
                  value={detail.technicalGrade ?? ''}
                  options={GRADE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  onChange={handleChangeGrade}
                />
              </VStack>

              <VStack space="xs">
                <AppInput
                  label="Trừ / Tạm ứng"
                  value={deductionInput}
                  onChangeText={setDeductionInput}
                  keyboardType="numeric"
                />
                {!detail.deductionIsOverride ? (
                  <AppText size="xs" className="text-muted-foreground">
                    Đang dùng mức mặc định hệ thống — sửa và Lưu để áp dụng riêng cho nhân viên này.
                  </AppText>
                ) : null}
                <AppButton size="sm" variant="outline" isLoading={updateDeduction.isPending} onPress={handleSaveDeduction}>
                  Lưu Trừ/Tạm ứng
                </AppButton>
              </VStack>

              <Box className="border-t border-border pt-3">
                <HStack className="items-center justify-between">
                  <AppText className="font-semibold">Tổng lương</AppText>
                  <AppText className="font-mono">{`${fmtMoney(detail.totalPay)}đ`}</AppText>
                </HStack>
                <HStack className="items-center justify-between mt-1">
                  <AppText className="font-semibold">Trừ/Tạm ứng</AppText>
                  <AppText className="font-mono text-destructive">{`- ${fmtMoney(detail.deduction)}đ`}</AppText>
                </HStack>
                <HStack className="items-center justify-between mt-1">
                  <AppText className="font-semibold">Thực lãnh</AppText>
                  <AppText className="font-mono font-semibold text-success">{`${fmtMoney(detail.netPay)}đ`}</AppText>
                </HStack>
              </Box>
            </>
          ) : null}
        </VStack>
      </ScrollView>
    </Box>
  );
}
