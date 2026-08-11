import { apiClient } from '@/lib/api/client';
import { downloadFile } from '@/lib/api/download';
import type { LatexSaleReportResponse, ProductionReportResponse } from '@/types/api';

export interface ProductionReportFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
  employeeId?: string;
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

/** Spread narrows để khớp `Record<string, string | undefined>` — 2 filter type trên đều toàn field string. */
function toParams(filters: ProductionReportFilters | LatexSaleReportFilters): Record<string, string | undefined> {
  return { ...filters };
}

/** 2 báo cáo JSON (CHỈ tính CONFIRMED, ReportController backend) + export Excel/PDF — tải file khác
 * nhau theo platform (ADR-0014, xem lib/api/download.ts). */
export const reportsApi = {
  productionReport: (filters: ProductionReportFilters) =>
    apiClient.get<ProductionReportResponse>(`/api/v1/reports/production-records?${buildQuery(toParams(filters))}`),
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
