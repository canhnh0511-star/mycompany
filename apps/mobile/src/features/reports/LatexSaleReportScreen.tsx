import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppDateInput } from '@/components/AppDateInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import type { LatexSaleReportResponse } from '@/types/api';
import { reportsApi } from './api';
import { defaultReportDateRange } from './dateRange';
import { useLatexSaleReportQuery } from './useReports';

function fmtKg(kg: number) {
  return kg.toFixed(1);
}

/** Báo cáo bán mủ theo Tổ (Tuần 6, ADR-0019 mục 5). rows = 1 dòng/Tổ (đã là mức Tổ, không có subtotal
 * riêng như report sản lượng cá nhân). CHỈ tính bản ghi CONFIRMED (ReportService backend). */
export function LatexSaleReportScreen() {
  const { showToast } = useAppToast();
  const [{ fromDate, toDate }, setDateRange] = useState(defaultReportDateRange());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const filters = { fromDate, toDate, teamId: teamId ?? undefined };
  const { data: report, isLoading, isError, error } = useLatexSaleReportQuery(filters);

  const teamOptions = [{ label: 'Tất cả Tổ', value: '' }, ...(teams ?? []).map((t) => ({ label: t.name, value: t.id }))];

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'xlsx') {
        await reportsApi.exportLatexSaleXlsx(filters);
      } else {
        await reportsApi.exportLatexSalePdf(filters);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Lỗi không xác định';
      showToast({ title: 'Xuất file thất bại', description: message, variant: 'error' });
    } finally {
      setExporting(null);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <AppHeading size="xl">Báo cáo bán mủ theo Tổ</AppHeading>

        <HStack space="sm" className="flex-wrap items-end">
          <Box className="w-40">
            <AppDateInput
              label="Từ ngày"
              value={fromDate}
              onChangeText={(v) => setDateRange((r) => ({ ...r, fromDate: v }))}
            />
          </Box>
          <Box className="w-40">
            <AppDateInput
              label="Đến ngày"
              value={toDate}
              onChangeText={(v) => setDateRange((r) => ({ ...r, toDate: v }))}
            />
          </Box>
          <Box className="w-48">
            <AppSelect label="Tổ" placeholder="Tất cả Tổ" value={teamId} options={teamOptions} onChange={(v) => setTeamId(v || null)} />
          </Box>
          <AppButton
            variant="outline"
            onPress={() => handleExport('xlsx')}
            isLoading={exporting === 'xlsx'}
            isDisabled={!report || exporting !== null}
          >
            Xuất Excel
          </AppButton>
          <AppButton
            variant="outline"
            onPress={() => handleExport('pdf')}
            isLoading={exporting === 'pdf'}
            isDisabled={!report || exporting !== null}
          >
            Xuất PDF
          </AppButton>
        </HStack>

        {isLoading ? <SkeletonList /> : null}
        {isError ? <ErrorState message="Không tải được báo cáo." detail={getErrorMessage(error)} /> : null}
        {report ? <LatexSaleReportTable report={report} /> : null}
      </VStack>
    </ScrollView>
  );
}

function LatexSaleReportTable({ report }: { report: LatexSaleReportResponse }) {
  if (report.rows.length === 0) {
    return <EmptyState message="Không có bản ghi đã xác nhận nào trong khoảng đã chọn." />;
  }

  return (
    <ScrollView horizontal>
      <VStack className="min-w-full">
        <HStack className="border-b border-border py-2">
          <Box className="w-48 px-2">
            <AppText size="sm" className="font-semibold">Tổ</AppText>
          </Box>
          {report.latexTypeCodes.map((code) => (
            <Box key={code} className="w-24 px-2 items-end">
              <AppText size="sm" className="font-semibold">{report.latexTypeLabels[code]}</AppText>
            </Box>
          ))}
          <Box className="w-24 px-2 items-end">
            <AppText size="sm" className="font-semibold">Tổng kg</AppText>
          </Box>
        </HStack>

        {report.rows.map((row) => (
          <HStack key={row.teamId} className="border-b border-border py-1.5">
            <Box className="w-48 px-2">
              <AppText size="sm">{row.teamName}</AppText>
            </Box>
            {report.latexTypeCodes.map((code) => (
              <Box key={code} className="w-24 px-2 items-end">
                <AppText size="sm" className="font-mono">{fmtKg(row.kgByLatexType[code] ?? 0)}</AppText>
              </Box>
            ))}
            <Box className="w-24 px-2 items-end">
              <AppText size="sm" className="font-mono">{fmtKg(row.totalKg)}</AppText>
            </Box>
          </HStack>
        ))}

        <HStack className="py-2 bg-accent">
          <Box className="w-48 px-2">
            <AppText className="font-semibold">Tổng cộng</AppText>
          </Box>
          {report.latexTypeCodes.map((code) => (
            <Box key={code} className="w-24 px-2 items-end">
              <AppText className="font-semibold font-mono">{fmtKg(report.grandTotalByLatexType[code] ?? 0)}</AppText>
            </Box>
          ))}
          <Box className="w-24 px-2 items-end">
            <AppText className="font-semibold font-mono">{fmtKg(report.grandTotalKg)}</AppText>
          </Box>
        </HStack>
      </VStack>
    </ScrollView>
  );
}
