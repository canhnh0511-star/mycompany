import { apiClient } from '@/lib/api/client';
import type { BatchResult, CreateProductionRecordRequest, ProductionRecordResponse } from '@/types/api';

/** Nhập tay batch — ghi thẳng source=manual/status=confirmed, best-effort theo từng dòng (ADR-0007). */
export const productionRecordsApi = {
  createBatch: (requests: CreateProductionRecordRequest[]) =>
    apiClient.post<BatchResult<ProductionRecordResponse>>('/api/v1/production-records/batch', requests),
  /** Sửa AGGREGATE toàn bộ (record + items thay thế hoàn toàn) — dùng khi Admin sửa draft trước khi
   * xác nhận, hoặc sửa record đã confirmed từ tab Tra cứu. Cùng shape với CreateProductionRecordRequest. */
  update: (id: string, body: CreateProductionRecordRequest) =>
    apiClient.patch<ProductionRecordResponse>(`/api/v1/production-records/${id}`, body),
  /** draft → confirmed, KHÔNG tự động (ADR-0006) — chỉ gọi sau khi Admin đã xem/sửa ở bảng review. */
  confirm: (id: string) => apiClient.post<ProductionRecordResponse>(`/api/v1/production-records/${id}/confirm`),
};
