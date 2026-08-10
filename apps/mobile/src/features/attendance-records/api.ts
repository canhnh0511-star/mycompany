import { apiClient } from '@/lib/api/client';
import type { AttendanceRecordResponse, BatchResult, CreateAttendanceRecordRequest } from '@/types/api';

/** Nhập tay batch — ghi thẳng status=confirmed (khác OCR draft), best-effort theo từng dòng (ADR-0007). */
export const attendanceRecordsApi = {
  createBatch: (requests: CreateAttendanceRecordRequest[]) =>
    apiClient.post<BatchResult<AttendanceRecordResponse>>('/api/v1/attendance-records/batch', requests),
};
