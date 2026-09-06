import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProductionRecordsBatch,
  getProductionRecordsByTeamAndDate,
  updateProductionRecord,
  type UpdateProductionRecordInput,
} from '../api/productionRecords.api';

const rosterKey = (teamId: string | null, date: string) => ['production-records', 'roster', teamId, date] as const;

/** Nguồn dữ liệu chính cho bảng roster hợp nhất (mục B2, CLAUDE.md §5 "bảng kết quả CÓ THỂ CHỈNH
 * SỬA — đọc trực tiếp từ draft row") — toàn bộ record (nhập tay + OCR) của 1 Tổ trong 1 ngày, bất
 * kể tạo qua scanBatch nào hay nhập tay thuần. */
export function useProductionRecordsByTeamAndDate(teamId: string | null, date: string) {
  return useQuery({
    queryKey: rosterKey(teamId, date),
    queryFn: () => getProductionRecordsByTeamAndDate(teamId as string, date),
    enabled: teamId !== null,
  });
}

// Export — DailyEntryPage cũng cần gọi trực tiếp sau khi OCR đọc xong 1 ảnh (xem ghi chú ở đó): OCR
// tạo record MỚI thẳng trong DB (ADR-0006) nhưng KHÔNG đi qua `useCreateProductionRecordsBatch`
// (route capture-image riêng, `useScanBatch.ts`), nên trước đây không có gì invalidate query này —
// bảng roster chỉ vô tình hiện đúng dữ liệu OCR ở lần mở trang SAU, không phải ngay khi vừa xử lý
// xong ảnh trong cùng phiên (bug phát hiện khi làm lại luồng tương tự cho Bán mủ, Phase 4).
export function useInvalidateRoster() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['production-records', 'roster'] });
}

export function useCreateProductionRecordsBatch() {
  const invalidateRoster = useInvalidateRoster();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductionRecordsBatch,
    onSuccess: () => {
      invalidateRoster();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateProductionRecord() {
  const invalidateRoster = useInvalidateRoster();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductionRecordInput }) => updateProductionRecord(id, body),
    onSuccess: invalidateRoster,
  });
}
