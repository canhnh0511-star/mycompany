import { apiGet } from '../../../api/client';

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

/** Bỏ `employeeId` (khác bản cũ) — bảng giờ aggregate theo Tổ+Ngày (xem `aggregateByTeamDate.ts`),
 * lọc theo 1 nhân viên không còn khớp ý nghĩa "tổng cả Tổ" của 1 dòng nữa. */
export interface ProductionRecordsFilters {
  teamId?: string;
  fromDate: string;
  toDate: string;
  status?: string;
}

// Không phân trang server: bảng phải aggregate theo (teamId, recordDate) ở FE, 2 record cùng
// nhóm rơi vào 2 trang khác nhau sẽ làm tổng sai. Dùng 1 size đủ rộng để phủ hết khoảng lọc hiện
// có (cùng pattern `size: 200`/`size: 500` đã dùng ở daily-entry/attendance) thay vì tự phân trang
// lại nhiều lượt — 1 Tổ hiếm khi phát sinh hàng nghìn record trong 1 khoảng ngày lọc thực tế.
const AGGREGATE_FETCH_SIZE = 1000;

export function listProductionRecords(
  filters: ProductionRecordsFilters,
): Promise<{ content: ProductionRecordFull[]; totalElements: number; totalPages: number }> {
  return apiGet('/api/v1/production-records', {
    teamId: filters.teamId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
    page: 0,
    size: AGGREGATE_FETCH_SIZE,
  });
}

