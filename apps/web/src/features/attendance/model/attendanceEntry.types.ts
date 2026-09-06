import type { AttendanceType } from '../api/attendance.api';

/** Ngày làm việc — KHÁC bảng roster sản lượng ở chỗ mỗi Ô (employee × attendanceType) là 1 bản ghi
 * ĐỘC LẬP (attendance_records không có bảng "items" con — không giống production_records/items).
 * Mỗi ô giữ `recordId` riêng để quyết định POST (batch, `recordId=null`) hay PATCH lúc "Lưu tất cả". */
export interface AttendanceCellDraft {
  attendanceType: AttendanceType;
  recordId: string | null;
  quantity: string;
}

export type AttendanceRowStatus = 'idle' | 'pending' | 'saved' | 'error';

export interface AttendanceRowDraft {
  employeeId: string;
  employeeName: string;
  cells: AttendanceCellDraft[];
  rowStatus: AttendanceRowStatus;
  rowError?: string;
}
