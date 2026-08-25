import { apiClient } from '@/lib/api/client';
import { downloadFile } from '@/lib/api/download';
import type { LatexSaleReportResponse, ProductionDailyTrendResponse, ProductionReportResponse } from '@/types/api';

export interface ProductionReportFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
  employeeId?: string;
}

export interface ProductionDailyTrendFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
  /** Lọc theo 1 loại mủ (vd "water"/"cup") — Home "Sản lượng 7 ngày" filter. Không truyền = tổng tất cả
   * loại (hành vi cũ). "Khác" (mủ dây+đông) KHÔNG lọc được ở đây — gọi 2 lần rồi cộng dồn phía client. */
  latexTypeCode?: string;
}

export interface LatexSaleReportFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
}

function buildQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** Spread narrows để khớp `Record<string, string | undefined>` — các filter type trên đều toàn field string. */
function toParams(
  filters: ProductionReportFilters | LatexSaleReportFilters | ProductionDailyTrendFilters,
): Record<string, string | undefined> {
  return { ...filters };
}

/** 2 báo cáo JSON (CHỈ tính CONFIRMED, ReportController backend) + export Excel/PDF — tải file khác
 * nhau theo platform (ADR-0014, xem lib/api/download.ts). */
export const reportsApi = {
  productionReport: (filters: ProductionReportFilters) =>
    apiClient.get<ProductionReportResponse>(`/api/v1/reports/production-records?${buildQuery(toParams(filters))}`),
  productionDailyTrend: (filters: ProductionDailyTrendFilters) =>
    apiClient.get<ProductionDailyTrendResponse>(
      `/api/v1/reports/production-records/daily-trend?${buildQuery(toParams(filters))}`,
    ),
  latexSaleReport: (filters: LatexSaleReportFilters) =>
    apiClient.get<LatexSaleReportResponse>(`/api/v1/reports/latex-sales?${buildQuery(toParams(filters))}`),
  exportProductionXlsx: (filters: ProductionReportFilters) =>
    downloadFile(
      `/api/v1/reports/production-records/export/xlsx?${buildQuery(toParams(filters))}`,
      `san-luong_${filters.fromDate}_den_${filters.toDate}.xlsx`,
    ),
  exportProductionPdf: (filters: ProductionReportFilters) =>
    downloadFile(
      `/api/v1/reports/production-records/export/pdf?${buildQuery(toParams(filters))}`,
      `san-luong_${filters.fromDate}_den_${filters.toDate}.pdf`,
    ),
  exportLatexSaleXlsx: (filters: LatexSaleReportFilters) =>
    downloadFile(
      `/api/v1/reports/latex-sales/export/xlsx?${buildQuery(toParams(filters))}`,
      `ban-mu_${filters.fromDate}_den_${filters.toDate}.xlsx`,
    ),
  exportLatexSalePdf: (filters: LatexSaleReportFilters) =>
    downloadFile(
      `/api/v1/reports/latex-sales/export/pdf?${buildQuery(toParams(filters))}`,
      `ban-mu_${filters.fromDate}_den_${filters.toDate}.pdf`,
    ),
};
