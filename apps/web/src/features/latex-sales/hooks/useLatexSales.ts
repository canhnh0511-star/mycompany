import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/latexSales.api';

export { useTeams, useLatexTypes } from '../../../hooks/useLookups';

export function useLatexSalesByTeamAndDate(teamId: string, date: string) {
  return useQuery({
    queryKey: ['latex-sales-by-team-date', teamId, date],
    queryFn: () => api.getLatexSalesByTeamAndDate(teamId, date),
    enabled: !!teamId && !!date,
  });
}

export function useLatexSalesList(filters: api.LatexSalesFilters, page: number) {
  return useQuery({ queryKey: ['latex-sales-list', filters, page], queryFn: () => api.listLatexSales(filters, page) });
}

export function useLatexSale(id: string | null) {
  return useQuery({
    queryKey: ['latex-sale', id],
    queryFn: () => api.getLatexSale(id as string),
    enabled: !!id,
  });
}

// Export — LatexSaleEntryPage cũng gọi trực tiếp sau khi capture ảnh OCR thành công (cùng lý do như
// `useInvalidateRoster` bên daily-entry: OCR tạo latex_sales MỚI qua route capture-image riêng,
// không qua batch/update mutation ở đây).
export function useInvalidateLatexSales() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['latex-sales-by-team-date'] });
    queryClient.invalidateQueries({ queryKey: ['latex-sales-list'] });
    queryClient.invalidateQueries({ queryKey: ['latex-sale'] });
  };
}

export function useCreateLatexSalesBatch() {
  const invalidate = useInvalidateLatexSales();
  return useMutation({ mutationFn: api.createLatexSalesBatch, onSuccess: invalidate });
}

export function useUpdateLatexSale() {
  const invalidate = useInvalidateLatexSales();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateLatexSaleInput }) => api.updateLatexSale(id, body),
    onSuccess: invalidate,
  });
}

export function useApproveLatexSale() {
  const invalidate = useInvalidateLatexSales();
  return useMutation({ mutationFn: api.approveLatexSale, onSuccess: invalidate });
}

export function useCancelLatexSale() {
  const invalidate = useInvalidateLatexSales();
  return useMutation({ mutationFn: api.cancelLatexSale, onSuccess: invalidate });
}
