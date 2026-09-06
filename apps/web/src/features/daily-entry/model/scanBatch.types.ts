/**
 * Scan Batch (OCR ảnh phiếu) — Đợt 1b. Khớp 1:1 các DTO backend đã đọc kỹ trước khi build:
 * `ScanBatchController`, `ScanBatchResponse`, `ScanImageResponse`, `ScanBatchConflictResponse`,
 * `CaptureImageRequest`, `ResolveDateRequest`, `ResolveConflictRequest`, và các enum
 * `OcrTargetType`/`BatchStatus`/`ImageStatus`/`DateVerificationStatus`/`DateResolution`/
 * `ConflictType`/`ConflictStatus`. String literal union thay vì enum TS — chỉ cần so sánh giá trị,
 * không cần hành vi enum.
 */

export type OcrTargetType = 'PRODUCTION_RECORD' | 'LATEX_SALE';

export type BatchStatus =
  | 'DRAFT'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'NEED_REVIEW'
  | 'READY_TO_APPROVE'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'APPROVED'
  | 'CANCELLED';

export type ImageStatus = 'UPLOADING' | 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'PENDING_MOVE' | 'MOVED' | 'REPLACED';

export type DateVerificationStatus = 'MATCHED' | 'NOT_DETECTED' | 'MISMATCH';

export type DateResolution = 'FALLBACK_SESSION_DATE' | 'KEEP_SESSION_DATE' | 'CHANGE_DATE' | 'UNRESOLVED';

export type ConflictType =
  | 'DUPLICATE_IMAGE'
  | 'IMAGE_QUALITY_OR_OCR_FAILED'
  | 'DATE_MISMATCH'
  | 'UNKNOWN_EMPLOYEE'
  | 'INVALID_BUSINESS_VALUE'
  | 'POTENTIAL_DUPLICATE_OCR_ROW'
  | 'PENDING_MOVE'
  | 'OTHER'
  | 'TOTAL_MISMATCH'
  | 'EMPTY_ROW_SKIPPED';

export type ConflictStatus = 'OPEN' | 'RESOLVED' | 'OVERRIDDEN';

export interface ScanImage {
  id: string;
  clientImageId: string;
  photoUrl: string | null;
  status: ImageStatus;
  dateVerificationStatus: DateVerificationStatus;
  dateResolution: DateResolution;
  ocrDetectedDate: string | null;
  effectiveWorkDate: string | null;
  pendingMoveTargetBatchId: string | null;
  errorMessage: string | null;
  createdAt: string;
  ocrRowCount: number | null;
  /** "Tổng cộng" OCR đọc trên phiếu theo từng loại mủ — JSON string dạng
   * `[{"latex_type_code":"water","total_kg":76.5}, ...]` (null nếu phiếu không có dòng tổng, hoặc
   * chưa xử lý xong). Migration 016 — luôn lưu, không chỉ lúc lệch. Frontend tự parse. */
  ocrColumnTotals: string | null;
}

export interface ScanBatchConflict {
  id: string;
  scanImageId: string;
  recordTable: string;
  recordId: string | null;
  conflictType: ConflictType;
  blocking: boolean;
  status: ConflictStatus;
  detail: string | null;
  displayOrder: number;
}

export interface ScanBatch {
  id: string;
  documentType: string;
  workDate: string;
  teamId: string;
  teamName: string;
  batchType: string;
  originalBatchId: string | null;
  status: BatchStatus;
  canApprove: boolean;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  images: ScanImage[];
  conflicts: ScanBatchConflict[];
}

export interface ScanBatchLookup {
  batchId: string | null;
  status: string | null;
  blocked: boolean;
}
