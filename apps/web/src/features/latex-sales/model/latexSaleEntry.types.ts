/** Bán mủ (CLAUDE.md §1/§4) — KHÁC Nhập phiếu hàng ngày ở chỗ không có roster cố định: 1 Tổ có thể
 * bán mủ 0, 1 hay NHIỀU lần trong 1 ngày (nhiều người mua khác nhau) — `latex_sales` không có unique
 * constraint theo (team_id, record_date) như `production_records` theo employee. Vì vậy màn nhập là
 * 1 DANH SÁCH thẻ có thể thêm/xóa (không phải bảng cố định số dòng), mỗi thẻ = 1 phiếu bán độc lập.
 */
export interface SaleItemDraft {
  latexTypeId: string;
  kg: string;
  drcPercent: string;
}

export type SaleRowStatus = 'idle' | 'pending' | 'saved' | 'error';

export interface SaleRowDraft {
  /** Key cục bộ ổn định cho React (khác `id` — dòng mới chưa có `id` thật từ server). */
  draftKey: string;
  id: string | null;
  buyerName: string;
  sellerSignedBy: string;
  notes: string;
  items: SaleItemDraft[];
  status: SaleRowStatus;
  error?: string;
}
