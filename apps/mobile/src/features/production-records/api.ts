import { apiClient } from '@/lib/api/client';
import type { BatchResult, CreateProductionRecordRequest, ProductionRecordResponse } from '@/types/api';

/** Nhập tay batch — ghi thẳng source=manual/status=confirmed, best-effort theo từng dòng (ADR-0007). */
export const productionRecordsApi = {
  createBatch: (requests: CreateProductionRecordRequest[]) =>
    apiClient.post<BatchResult<ProductionRecordResponse>>('/api/v1/production-records/batch', requests),
};
