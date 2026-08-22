import { apiClient } from '@/lib/api/client';
import type { BatchResult, CreateLatexSaleRequest, LatexSaleResponse, Page, RecordStatus } from '@/types/api';

export interface LatexSaleFilters {
  teamId?: string;
  fromDate?: string;
  toDate?: string;
  status?: RecordStatus;
  /** 0021-scan-batch-model — màn Batch Review lọc đúng các draft thuộc 1 phiên quét cụ thể. */
  scanBatchId?: string;
}

/** Nhập tay batch — bán mủ theo Tổ, không có employeeId (CLAUDE.md §4). Best-effort (ADR-0007). */
export const latexSalesApi = {
  createBatch: (requests: CreateLatexSaleRequest[]) =>
    apiClient.post<BatchResult<LatexSaleResponse>>('/api/v1/latex-sales/batch', requests),
  update: (id: string, body: CreateLatexSaleRequest) =>
    apiClient.patch<LatexSaleResponse>(`/api/v1/latex-sales/${id}`, body),
  /** draft → approved (đổi tên từ /confirm ở 0021-scan-batch-model). */
  approve: (id: string) => apiClient.post<LatexSaleResponse>(`/api/v1/latex-sales/${id}/approve`),
  get: (id: string) => apiClient.get<LatexSaleResponse>(`/api/v1/latex-sales/${id}`),
  list: (filters: LatexSaleFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.teamId) params.set('teamId', filters.teamId);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.status) params.set('status', filters.status);
    if (filters.scanBatchId) params.set('scanBatchId', filters.scanBatchId);
    const qs = params.toString();
    return apiClient.get<Page<LatexSaleResponse>>(`/api/v1/latex-sales${qs ? `?${qs}` : ''}`);
  },
  cancel: (id: string) => apiClient.post<LatexSaleResponse>(`/api/v1/latex-sales/${id}/cancel`),
};
