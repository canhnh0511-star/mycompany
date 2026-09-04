import { useQuery } from '@tanstack/react-query';
import {
  getKpis,
  getPayrollSummary,
  getRecentDocuments,
  getTeamStatus,
  getWorkQueue,
} from '../api/dashboard.api';

export function useDashboardKpis(workDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', workDate],
    queryFn: () => getKpis(workDate),
  });
}

export function useWorkQueue(workDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'work-queue', workDate],
    queryFn: () => getWorkQueue(workDate),
  });
}

export function useTeamStatus(workDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'teams', workDate],
    queryFn: () => getTeamStatus(workDate),
  });
}

export function usePayrollSummary(month: string) {
  return useQuery({
    queryKey: ['dashboard', 'payroll-summary', month],
    queryFn: () => getPayrollSummary(month),
  });
}

export function useRecentDocuments(workDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'recent-documents', workDate],
    queryFn: () => getRecentDocuments(workDate),
  });
}

/** "2026-09-04" -> "2026-09" — tháng của ngày làm việc hiện tại, cho payroll summary. */
export function toMonthKey(workDate: string): string {
  return workDate.slice(0, 7);
}
