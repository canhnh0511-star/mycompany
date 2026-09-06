/**
 * Kết quả nhập liệu batch — best-effort theo từng dòng (ADR-0007). Khớp `BatchResult<T>` /
 * `BatchResult.BatchItemResult<T>` bên backend. Dùng chung cho batch của production-records/
 * latex-sales/attendance-records (Phiếu, Đợt 1a trở đi) — 1 dòng lỗi không làm hỏng các dòng khác
 * trong cùng request, frontend map lỗi về đúng dòng theo `index`.
 */
export interface BatchItemResult<T> {
  index: number;
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface BatchResult<T> {
  results: BatchItemResult<T>[];
}
