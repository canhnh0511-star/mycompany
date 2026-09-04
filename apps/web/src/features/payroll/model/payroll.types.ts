/**
 * Module 3 — Bảng lương. Khớp services/api dto/PayrollSummaryResponse.java, PayrollRowResponse.java,
 * PayrollDetailResponse.java, PayrollLineItem.java, PayrollRowStatus.java (docs/specs/spec-3-bang-luong-v1-draft.md
 * mục 4). Field *Amount đã nhân sẵn (quantity × đơn giá hiện hành) — KHÔNG tự tính lại ở client.
 */

/** DERIVED, không lưu DB — dựa vào status production_records trong tháng (mục 2.5 spec). */
export type PayrollRowStatus = 'MISSING_DATA' | 'NEEDS_REVIEW' | 'CONFIRMED';

export type TechnicalGrade = 'A' | 'B' | 'C';

/** 1 dòng nhân viên ở Bảng lương. technicalGrade = null nghĩa là tháng này chưa được xếp hạng. */
export interface PayrollRow {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  waterKg: number;
  waterAmount: number;
  mixedLatexKg: number;
  mixedLatexAmount: number;
  medicationCount: number;
  medicationAmount: number;
  attendanceDays: number;
  attendanceAmount: number;
  stormAllowanceDays: number;
  stormAllowanceAmount: number;
  seasonalWorkDays: number;
  seasonalWorkAmount: number;
  technicalGrade: TechnicalGrade | null;
  technicalGradeAmount: number;
  totalPay: number;
  deduction: number;
  deductionIsOverride: boolean;
  netPay: number;
  rowStatus: PayrollRowStatus;
}

/** Khớp GET /api/v1/payroll — `locked` là cờ đơn giản theo THÁNG, KHÔNG immutable (mục 2.4) — số
 * liệu luôn tính từ dữ liệu nguồn mới nhất dù đã khóa hay chưa. */
export interface PayrollSummary {
  yearMonth: string; // 'YYYY-MM'
  totalNetPay: number;
  totalEmployees: number;
  needsReviewCount: number;
  missingDataCount: number;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  rows: PayrollRow[];
}

/** 1 dòng breakdown "số lượng × đơn giá = thành tiền" ở panel chi tiết (drill-down). */
export interface PayrollLineItem {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

/** Khớp GET /api/v1/payroll/{employeeId} */
export interface PayrollDetail {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  yearMonth: string;
  lines: PayrollLineItem[];
  technicalGrade: TechnicalGrade | null;
  totalPay: number;
  deduction: number;
  deductionIsOverride: boolean;
  netPay: number;
  rowStatus: PayrollRowStatus;
}

export const PAYROLL_ROW_STATUS_LABEL: Record<PayrollRowStatus, string> = {
  CONFIRMED: 'Đã xác nhận',
  NEEDS_REVIEW: 'Cần kiểm tra',
  MISSING_DATA: 'Thiếu dữ liệu',
};

export const TECHNICAL_GRADE_LABEL: Record<TechnicalGrade, string> = {
  A: 'Loại A',
  B: 'Loại B',
  C: 'Loại C',
};
