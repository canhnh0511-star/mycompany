import { apiClient } from '@/lib/api/client';
import type {
  BatchResult,
  CreateProductionRecordRequest,
  Page,
  ProductionRecordResponse,
  RecordStatus,
} from '@/types/api';

export interface ProductionRecordFilters {
  teamId?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  status?: RecordStatus;
  /** 0021-scan-batch-model — màn Batch Review lọc đúng các draft thuộc 1 phiên quét cụ thể. */
  scanBatchId?: string;
}

/** Nhập tay batch — ghi thẳng source=manual/status=approved, best-effort theo từng dòng (ADR-0007). */
export const productionRecordsApi = {
  createBatch: (requests: CreateProductionRecordRequest[]) =>
    apiClient.post<BatchResult<ProductionRecordResponse>>('/api/v1/production-records/batch', requests),
  /** Sửa AGGREGATE toàn bộ (record + items thay thế hoàn toàn) — dùng khi Admin sửa draft trước khi
   * xác nhận, hoặc sửa record đã confirmed từ tab Tra cứu. Cùng shape với CreateProductionRecordRequest. */
  update: (id: string, body: CreateProductionRecordRequest) =>
    apiClient.patch<ProductionRecordResponse>(`/api/v1/production-records/${id}`, body),
  /** draft → approved, KHÔNG tự động (ADR-0006, đổi tên từ /confirm ở 0021-scan-batch-model) — chỉ
   * gọi sau khi Admin đã xem/sửa ở bảng review. */
  approve: (id: string) => apiClient.post<ProductionRecordResponse>(`/api/v1/production-records/${id}/approve`),
  get: (id: string) => apiClient.get<ProductionRecordResponse>(`/api/v1/production-records/${id}`),
  /** Tab Tra cứu (CLAUDE.md §5) — không lọc status thì trả cả `DRAFT` chưa confirm. Mặc định
   * size=50 sort=recordDate DESC ở backend (Phase 4). */
  list: (filters: ProductionRecordFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.teamId) params.set('teamId', filters.teamId);
    if (filters.employeeId) params.set('employeeId', filters.employeeId);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.status) params.set('status', filters.status);
    if (filters.scanBatchId) params.set('scanBatchId', filters.scanBatchId);
    const qs = params.toString();
    return apiClient.get<Page<ProductionRecordResponse>>(`/api/v1/production-records${qs ? `?${qs}` : ''}`);
  },
  /** "Xóa" = chuyển status → cancelled, không hard delete (CLAUDE.md §4). */
  cancel: (id: string) => apiClient.post<ProductionRecordResponse>(`/api/v1/production-records/${id}/cancel`),
};
