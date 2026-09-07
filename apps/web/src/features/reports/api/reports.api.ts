import { apiGet } from '../../../api/client';
import { downloadFile } from '../../../api/downloadFile';

export interface ProductionReportRow {
  teamId: string;
  teamName: string;
  employeeId: string;
  employeeName: string;
  kgByLatexType: Record<string, number>;
  totalKg: number;
}
export interface ProductionReportResponse {
  fromDate: string;
  toDate: string;
  latexTypeCodes: string[];
  latexTypeLabels: Record<string, string>;
  rows: ProductionReportRow[];
  grandTotalByLatexType: Record<string, number>;
  grandTotalKg: number;
}

export interface LatexSaleReportRow {
  teamId: string;
  teamName: string;
  kgByLatexType: Record<string, number>;
  totalKg: number;
}
export interface LatexSaleReportResponse {
  fromDate: string;
  toDate: string;
  latexTypeCodes: string[];
  latexTypeLabels: Record<string, string>;
  rows: LatexSaleReportRow[];
  grandTotalByLatexType: Record<string, number>;
  grandTotalKg: number;
}

export interface ReportFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
  employeeId?: string;
}

export function getProductionReport(filters: ReportFilters): Promise<ProductionReportResponse> {
  return apiGet<ProductionReportResponse>('/api/v1/reports/production-records', {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    teamId: filters.teamId,
    employeeId: filters.employeeId,
  });
}

export function getLatexSaleReport(filters: Omit<ReportFilters, 'employeeId'>): Promise<LatexSaleReportResponse> {
  return apiGet<LatexSaleReportResponse>('/api/v1/reports/latex-sales', {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    teamId: filters.teamId,
  });
}

export function exportProductionXlsx(filters: ReportFilters): Promise<void> {
  return downloadFile(
    '/api/v1/reports/production-records/export/xlsx',
    { fromDate: filters.fromDate, toDate: filters.toDate, teamId: filters.teamId, employeeId: filters.employeeId },
    `san-luong-${filters.fromDate}-${filters.toDate}.xlsx`,
  );
}
export function exportProductionPdf(filters: ReportFilters): Promise<void> {
  return downloadFile(
    '/api/v1/reports/production-records/export/pdf',
    { fromDate: filters.fromDate, toDate: filters.toDate, teamId: filters.teamId, employeeId: filters.employeeId },
    `san-luong-${filters.fromDate}-${filters.toDate}.pdf`,
  );
}
export function exportLatexSaleXlsx(filters: Omit<ReportFilters, 'employeeId'>): Promise<void> {
  return downloadFile(
    '/api/v1/reports/latex-sales/export/xlsx',
    { fromDate: filters.fromDate, toDate: filters.toDate, teamId: filters.teamId },
    `ban-mu-${filters.fromDate}-${filters.toDate}.xlsx`,
  );
}
export function exportLatexSalePdf(filters: Omit<ReportFilters, 'employeeId'>): Promise<void> {
  return downloadFile(
    '/api/v1/reports/latex-sales/export/pdf',
    { fromDate: filters.fromDate, toDate: filters.toDate, teamId: filters.teamId },
    `ban-mu-${filters.fromDate}-${filters.toDate}.pdf`,
  );
}
