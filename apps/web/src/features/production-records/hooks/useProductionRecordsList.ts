import { useQuery } from '@tanstack/react-query';
import * as api from '../api/productionRecordsList.api';

// Bỏ `useEmployees` (khác bản cũ) — filter theo 1 nhân viên không còn khớp ý nghĩa của bảng aggregate
// theo Tổ+Ngày (xem `ProductionRecordsFilterBar.tsx`).
export { useTeams } from '../../../hooks/useLookups';
export { useLatexTypes } from '../../../hooks/useLookups';

// Không nhận `page` nữa — bảng luôn fetch 1 lần với size đủ rộng rồi aggregate ở FE toàn bộ
// (xem comment `AGGREGATE_FETCH_SIZE` ở `productionRecordsList.api.ts`), không phân trang server.
export function useProductionRecordsList(filters: api.ProductionRecordsFilters) {
  return useQuery({
    queryKey: ['production-records-list', filters],
    queryFn: () => api.listProductionRecords(filters),
  });
}
