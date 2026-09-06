import { apiGet, apiPatch, apiPostAuthed } from '../../../api/client';
import type { BatchResult } from '../../../api/batch.types';

/** Khớp `AttendanceType.java` — "lighting" (tiền đèn) cố ý KHÔNG có ở đây, là phụ cấp cố định/tháng
 * không gắn chấm công theo ngày (CLAUDE.md §4). */
export const ATTENDANCE_TYPES = ['TAPPING_WORK', 'ATTENDANCE', 'STORM_ALLOWANCE', 'MEDICATION', 'SEASONAL_WORK'] as const;
export type AttendanceType = (typeof ATTENDANCE_TYPES)[number];

export const ATTENDANCE_TYPE_LABEL: Record<AttendanceType, string> = {
  TAPPING_WORK: 'Công xã miệng',
  ATTENDANCE: 'Chuyên cần',
  STORM_ALLOWANCE: 'Công mưa bão',
  MEDICATION: 'Bồi thuốc',
  SEASONAL_WORK: 'Công thời vụ',
};

export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp (chờ duyệt)',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

/** Khớp `AttendanceRecordResponse.java`. */
export interface AttendanceRecordFull {
  id: string;
  recordDate: string;
  employeeId: string;
  employeeName: string;
  attendanceType: AttendanceType;
  quantity: number;
  notes: string | null;
  createdAt: string;
  status: string;
}

export interface CreateAttendanceInput {
  recordDate: string;
  employeeId: string;
  attendanceType: AttendanceType;
  quantity: number;
  notes: string | null;
}
export type UpdateAttendanceInput = CreateAttendanceInput;

export function getAttendanceByTeamAndDate(teamId: string, date: string): Promise<{ content: AttendanceRecordFull[] }> {
  return apiGet<{ content: AttendanceRecordFull[] }>('/api/v1/attendance-records', {
    teamId,
    fromDate: date,
    toDate: date,
    size: 500,
  });
}

export interface AttendanceFilters {
  teamId?: string;
  employeeId?: string;
  fromDate: string;
  toDate: string;
  status?: string;
  attendanceType?: string;
}

export function listAttendance(
  filters: AttendanceFilters,
  page = 0,
  size = 50,
): Promise<{ content: AttendanceRecordFull[]; totalElements: number; totalPages: number }> {
  return apiGet('/api/v1/attendance-records', {
    teamId: filters.teamId,
    employeeId: filters.employeeId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
    attendanceType: filters.attendanceType,
    page,
    size,
  });
}

export function createAttendanceBatch(rows: CreateAttendanceInput[]): Promise<BatchResult<AttendanceRecordFull>> {
  return apiPostAuthed<BatchResult<AttendanceRecordFull>>('/api/v1/attendance-records/batch', undefined, rows);
}

export function updateAttendance(id: string, body: UpdateAttendanceInput): Promise<AttendanceRecordFull> {
  return apiPatch<AttendanceRecordFull>(`/api/v1/attendance-records/${id}`, undefined, body);
}

export function cancelAttendance(id: string): Promise<AttendanceRecordFull> {
  return apiPostAuthed<AttendanceRecordFull>(`/api/v1/attendance-records/${id}/cancel`);
}
