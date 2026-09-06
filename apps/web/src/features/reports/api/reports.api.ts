import { apiGet, API_BASE_URL } from '../../../api/client';
import { getAccessToken } from '../../../api/tokenStorage';

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

/**
 * Tải file Excel/PDF — KHÔNG dùng `window.open` (không gửi kèm được Bearer token, backend yêu cầu
 * auth cho mọi route trừ /auth/login). Tự `fetch` lấy `blob`, tạo `<a>` tạm rồi thu hồi ngay sau khi
 * click (tránh rò rỉ object URL).
 */
async function downloadFile(path: string, params: Record<string, string | undefined>, fileName: string): Promise<void> {
  const url = new URL(path.replace(/^\//, ''), `${API_BASE_URL}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const token = getAccessToken();
  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Tải file thất bại (${response.status})`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
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
