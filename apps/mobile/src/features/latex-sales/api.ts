import { apiClient } from '@/lib/api/client';
import type { BatchResult, CreateLatexSaleRequest, LatexSaleResponse, Page, RecordStatus } from '@/types/api';

export interface LatexSaleFilters {
  teamId?: string;
  fromDate?: string;
  toDate?: string;
  status?: RecordStatus;
}

/** Nhập tay batch — bán mủ theo Tổ, không có employeeId (CLAUDE.md §4). Best-effort (ADR-0007). */
export const latexSalesApi = {
  createBatch: (requests: CreateLatexSaleRequest[]) =>
    apiClient.post<BatchResult<LatexSaleResponse>>('/api/v1/latex-sales/batch', requests),
  update: (id: string, body: CreateLatexSaleRequest) =>
    apiClient.patch<LatexSaleResponse>(`/api/v1/latex-sales/${id}`, body),
  confirm: (id: string) => apiClient.post<LatexSaleResponse>(`/api/v1/latex-sales/${id}/confirm`),
  get: (id: string) => apiClient.get<LatexSaleResponse>(`/api/v1/latex-sales/${id}`),
  list: (filters: LatexSaleFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.teamId) params.set('teamId', filters.teamId);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return apiClient.get<Page<LatexSaleResponse>>(`/api/v1/latex-sales${qs ? `?${qs}` : ''}`);
  },
  cancel: (id: string) => apiClient.post<LatexSaleResponse>(`/api/v1/latex-sales/${id}/cancel`),
};
