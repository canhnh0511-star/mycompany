import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { useProductionRecordsListQuery } from '@/features/production-records/useProductionRecordsList';
import { useLatexSalesListQuery } from '@/features/latex-sales/useLatexSalesList';
import { ApiError } from '@/lib/api/client';
import type { LatexItemResponse, LatexSaleResponse, ProductionRecordResponse, RecordStatus } from '@/types/api';

type PhieuFilter = 'all' | 'production' | 'latex-sale';

const STATUS_CHIPS: { label: string; value: RecordStatus | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Nháp', value: 'DRAFT' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
];

function sumKg(items: LatexItemResponse[]) {
  return items.reduce((sum, i) => sum + i.kg, 0);
}

function statusLabel(status: RecordStatus) {
  if (status === 'DRAFT') return 'Nháp';
  if (status === 'CANCELLED') return 'Đã hủy';
  return 'Đã xác nhận';
}

function statusBadgeClass(status: RecordStatus) {
  if (status === 'DRAFT') return 'bg-muted';
  if (status === 'CANCELLED') return 'bg-destructive';
  return 'bg-accent';
}

/**
 * Tab "Tra cứu" — layout dạng card theo wireframe (ADR-0019 mục 2), gộp chung Sản lượng cá nhân + Bán
 * mủ theo Tổ trong 1 danh sách sắp theo ngày (khớp mockup: card "Nguyễn Văn Bình" và "Bán mủ — Tổ 3"
 * xen nhau). Không gộp attendance-records vào đây — thiết kế trong wireframe chỉ có 2 loại phiếu.
 * Filter status mặc định "Tất cả" (kể cả `DRAFT` chưa confirm — CLAUDE.md §5).
 */
export function LookupScreen() {
  const router = useRouter();
  const { data: teams } = useTeamsLookupQuery();

  const [phieuFilter, setPhieuFilter] = useState<PhieuFilter>('all');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<RecordStatus | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filters = {
    teamId: teamId ?? undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: status === 'all' ? undefined : status,
  };

  const productionQuery = useProductionRecordsListQuery(filters);
  const latexSaleQuery = useLatexSalesListQuery(filters);

  const isLoading = productionQuery.isLoading || latexSaleQuery.isLoading;
  const isError = productionQuery.isError || latexSaleQuery.isError;

  const rows = useMemo(() => {
    const productionRows =
      phieuFilter === 'latex-sale'
        ? []
        : (productionQuery.data?.content ?? []).map((r) => ({ kind: 'production' as const, data: r }));
    const latexRows =
      phieuFilter === 'production'
        ? []
        : (latexSaleQuery.data?.content ?? []).map((r) => ({ kind: 'latex-sale' as const, data: r }));
    return [...productionRows, ...latexRows].sort((a, b) => (a.data.recordDate < b.data.recordDate ? 1 : -1));
  }, [productionQuery.data, latexSaleQuery.data, phieuFilter]);

  const teamOptions = [{ label: 'Tất cả Tổ', value: '' }, ...(teams ?? []).map((t) => ({ label: t.name, value: t.id }))];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <HStack space="xs" className="flex-wrap">
          <FilterChip label="Tất cả loại phiếu" active={phieuFilter === 'all'} onPress={() => setPhieuFilter('all')} />
          <FilterChip
            label="Sổ ghi mủ"
            active={phieuFilter === 'production'}
            onPress={() => setPhieuFilter('production')}
          />
          <FilterChip
            label="Sổ bán mủ"
            active={phieuFilter === 'latex-sale'}
            onPress={() => setPhieuFilter('latex-sale')}
          />
        </HStack>

        <HStack space="xs" className="flex-wrap">
          {STATUS_CHIPS.map((chip) => (
            <FilterChip key={chip.value} label={chip.label} active={status === chip.value} onPress={() => setStatus(chip.value)} />
          ))}
        </HStack>

        <AppSelect
          placeholder="Tất cả Tổ"
          value={teamId}
          options={teamOptions}
          onChange={(v) => setTeamId(v || null)}
        />
        {/* Date range dùng AppInput thô (yyyy-mm-dd) — chưa có date picker library ở v1, cùng pattern
            với QuickEntryForm. */}
        <HStack space="sm">
          <Box className="flex-1">
            <AppInput label="Từ ngày" value={fromDate} onChangeText={setFromDate} placeholder="yyyy-mm-dd" />
          </Box>
          <Box className="flex-1">
            <AppInput label="Đến ngày" value={toDate} onChangeText={setToDate} placeholder="yyyy-mm-dd" />
          </Box>
        </HStack>

        {isLoading ? <AppText className="text-muted-foreground">Đang tải...</AppText> : null}
        {isError ? (
          <AppText className="text-destructive">
            Không tải được danh sách:{' '}
            {productionQuery.error instanceof ApiError
              ? productionQuery.error.message
              : latexSaleQuery.error instanceof ApiError
                ? latexSaleQuery.error.message
                : 'Lỗi không xác định'}
          </AppText>
        ) : null}
        {!isLoading && rows.length === 0 ? (
          <AppText className="text-muted-foreground">Không có bản ghi nào khớp bộ lọc.</AppText>
        ) : null}

        <VStack space="sm">
          {rows.map((row) =>
            row.kind === 'production' ? (
              <ProductionCard
                key={`p-${row.data.id}`}
                record={row.data}
                onPress={() => router.push(`/record-detail/production/${row.data.id}`)}
              />
            ) : (
              <LatexSaleCard
                key={`l-${row.data.id}`}
                record={row.data}
                onPress={() => router.push(`/record-detail/latex-sale/${row.data.id}`)}
              />
            ),
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className={`rounded-full px-3 py-1.5 border ${active ? 'bg-accent border-accent' : 'border-border'}`}>
        <AppText size="sm">{label}</AppText>
      </Box>
    </Pressable>
  );
}

function ProductionCard({ record, onPress }: { record: ProductionRecordResponse; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className="border border-border rounded-md p-3">
        <HStack className="items-center justify-between">
          <AppText className="font-semibold">{record.employeeName}</AppText>
          <Box className={`rounded-full px-2 py-0.5 ${statusBadgeClass(record.status)}`}>
            <AppText size="xs" className={record.status === 'CANCELLED' ? 'text-white' : undefined}>
              {statusLabel(record.status)}
            </AppText>
          </Box>
        </HStack>
        <HStack className="items-center justify-between mt-1">
          <AppText size="sm" className="text-muted-foreground">
            {`${record.teamName} · ${record.recordDate}`}
          </AppText>
          <AppText size="sm" className="font-mono">
            {`${sumKg(record.items).toFixed(1)} kg`}
          </AppText>
        </HStack>
      </Box>
    </Pressable>
  );
}

function LatexSaleCard({ record, onPress }: { record: LatexSaleResponse; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className="border border-border rounded-md p-3">
        <HStack className="items-center justify-between">
          <AppText className="font-semibold">{`Bán mủ — ${record.teamName}`}</AppText>
          <Box className={`rounded-full px-2 py-0.5 ${statusBadgeClass(record.status)}`}>
            <AppText size="xs" className={record.status === 'CANCELLED' ? 'text-white' : undefined}>
              {statusLabel(record.status)}
            </AppText>
          </Box>
        </HStack>
        <HStack className="items-center justify-between mt-1">
          <AppText size="sm" className="text-muted-foreground">
            {`${record.buyerName ? `Người mua: ${record.buyerName} · ` : ''}${record.recordDate}`}
          </AppText>
          <AppText size="sm" className="font-mono">
            {`${sumKg(record.items).toFixed(1)} kg`}
          </AppText>
        </HStack>
      </Box>
    </Pressable>
  );
}
