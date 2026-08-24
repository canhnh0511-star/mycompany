import { useState } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge } from '@/components/StatusBadge';
import { useTeamsLookupQuery, useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { addDaysIso, todayIsoDate } from '@/features/reports/dateRange';
import { derivedTeamStatusLabel, derivedTeamStatusNeedsAction, derivedTeamStatusTone } from '@/lib/status';
import { useProductionSummaryDailyQuery } from './useProductionSummary';
import type { TeamProductionSummary } from '@/types/api';

function formatDateVn(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Tab "Sản lượng" v2 (Phase 5, Spec 2 docs/specs/spec-2-san-luong-v2.md) — thay thế hoàn toàn
 * `LookupScreen` cũ (browse phẳng production_records/latex_sales, kể cả DRAFT). Đây là quyết định có
 * chủ đích của plan (docs/plans/0021...) chứ không phải bỏ sót: Spec 2 §0 xác định rõ màn này "không
 * phải màn hình nhập liệu chính" — chỉ tổng hợp/drill-down dữ liệu ĐÃ XÁC NHẬN (Official Production).
 * Xem/sửa DRAFT giờ thuộc luồng "Phiếu" (Chụp phiếu → Batch Review, hoặc Nhập tay nhanh), không còn ở
 * tab này — tránh 2 nơi cùng cho phép thao tác dữ liệu chưa duyệt (đúng tinh thần §2 "single source
 * of truth", tránh nhầm lẫn draft/official).
 *
 * Mặc định mở Ngày = Hôm nay, Tổ = Tất cả, Loại mủ = Tất cả (§7) — không bắt chọn filter trước.
 */
export function ProductionSummaryScreen() {
  const router = useRouter();
  const [workDate, setWorkDate] = useState(todayIsoDate());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [latexTypeCode, setLatexTypeCode] = useState<string | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const { data: latexTypes } = useLatexTypesLookupQuery();

  const query = useProductionSummaryDailyQuery({
    workDate,
    teamId: teamId ?? undefined,
    latexTypeCode: latexTypeCode ?? undefined,
  });

  const teamOptions = [{ label: 'Tất cả Tổ', value: '' }, ...(teams ?? []).map((t) => ({ label: t.name, value: t.id }))];
  const latexTypeOptions = [
    { label: 'Tất cả loại mủ', value: '' },
    ...(latexTypes ?? []).map((lt) => ({ label: lt.label, value: lt.code })),
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
    >
      <VStack space="md">
        <AppHeading size="xl">Sản lượng</AppHeading>

        {/* Date navigation — Previous/Next/Hôm nay, KHÔNG bắt mở date picker chỉ để lùi/tiến 1 ngày
            (Spec 2 §8). */}
        <HStack space="sm" className="items-center justify-between">
          <Pressable onPress={() => setWorkDate((d) => addDaysIso(d, -1))} hitSlop={8}>
            <AppText size="lg" className="text-primary px-2">
              ‹
            </AppText>
          </Pressable>
          <Pressable onPress={() => setWorkDate(todayIsoDate())}>
            <VStack className="items-center">
              <AppText className="font-semibold">{formatDateVn(workDate)}</AppText>
              {workDate !== todayIsoDate() ? (
                <AppText size="xs" className="text-primary">
                  Về hôm nay
                </AppText>
              ) : null}
            </VStack>
          </Pressable>
          <Pressable onPress={() => setWorkDate((d) => addDaysIso(d, 1))} hitSlop={8}>
            <AppText size="lg" className="text-primary px-2">
              ›
            </AppText>
          </Pressable>
        </HStack>

        <HStack space="sm">
          <Box className="flex-1">
            <AppSelect placeholder="Tất cả Tổ" value={teamId} options={teamOptions} onChange={(v) => setTeamId(v || null)} />
          </Box>
          <Box className="flex-1">
            <AppSelect
              placeholder="Tất cả loại mủ"
              value={latexTypeCode}
              options={latexTypeOptions}
              onChange={(v) => setLatexTypeCode(v || null)}
            />
          </Box>
        </HStack>

        {query.isLoading ? <LoadingState label="Đang tải sản lượng..." /> : null}
        {query.isError ? (
          <ErrorState
            message="Không thể tải dữ liệu sản lượng."
            detail={getErrorMessage(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : null}

        {!query.isLoading && !query.isError && query.data ? (
          <ProductionSummaryContent
            data={query.data}
            workDate={workDate}
            latexTypeCode={latexTypeCode}
            onTeamPress={(team) =>
              router.push({
                pathname: '/production-summary/team/[teamId]',
                params: { teamId: team.teamId, workDate, ...(latexTypeCode ? { latexTypeCode } : {}) },
              })
            }
            onResolvePress={(team) => {
              const batchId = team.activeSupplementInfo?.batchId ?? team.primaryBatchId;
              if (batchId) router.push(`/scan-batch-review/${batchId}`);
            }}
            onCapturePress={() => router.push('/(tabs)/phieu')}
          />
        ) : null}
      </VStack>
    </ScrollView>
  );
}

function ProductionSummaryContent({
  data,
  workDate,
  latexTypeCode,
  onTeamPress,
  onResolvePress,
  onCapturePress,
}: {
  data: import('@/types/api').ProductionSummaryDailyResponse;
  workDate: string;
  latexTypeCode: string | null;
  onTeamPress: (team: TeamProductionSummary) => void;
  onResolvePress: (team: TeamProductionSummary) => void;
  onCapturePress: () => void;
}) {
  const isToday = workDate === todayIsoDate();
  const hasAnyData = data.teams.some((t) => t.derivedStatus !== 'NO_DATA');

  // Empty state — Spec 2 §31, phân biệt hôm nay (có CTA) vs ngày cũ (không bắt CTA).
  if (!hasAnyData) {
    return isToday ? (
      <EmptyState
        message="Chưa có sản lượng hôm nay. Chụp phiếu ghi mủ để bắt đầu ghi nhận."
        actionLabel="Chụp phiếu"
        onAction={onCapturePress}
      />
    ) : (
      <EmptyState message={`Không có dữ liệu sản lượng ngày ${formatDateVn(workDate)}.`} />
    );
  }

  return (
    <VStack space="md">
      {/* Summary — mục 9. totalKg được phép hiện (audit Phase 4 xác nhận business đã cộng trực tiếp
          kg các loại mủ thành tổng ở ReportService thật, không phải giả định — xem
          docs/plans/0021...). Khi có filter loại mủ, số này tự nhiên chỉ phản ánh đúng loại đó
          (§21 — filter chỉ đổi projection, backend đã tính sẵn). */}
      <AppCard>
        <AppText className="text-muted-foreground">Sản lượng đã xác nhận</AppText>
        <AppHeading size="2xl">{`${data.totalKg.toLocaleString('vi-VN')} kg`}</AppHeading>
        <VStack space="xs" className="mt-2">
          {data.byLatexType.map((lt) => (
            <HStack key={lt.code} className="justify-between">
              <AppText size="sm" className="text-muted-foreground">
                {lt.label}
              </AppText>
              <AppText size="sm" className="font-mono">
                {`${lt.kg.toLocaleString('vi-VN')} kg`}
              </AppText>
            </HStack>
          ))}
        </VStack>
      </AppCard>

      {/* Banner "còn dữ liệu chưa hoàn tất" — CHỈ khi có Tổ cần Admin chủ động xử lý (§46 vs §48,
          xem derivedTeamStatusNeedsAction). Không hiện khi chỉ có Tổ đang tự xử lý OCR (Case B). */}
      {data.hasPendingIssues ? (
        <Box className="border border-warning rounded-md p-3 bg-warning/10">
          <AppText size="sm">⚠ Còn dữ liệu chưa hoàn tất — xem chi tiết từng Tổ bên dưới.</AppText>
        </Box>
      ) : null}

      <VStack space="sm">
        <AppHeading size="lg">Theo tổ</AppHeading>
        {data.teams.map((team) => (
          <TeamSummaryCard
            key={team.teamId}
            team={team}
            hideLatexTypeCode={latexTypeCode}
            onPress={() => onTeamPress(team)}
            onResolvePress={() => onResolvePress(team)}
          />
        ))}
      </VStack>
    </VStack>
  );
}

function TeamSummaryCard({
  team,
  onPress,
  onResolvePress,
}: {
  team: TeamProductionSummary;
  hideLatexTypeCode: string | null;
  onPress: () => void;
  onResolvePress: () => void;
}) {
  const needsAction = derivedTeamStatusNeedsAction(team.derivedStatus);

  return (
    <Pressable onPress={onPress}>
      <AppCard>
        <HStack className="items-center justify-between">
          <AppText className="font-semibold">{team.teamName}</AppText>
          <StatusBadge label={derivedTeamStatusLabel(team.derivedStatus)} tone={derivedTeamStatusTone(team.derivedStatus)} />
        </HStack>

        {team.derivedStatus === 'NO_DATA' ? null : team.derivedStatus === 'PROCESSING' ? (
          <AppText size="sm" className="text-muted-foreground mt-1">
            Đang xử lý OCR...
          </AppText>
        ) : (
          <VStack space="xs" className="mt-1">
            <HStack className="items-center justify-between">
              <AppText size="sm" className="text-muted-foreground">
                {/* Không dùng "x/y công nhân" — §14, không có expectedWorkersForDate trong domain. */}
                {`${team.employeesWithProduction} công nhân có sản lượng`}
              </AppText>
              <AppText size="sm" className="font-mono">
                {`${team.officialKg.toLocaleString('vi-VN')} kg đã xác nhận`}
              </AppText>
            </HStack>

            {team.activeSupplementInfo ? (
              <AppText size="sm" className="text-warning">
                ⚠ Có dữ liệu bổ sung cần kiểm tra
              </AppText>
            ) : null}
            {team.pendingMoveInfo.map((info) => (
              <AppText key={info.targetWorkDate} size="xs" className="text-muted-foreground">
                {`⚠ ${info.imageCount} phiếu đang được chuyển sang ngày ${formatDateVn(info.targetWorkDate)} — chưa tính vào sản lượng.`}
              </AppText>
            ))}
          </VStack>
        )}

        {needsAction ? (
          <AppButton size="sm" variant="outline" className="mt-2 self-start" onPress={onResolvePress}>
            Xử lý
          </AppButton>
        ) : null}
      </AppCard>
    </Pressable>
  );
}
