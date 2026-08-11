import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import { reportsApi, type LatexSaleReportFilters, type ProductionReportFilters } from './api';

/** `enabled: !!fromDate && !!toDate` — 2 filter bắt buộc ở backend (`@RequestParam LocalDate`, 400 nếu
 * thiếu), không tự bắn request cho tới khi Admin chọn đủ khoảng ngày. */
export function useProductionReportQuery(filters: ProductionReportFilters) {
  return useQuery({
    queryKey: queryKeys.reports.productionRecords({ ...filters }),
    queryFn: () => reportsApi.productionReport(filters),
    enabled: !!filters.fromDate && !!filters.toDate,
  });
}

export function useLatexSaleReportQuery(filters: LatexSaleReportFilters) {
  return useQuery({
    queryKey: queryKeys.reports.latexSales({ ...filters }),
    queryFn: () => reportsApi.latexSaleReport(filters),
    enabled: !!filters.fromDate && !!filters.toDate,
  });
}
