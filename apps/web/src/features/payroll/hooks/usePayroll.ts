import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPayrollDetail,
  getPayrollSummary,
  getTeams,
  lockPayroll,
  unlockPayroll,
  updateDeduction,
  updateTechnicalGrade,
  type PayrollFilters,
} from '../api/payroll.api';
import type { TechnicalGrade } from '../model/payroll.types';

const summaryKey = (filters: PayrollFilters) => ['payroll', 'summary', filters] as const;
const detailKey = (employeeId: string, yearMonth: string) => ['payroll', 'detail', employeeId, yearMonth] as const;

export function usePayrollSummary(filters: PayrollFilters) {
  return useQuery({
    queryKey: summaryKey(filters),
    queryFn: () => getPayrollSummary(filters),
  });
}

export function usePayrollDetail(employeeId: string | null, yearMonth: string) {
  return useQuery({
    queryKey: employeeId ? detailKey(employeeId, yearMonth) : ['payroll', 'detail', 'none'],
    queryFn: () => getPayrollDetail(employeeId as string, yearMonth),
    enabled: employeeId !== null,
  });
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: getTeams });
}

/** Sau mọi mutation ghi (sửa/chốt/mở), invalidate CẢ summary lẫn detail — bảng và panel chi tiết
 * phải luôn khớp nhau, tránh trường hợp panel hiện số cũ sau khi bảng đã cập nhật. */
function useInvalidatePayroll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['payroll'] });
}

export function useUpdateDeductionMutation(yearMonth: string) {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: ({ employeeId, amount }: { employeeId: string; amount: number }) =>
      updateDeduction(employeeId, yearMonth, amount),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTechnicalGradeMutation(yearMonth: string) {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: ({ employeeId, grade }: { employeeId: string; grade: TechnicalGrade | null }) =>
      updateTechnicalGrade(employeeId, yearMonth, grade),
    onSuccess: () => invalidate(),
  });
}

export function useLockPayrollMutation() {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: (yearMonth: string) => lockPayroll(yearMonth),
    onSuccess: () => invalidate(),
  });
}

export function useUnlockPayrollMutation() {
  const invalidate = useInvalidatePayroll();
  return useMutation({
    mutationFn: (yearMonth: string) => unlockPayroll(yearMonth),
    onSuccess: () => invalidate(),
  });
}
