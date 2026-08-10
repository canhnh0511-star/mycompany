import { apiClient } from '@/lib/api/client';
import type { BatchResult, CreateLatexSaleRequest, LatexSaleResponse } from '@/types/api';

/** Nhập tay batch — bán mủ theo Tổ, không có employeeId (CLAUDE.md §4). Best-effort (ADR-0007). */
export const latexSalesApi = {
  createBatch: (requests: CreateLatexSaleRequest[]) =>
    apiClient.post<BatchResult<LatexSaleResponse>>('/api/v1/latex-sales/batch', requests),
  update: (id: string, body: CreateLatexSaleRequest) =>
    apiClient.patch<LatexSaleResponse>(`/api/v1/latex-sales/${id}`, body),
  confirm: (id: string) => apiClient.post<LatexSaleResponse>(`/api/v1/latex-sales/${id}/confirm`),
};
