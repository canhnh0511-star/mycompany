import { apiGet, apiPatch, apiPostAuthed } from '../../../api/client';
import type { BatchResult } from '../../../api/batch.types';
import type { LatexItemInput } from '../../daily-entry/api/productionRecords.api';

export const LATEX_SALE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp (chờ duyệt)',
  APPROVED: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
};

/** Khớp `CreateLatexSaleRequest.java` — không có employeeId, bán theo Tổ (CLAUDE.md §4). */
export interface CreateLatexSaleInput {
  recordDate: string;
  teamId: string;
  buyerName: string | null;
  sellerSignedBy: string | null;
  notes: string | null;
  items: LatexItemInput[];
}
export type UpdateLatexSaleInput = CreateLatexSaleInput;

/** Khớp `LatexSaleResponse.java`. */
export interface LatexSaleFull {
  id: string;
  recordDate: string;
  teamId: string;
  teamName: string;
  buyerName: string | null;
  sellerSignedBy: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
  status: string;
  items: { latexTypeId: string; latexTypeCode: string; kg: number; drcPercent: number | null }[];
}

export interface LatexSalesFilters {
  teamId?: string;
  fromDate: string;
  toDate: string;
  status?: string;
}

export function getLatexSalesByTeamAndDate(teamId: string, date: string): Promise<{ content: LatexSaleFull[] }> {
  return apiGet<{ content: LatexSaleFull[] }>('/api/v1/latex-sales', { teamId, fromDate: date, toDate: date, size: 10 });
}

export function listLatexSales(
  filters: LatexSalesFilters,
  page = 0,
  size = 50,
): Promise<{ content: LatexSaleFull[]; totalElements: number; totalPages: number }> {
  return apiGet('/api/v1/latex-sales', {
    teamId: filters.teamId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
    page,
    size,
  });
}

export function getLatexSale(id: string): Promise<LatexSaleFull> {
  return apiGet<LatexSaleFull>(`/api/v1/latex-sales/${id}`);
}

export function createLatexSalesBatch(rows: CreateLatexSaleInput[]): Promise<BatchResult<LatexSaleFull>> {
  return apiPostAuthed<BatchResult<LatexSaleFull>>('/api/v1/latex-sales/batch', undefined, rows);
}

export function updateLatexSale(id: string, body: UpdateLatexSaleInput): Promise<LatexSaleFull> {
  return apiPatch<LatexSaleFull>(`/api/v1/latex-sales/${id}`, undefined, body);
}

export function approveLatexSale(id: string): Promise<LatexSaleFull> {
  return apiPostAuthed<LatexSaleFull>(`/api/v1/latex-sales/${id}/approve`);
}

export function cancelLatexSale(id: string): Promise<LatexSaleFull> {
  return apiPostAuthed<LatexSaleFull>(`/api/v1/latex-sales/${id}/cancel`);
}
