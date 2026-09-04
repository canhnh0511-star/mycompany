import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryClient';
import type { TechnicalGrade } from '@/types/api';
import { payrollApi, type PayrollFilters } from './api';

export function usePayrollSummaryQuery(filters: PayrollFilters) {
  return useQuery({
    queryKey: queryKeys.payroll.summary(filters as unknown as Record<string, unknown>),
    queryFn: () => payrollApi.summary(filters),
    enabled: !!filters.yearMonth,
  });
}

export function usePayrollDetailQuery(employeeId: string | null, yearMonth: string) {
  return useQuery({
    queryKey: queryKeys.payroll.detail(employeeId ?? '', yearMonth),
    queryFn: () => payrollApi.detail(employeeId!, yearMonth),
    enabled: !!employeeId && !!yearMonth,
  });
}

/** Mọi mutation ở đây đều CHỈ đổi 1 input hợp lệ (Trừ/Tạm ứng, Hạng kỹ thuật) — không có mutation
 * nào sửa trực tiếp tổng lương (mục 0/49 spec gốc). invalidate cả summary lẫn detail vì 1 dòng đổi
 * có thể ảnh hưởng netPay hiển thị ở cả 2 nơi. */
export function usePayrollMutations() {
  const queryClient = useQueryClient();
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payroll'] });
  };

  const updateDeduction = useMutation({
    mutationFn: ({ employeeId, yearMonth, amount }: { employeeId: string; yearMonth: string; amount: number }) =>
      payrollApi.updateDeduction(employeeId, yearMonth, { amount }),
    onSuccess: invalidateAll,
  });

  const updateTechnicalGrade = useMutation({
    mutationFn: ({ employeeId, yearMonth, grade }: { employeeId: string; yearMonth: string; grade: TechnicalGrade | null }) =>
      payrollApi.updateTechnicalGrade(employeeId, yearMonth, { grade }),
    onSuccess: invalidateAll,
  });

  const lock = useMutation({
    mutationFn: (yearMonth: string) => payrollApi.lock(yearMonth),
    onSuccess: invalidateAll,
  });

  const unlock = useMutation({
    mutationFn: (yearMonth: string) => payrollApi.unlock(yearMonth),
    onSuccess: invalidateAll,
  });

  return { updateDeduction, updateTechnicalGrade, lock, unlock };
}
