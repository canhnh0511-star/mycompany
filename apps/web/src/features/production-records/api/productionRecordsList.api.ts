import { apiGet, apiPostAuthed } from '../../../api/client';

export const RECORD_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp (chờ duyệt)',
  APPROVED: 'Đã duyệt',
  CANCELLED: 'Đã hủy',
};

/** Khớp `ProductionRecordResponse.java` đầy đủ (khác `ProductionRecordResult` hẹp của daily-entry —
 * feature này phục vụ tra cứu, cần thêm source/photoUrl/createdAt). */
export interface ProductionRecordFull {
  id: string;
  recordDate: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  notes: string | null;
  source: string;
  photoUrl: string | null;
  createdAt: string;
  status: string;
  items: { latexTypeId: string; latexTypeCode: string; kg: number; drcPercent: number | null }[];
}

export interface ProductionRecordsFilters {
  teamId?: string;
  employeeId?: string;
  fromDate: string;
  toDate: string;
  status?: string;
}

export function listProductionRecords(
  filters: ProductionRecordsFilters,
  page = 0,
  size = 50,
): Promise<{ content: ProductionRecordFull[]; totalElements: number; totalPages: number }> {
  return apiGet('/api/v1/production-records', {
    teamId: filters.teamId,
    employeeId: filters.employeeId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
    page,
    size,
  });
}

export function getProductionRecord(id: string): Promise<ProductionRecordFull> {
  return apiGet<ProductionRecordFull>(`/api/v1/production-records/${id}`);
}

export function approveProductionRecord(id: string): Promise<ProductionRecordFull> {
  return apiPostAuthed<ProductionRecordFull>(`/api/v1/production-records/${id}/approve`);
}

export function cancelProductionRecord(id: string): Promise<ProductionRecordFull> {
  return apiPostAuthed<ProductionRecordFull>(`/api/v1/production-records/${id}/cancel`);
}
