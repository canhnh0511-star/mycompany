/**
 * "Phiếu" — Nhập phiếu hàng ngày (CLAUDE.md §1/§5). Sau khi áp dụng thiết kế cuối (mockup đã duyệt):
 * bảng CỐ ĐỊNH theo roster công nhân của Tổ đã chọn (không thêm/xóa dòng) — nhập tay và OCR cùng đổ
 * vào 1 dòng theo `employeeId`, khác hẳn Đợt 1a/1b cũ (2 bảng riêng, dòng tự do thêm/xóa).
 */

/** 1 dòng khối lượng theo loại mủ trong 1 dòng nhập — khớp `LatexItemRequest`/`LatexItemResponse`. */
export interface ProductionItemDraft {
  latexTypeId: string;
  /** Chuỗi raw từ `DecimalField` — rỗng nghĩa là chưa nhập, KHÔNG gửi lên server. */
  kg: string;
  /** Chỉ có ý nghĩa khi latexType.code === 'water' (CLAUDE.md §4). */
  drcPercent: string;
}

export type RowStatus = 'idle' | 'pending' | 'saved' | 'error';

/**
 * 1 dòng trong bảng roster — LUÔN tồn tại cho mỗi công nhân active của Tổ đã chọn (kể cả chưa có dữ
 * liệu gì — "dòng trống", xem `isAbsent`). `recordId` khác null khi dòng đã có `production_record`
 * thật trong DB (do OCR tạo hoặc đã lưu tay trước đó) — quyết định POST (tạo mới, `recordId=null`)
 * hay PATCH (sửa, `recordId` có giá trị) lúc bấm "Lưu tất cả", ẩn khỏi UI (người dùng chỉ thấy 1
 * hành động "Lưu").
 */
export interface ProductionRowDraft {
  employeeId: string;
  employeeName: string;
  recordId: string | null;
  notes: string;
  items: ProductionItemDraft[];
  /** Cả 4 cột đều trống — style muted "nghỉ/không cạo", KHÔNG disable input (vẫn cho gõ tay nếu
   * Admin biết người đó có cạo, tránh OCR đoán nhầm mà khóa cứng). */
  isAbsent: boolean;
  /** OCR đọc tên không chắc (`low_confidence_fields` chứa 'employee_name') — style cảnh báo ở tên. */
  nameFlagged: boolean;
  /** `latexTypeId` của các ô OCR đọc không chắc — style `cell-flag` đúng ô đó (mục A2, qualify dạng
   * "kg:water"/"drc_percent:water"). Ô "chung chung" (field không qualify latex type — dòng OCR
   * không tuân theo hướng dẫn qualify, hoặc dòng chỉ 1 loại mủ) rơi vào `genericValueFlagged` — tô
   * TẤT CẢ cột số của dòng vì không biết đúng cột nào. */
  flaggedLatexTypeIds: string[];
  genericValueFlagged: boolean;
  rowStatus: RowStatus;
  rowError?: string;
  /** Thứ tự dòng gốc trên phiếu giấy — ưu tiên từ `record.rowIndex` (đã có production_record), rơi
   * về `EMPTY_ROW_SKIPPED` conflict (dòng có tên trên phiếu nhưng không có số liệu — nghỉ hoặc gộp
   * chung vợ/chồng, xem `getEmptyRowIndexByEmployeeId`) nếu không có record. `null` chỉ khi CẢ 2
   * nguồn đều không có (nhân viên chưa từng xuất hiện trong ảnh nào) — dùng vị trí mặc định trong
   * danh sách nhân viên làm khóa sắp phụ, KHÔNG ép xếp cuối bảng (phản hồi trực tiếp, xem
   * `sortRowsLikePhoto`). */
  rowIndex: number | null;
  /** Tên vợ/chồng nếu dòng này trống DO sản lượng đã tính chung vào dòng vợ/chồng (CLAUDE.md §5,
   * ADR-0024 — chia đôi kg chỉ áp dụng lúc tính lương, không đụng dữ liệu sản lượng thô) — `null` cho
   * dòng trống thật sự (nghỉ/không cạo) hoặc dòng có dữ liệu. Suy ra ở FRONTEND (không cần đọc conflict
   * OCR) bằng cách đối chiếu `spouseEmployeeId` với dữ liệu dòng vợ/chồng trong cùng bảng — áp dụng cho
   * cả trường hợp nhập tay thuần, không riêng gì ảnh OCR (phản hồi trực tiếp: "các dòng vợ chồng thì
   * không hiển là nghỉ/hoặc cạo do tính chung"). */
  combinedWithSpouseName: string | null;
}
