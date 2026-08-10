import { apiClient } from '@/lib/api/client';
import type { EditHistoryResponse } from '@/types/api';

/** 3 bảng header polymorphic hợp lệ (khớp EditHistoryService.VALID_TABLE_NAMES ở backend). */
export type EditHistoryTableName = 'production_records' | 'latex_sales' | 'attendance_records';

export const editHistoryApi = {
  list: (tableName: EditHistoryTableName, recordId: string) =>
    apiClient.get<EditHistoryResponse[]>(
      `/api/v1/edit-history?tableName=${tableName}&recordId=${recordId}`,
    ),
};
