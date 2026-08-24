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
import { LoadingState } from '@/components/LoadingState';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import { useEmployeesLookupQuery, useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import type { ProductionReportResponse } from '@/types/api';
import { reportsApi } from './api';
import { defaultReportDateRange } from './dateRange';
import { useProductionReportQuery } from './useReports';

function fmtKg(kg: number) {
  return kg.toFixed(1);
}

/**
 * Báo cáo sản lượng cá nhân (Tuần 6, ADR-0019 mục 5 — CHỈ bảng số liệu, không biểu đồ ở v1). Group
 * theo nhân viên, subtotal theo Tổ (`rows` backend đã sort teamName rồi employeeName — chỉ cần chèn
 * dòng subtotal khi sang Tổ khác, không tự group lại ở client). CHỈ tính bản ghi CONFIRMED
 * (ReportService backend).
 */
export function ProductionReportScreen() {
  const { showToast } = useAppToast();
  const [{ fromDate, toDate }, setDateRange] = useState(defaultReportDateRange());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const { data: employees } = useEmployeesLookupQuery(teamId ? { teamId } : {});

  const filters = { fromDate, toDate, teamId: teamId ?? undefined, employeeId: employeeId ?? undefined };
  const { data: report, isLoading, isError, error } = useProductionReportQuery(filters);

  const teamOptions = [{ label: 'Tất cả Tổ', value: '' }, ...(teams ?? []).map((t) => ({ label: t.name, value: t.id }))];
  const employeeOptions = [
    { label: 'Tất cả nhân viên', value: '' },
    ...(employees ?? []).map((e) => ({ label: e.fullName, value: e.id })),
  ];

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'xlsx') {
        await reportsApi.exportProductionXlsx(filters);
      } else {
        await reportsApi.exportProductionPdf(filters);
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
        <AppHeading size="xl">Báo cáo sản lượng cá nhân</AppHeading>

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
            <AppSelect
              label="Tổ"
              placeholder="Tất cả Tổ"
              value={teamId}
              options={teamOptions}
              onChange={(v) => {
                setTeamId(v || null);
                setEmployeeId(null); // đổi Tổ reset lựa chọn nhân viên — danh sách employeeOptions đổi theo
              }}
            />
          </Box>
          <Box className="w-48">
            <AppSelect
              label="Nhân viên"
              placeholder="Tất cả nhân viên"
              value={employeeId}
              options={employeeOptions}
              onChange={(v) => setEmployeeId(v || null)}
            />
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

        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState message="Không tải được báo cáo." detail={getErrorMessage(error)} /> : null}
        {report ? <ProductionReportTable report={report} /> : null}
      </VStack>
    </ScrollView>
  );
}

function ProductionReportTable({ report }: { report: ProductionReportResponse }) {
  if (report.rows.length === 0) {
    return <EmptyState message="Không có bản ghi đã xác nhận nào trong khoảng đã chọn." />;
  }

  // Chèn dòng subtotal ngay sau dòng nhân viên cuối cùng của mỗi Tổ (rows backend đã sort theo
  // teamName rồi employeeName — không cần tự group lại).
  const teamSubtotalById = new Map(report.teamSubtotals.map((s) => [s.teamId, s]));

  return (
    <ScrollView horizontal>
      <VStack className="min-w-full">
        <HStack className="border-b border-border py-2">
          <Box className="w-40 px-2">
            <AppText size="sm" className="font-semibold">Nhân viên</AppText>
          </Box>
          <Box className="w-32 px-2">
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

        {report.rows.map((row, index) => {
          const nextRow = report.rows[index + 1];
          const isLastOfTeam = !nextRow || nextRow.teamId !== row.teamId;
          const subtotal = isLastOfTeam ? teamSubtotalById.get(row.teamId) : null;
          return (
            <Box key={row.employeeId}>
              <HStack className="border-b border-border py-1.5">
                <Box className="w-40 px-2">
                  <AppText size="sm">{row.employeeName}</AppText>
                </Box>
                <Box className="w-32 px-2">
                  <AppText size="sm" className="text-muted-foreground">{row.teamName}</AppText>
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
              {subtotal ? (
                <HStack className="border-b border-border py-1.5 bg-muted">
                  <Box className="w-40 px-2">
                    <AppText size="sm" className="font-semibold">{`Cộng ${subtotal.teamName}`}</AppText>
                  </Box>
                  <Box className="w-32 px-2" />
                  {report.latexTypeCodes.map((code) => (
                    <Box key={code} className="w-24 px-2 items-end">
                      <AppText size="sm" className="font-semibold font-mono">{fmtKg(subtotal.kgByLatexType[code] ?? 0)}</AppText>
                    </Box>
                  ))}
                  <Box className="w-24 px-2 items-end">
                    <AppText size="sm" className="font-semibold font-mono">{fmtKg(subtotal.totalKg)}</AppText>
                  </Box>
                </HStack>
              ) : null}
            </Box>
          );
        })}

        <HStack className="py-2 bg-accent">
          <Box className="w-40 px-2">
            <AppText className="font-semibold">Tổng cộng</AppText>
          </Box>
          <Box className="w-32 px-2" />
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
