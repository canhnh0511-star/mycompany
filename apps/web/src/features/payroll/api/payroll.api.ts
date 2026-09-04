import { apiGet, apiPatch, apiPostAuthed } from '../../../api/client';
import type { PayrollDetail, PayrollSummary, TechnicalGrade } from '../model/payroll.types';

export interface TeamOption {
  id: string;
  name: string;
}

/** Danh sách Tổ cho dropdown lọc — khớp services/api dto/TeamResponse.java. */
export function getTeams(): Promise<TeamOption[]> {
  return apiGet<TeamOption[]>('/api/v1/teams');
}

export interface PayrollFilters {
  yearMonth: string;
  teamId?: string;
  status?: string;
  query?: string;
}

/** Module 3 đã có backend thật (docs/specs/spec-3-bang-luong-v1-draft.md) — gọi thẳng API, không
 * cần fixture dev như dashboard (viết trước khi Module 3 tồn tại). */
export function getPayrollSummary(filters: PayrollFilters): Promise<PayrollSummary> {
  return apiGet<PayrollSummary>('/api/v1/payroll', {
    yearMonth: filters.yearMonth,
    teamId: filters.teamId,
    status: filters.status,
    query: filters.query || undefined,
  });
}

export function getPayrollDetail(employeeId: string, yearMonth: string): Promise<PayrollDetail> {
  return apiGet<PayrollDetail>(`/api/v1/payroll/${employeeId}`, { yearMonth });
}

export function updateDeduction(employeeId: string, yearMonth: string, amount: number) {
  return apiPatch(`/api/v1/payroll/${employeeId}/deduction`, { yearMonth }, { amount });
}

export function updateTechnicalGrade(employeeId: string, yearMonth: string, grade: TechnicalGrade | null) {
  return apiPatch(`/api/v1/payroll/${employeeId}/technical-grade`, { yearMonth }, { grade });
}

export function lockPayroll(yearMonth: string): Promise<PayrollSummary> {
  return apiPostAuthed<PayrollSummary>('/api/v1/payroll/lock', { yearMonth });
}

export function unlockPayroll(yearMonth: string): Promise<PayrollSummary> {
  return apiPostAuthed<PayrollSummary>('/api/v1/payroll/unlock', { yearMonth });
}
