/**
 * Mirror thủ công các DTO backend cần cho phần đã scaffold (auth). Backend CHƯA có OpenAPI/Swagger
 * (Phase 5, xem docs/TASKS.md) nên chưa generate được bằng openapi-typescript — nguồn sự thật vẫn là
 * `services/api/src/main/java/com/mycompany/api/dto/*.java`. Thêm type ở đây khi bắt tay từng feature,
 * đối chiếu lại DTO backend mỗi khi thêm — đừng đoán field name.
 */

export type Role = 'admin' | 'team_lead';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Khớp services/api dto/LoginResponse.java */
export interface LoginResponse {
  accessToken: string;
  userId: string;
  fullName: string;
  role: Role;
}

/** Khớp services/api dto/UserProfileResponse.java */
export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  position: string | null;
}

/** Hình dạng chung ProblemDetail (RFC 7807) mà GlobalExceptionHandler backend trả về (CLAUDE.md §7). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

/** Khớp services/api dto/TeamResponse.java */
export interface TeamResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

/** Khớp services/api dto/CreateTeamRequest.java + UpdateTeamRequest.java (2 request cùng field) */
export interface TeamRequest {
  name: string;
  description: string | null;
}

/** Khớp services/api entity/EmployeeStatus.java — Jackson serialize enum bằng .name(), UPPERCASE. */
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

/** Khớp services/api dto/EmployeeResponse.java */
export interface EmployeeResponse {
  id: string;
  fullName: string;
  teamId: string;
  teamName: string;
  userId: string | null;
  status: EmployeeStatus;
  createdAt: string;
}

/** Khớp services/api dto/LatexTypeResponse.java — danh mục MỞ (ADR-0002), không hardcode 4 loại cố định. */
export interface LatexTypeResponse {
  id: string;
  code: string;
  label: string;
  unit: string;
}

/** Khớp services/api dto/LatexItemRequest.java */
export interface LatexItemRequest {
  latexTypeId: string;
  kg: number;
  /** Chỉ có ý nghĩa khi latexType.code === 'water' (CLAUDE.md §4). */
  drcPercent: number | null;
}

/** Khớp services/api dto/LatexItemResponse.java */
export interface LatexItemResponse {
  latexTypeId: string;
  latexTypeCode: string;
  kg: number;
  drcPercent: number | null;
}

/** Khớp services/api entity/RecordStatus.java (0021-scan-batch-model: CONFIRMED đổi tên thành
 * APPROVED, nhất quán thuật ngữ với ScanBatch.status APPROVED) — Jackson serialize enum bằng
 * .name(), UPPERCASE. CHỈ dùng cho production_records/latex_sales — attendance_records dùng
 * {@link AttendanceRecordStatus} riêng (KHÔNG đổi tên, xem entity AttendanceRecordStatus backend). */
export type RecordStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED';

/** Khớp services/api entity/AttendanceRecordStatus.java — tách riêng khỏi RecordStatus, giữ nguyên
 * 3 giá trị gốc (KHÔNG đổi CONFIRMED→APPROVED, attendance ngoài phạm vi rename). */
export type AttendanceRecordStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

/** Khớp services/api dto/CreateProductionRecordRequest.java (nhập tay batch, ADR-0007) */
export interface CreateProductionRecordRequest {
  recordDate: string; // ISO yyyy-MM-dd (LocalDate backend)
  employeeId: string;
  notes: string | null;
  items: LatexItemRequest[];
}

/** Khớp services/api dto/ProductionRecordResponse.java */
export interface ProductionRecordResponse {
  id: string;
  recordDate: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  notes: string | null;
  source: 'manual' | 'ocr_import';
  photoUrl: string | null;
  ocrCallLogId: string | null;
  lowConfidenceFields: string | null;
  createdBy: string;
  createdAt: string;
  status: RecordStatus;
  items: LatexItemResponse[];
}

/** Khớp services/api dto/CreateLatexSaleRequest.java (nhập tay batch, ADR-0007) — không có employeeId. */
export interface CreateLatexSaleRequest {
  recordDate: string;
  teamId: string;
  buyerName: string | null;
  sellerSignedBy: string | null;
  notes: string | null;
  items: LatexItemRequest[];
}

/** Khớp services/api dto/LatexSaleResponse.java */
export interface LatexSaleResponse {
  id: string;
  recordDate: string;
  teamId: string;
  teamName: string;
  buyerName: string | null;
  sellerSignedBy: string | null;
  notes: string | null;
  photoUrl: string | null;
  ocrCallLogId: string | null;
  lowConfidenceFields: string | null;
  createdBy: string;
  createdAt: string;
  status: RecordStatus;
  items: LatexItemResponse[];
}

/** Khớp services/api dto/BatchResult.java — best-effort theo từng dòng (ADR-0007). */
export interface BatchItemResult<T> {
  index: number;
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface BatchResult<T> {
  results: BatchItemResult<T>[];
}

/** Khớp services/api entity/OcrTargetType.java — loại phiếu Admin ĐÃ CHỌN trước khi chụp (CLAUDE.md §5). */
export type OcrTargetType = 'PRODUCTION_RECORD' | 'LATEX_SALE';

/** Khớp services/api dto/CreateSignedUploadUrlRequest.java — chỉ chấp nhận image/jpeg, image/png. */
export type UploadContentType = 'image/jpeg' | 'image/png';

/** Khớp services/api dto/SignedUploadUrlResponse.java */
export interface SignedUploadUrlResponse {
  photoPath: string;
  uploadUrl: string;
  token: string;
}

/** Khớp services/api dto/OcrUnmatchedLine.java — dòng OCR không fuzzy-match ra nhân viên nào, cũng
 * là shape `detail` JSON của 1 ScanBatchConflict loại UNKNOWN_EMPLOYEE (0021-scan-batch-model). */
export interface OcrUnmatchedLine {
  employeeNameRaw: string | null;
  items: LatexItemRequest[];
  notes: string | null;
  lowConfidenceFields: string[];
}

// ===================================================================================
// Scan Session/Batch (0021-scan-batch-model, Spec 1) — thay thế hẳn OcrCaptureRequest/
// OcrCaptureResponse cũ. Khớp services/api dto/CaptureImageRequest.java,
// ScanBatchResponse.java, ScanImageResponse.java, ScanBatchConflictResponse.java,
// ScanBatchLookupResponse.java, ResolveDateRequest.java, ResolveConflictRequest.java,
// ScanBatchAuditLogResponse.java + entity BatchType/BatchStatus/ImageStatus/
// DateVerificationStatus/DateResolution/ConflictType/ConflictStatus.
// ===================================================================================

export type BatchType = 'PRIMARY' | 'SUPPLEMENT';

/** ACTIVE/MERGEABLE = DRAFT..PARTIAL_FAILED (batch còn sống, nhận merge ảnh mới); FAILED = cần
 * "Thử lại"/"Hủy phiên" trước khi chụp tiếp; APPROVED/CANCELLED = terminal (Spec 1 mục 1). */
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
  | 'OTHER';

export type ConflictStatus = 'OPEN' | 'RESOLVED' | 'OVERRIDDEN';

/** workDate = sessionWorkDate (RULE 1, nguồn ngày làm việc chính) — Admin chọn TRƯỚC khi chụp, KHÔNG
 * suy từ OCR. teamId BẮT BUỘC cho cả 2 documentType (khác OcrCaptureRequest cũ). clientImageId sinh
 * client-side (dedup retry-upload, RULE 4). */
export interface CaptureImageRequest {
  documentType: OcrTargetType;
  workDate: string;
  teamId: string;
  photoPath: string;
  clientImageId: string;
}

/** clientImageId echo lại nguyên văn từ CaptureImageRequest — dùng để khớp ảnh vừa upload trong hàng
 * đợi cục bộ (`useOcrQueue`) với đúng dòng trả về ở đây (id server sinh, client không biết trước). */
export interface ScanImageResponse {
  id: string;
  clientImageId: string;
  photoUrl: string;
  status: ImageStatus;
  dateVerificationStatus: DateVerificationStatus | null;
  dateResolution: DateResolution | null;
  ocrDetectedDate: string | null;
  effectiveWorkDate: string | null;
  pendingMoveTargetBatchId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/** displayOrder tính sẵn ở backend (Spec 1 mục 6 "thứ tự hiển thị") — sort theo field này khi render,
 * không tự suy luận lại ở client. detail là JSON thô, hình dạng tùy conflictType (vd OcrUnmatchedLine
 * cho UNKNOWN_EMPLOYEE) — tự JSON.parse khi cần đọc chi tiết. */
export interface ScanBatchConflictResponse {
  id: string;
  scanImageId: string | null;
  recordTable: string | null;
  recordId: string | null;
  conflictType: ConflictType;
  blocking: boolean;
  status: ConflictStatus;
  detail: string | null;
  displayOrder: number;
}

/** canApprove = đã tính sẵn ở backend (status===READY_TO_APPROVE && không còn conflict blocking OPEN)
 * — dùng thẳng để enable/disable nút "Xác nhận dữ liệu", không tự suy luận lại ở client. */
export interface ScanBatchResponse {
  id: string;
  documentType: OcrTargetType;
  workDate: string;
  teamId: string;
  teamName: string;
  batchType: BatchType;
  originalBatchId: string | null;
  status: BatchStatus;
  canApprove: boolean;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  images: ScanImageResponse[];
  conflicts: ScanBatchConflictResponse[];
}

/** Frontend gọi TRƯỚC khi mở camera — biết ngay có batch FAILED/APPROVED đang giữ key này không
 * (Spec 1 mục 1). batchId/status null khi key đang trống. */
export interface ScanBatchLookupResponse {
  batchId: string | null;
  status: BatchStatus | null;
  blocked: boolean;
}

/** Chỉ chấp nhận KEEP_SESSION_DATE | CHANGE_DATE (Spec 1 mục 4-5). */
export interface ResolveDateRequest {
  resolution: 'KEEP_SESSION_DATE' | 'CHANGE_DATE';
}

/** action: OVERRIDE (giữ nguyên, bỏ qua) | DISCARD (bỏ dòng/ảnh) | ASSIGN_EMPLOYEE (chỉ cho
 * UNKNOWN_EMPLOYEE, bắt buộc employeeId) — xem javadoc ResolveConflictRequest backend. */
export interface ResolveConflictRequest {
  action: 'OVERRIDE' | 'DISCARD' | 'ASSIGN_EMPLOYEE';
  employeeId?: string | null;
}

/** performedBy = literal "SYSTEM" khi hệ thống tự resolve (RULE 13), ngược lại là id user dạng string. */
export interface ScanBatchAuditLogResponse {
  id: string;
  scanImageId: string | null;
  action: string;
  performedBy: string | null;
  performedAt: string;
  oldValue: string | null;
  newValue: string | null;
  sourceBatchId: string | null;
  targetBatchId: string | null;
}

/** Khớp services/api dto/RateConfigResponse.java — đơn giá theo latex_type_id, có hiệu lực theo thời
 * gian (effectiveTo=null = đang hiệu lực, CLAUDE.md §4). */
export interface RateConfigResponse {
  id: string;
  latexTypeId: string;
  latexTypeCode: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

/** Khớp CreateRateConfigRequest.java (tạo) + UpdateRateConfigRequest.java (sửa, không có latexTypeId). */
export interface RateConfigRequest {
  latexTypeId?: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type CalcType = 'PER_DAY' | 'PER_TREE_SECTION' | 'PER_SHIFT' | 'FIXED';

/** Khớp services/api dto/AllowanceConfigResponse.java — cùng ràng buộc chống chồng lấn theo
 * (code, effective_from/to) như RateConfig, nhưng nhiều dòng cùng code theo thời gian là hợp lệ. */
export interface AllowanceConfigResponse {
  id: string;
  code: string;
  name: string;
  calcType: CalcType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Khớp CreateAllowanceConfigRequest.java (tạo, có code) + UpdateAllowanceConfigRequest.java (sửa). */
export interface AllowanceConfigRequest {
  code?: string;
  name: string;
  calcType: CalcType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Khớp services/api entity/AttendanceType.java — "lighting" (tiền đèn) cố ý KHÔNG ở đây, xem
 * CLAUDE.md §4 (phụ cấp cố định/tháng, không gắn chấm công theo ngày). */
export type AttendanceType = 'TAPPING_WORK' | 'ATTENDANCE' | 'STORM_ALLOWANCE' | 'MEDICATION';

/** Khớp services/api dto/CreateAttendanceRecordRequest.java (nhập tay batch, ADR-0007) — ghi thẳng
 * status=confirmed, không qua draft (khác OCR). */
export interface CreateAttendanceRecordRequest {
  recordDate: string;
  employeeId: string;
  attendanceType: AttendanceType;
  quantity: number;
  notes: string | null;
}

/** Khớp services/api dto/AttendanceRecordResponse.java */
export interface AttendanceRecordResponse {
  id: string;
  recordDate: string;
  employeeId: string;
  employeeName: string;
  attendanceType: AttendanceType;
  quantity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  status: AttendanceRecordStatus;
}

/** Hình dạng chung `org.springframework.data.domain.Page<T>` — dùng cho mọi endpoint list/filter có
 * `Pageable` (Phase 4, mặc định size=50 sort=recordDate DESC). Chỉ khai field thực sự dùng ở frontend,
 * Page thật có nhiều field hơn (pageable, sort...) nhưng không cần đọc tới. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/** Khớp services/api dto/EditHistoryResponse.java — oldData/newData là chuỗi JSON snapshot AGGREGATE,
 * tự JSON.parse khi cần hiển thị chi tiết (CLAUDE.md §4). */
export interface EditHistoryResponse {
  id: string;
  tableName: string;
  recordId: string;
  editedBy: string;
  editedByName: string;
  editedAt: string;
  oldData: string;
  newData: string;
}

/** Khớp services/api dto/ProductionReportRow.java — 1 dòng/nhân viên có phát sinh trong kỳ.
 * kgByLatexType key = latex_type code. */
export interface ProductionReportRow {
  teamId: string;
  teamName: string;
  employeeId: string;
  employeeName: string;
  kgByLatexType: Record<string, number>;
  totalKg: number;
}

/** Khớp services/api dto/ProductionReportTeamSubtotal.java */
export interface ProductionReportTeamSubtotal {
  teamId: string;
  teamName: string;
  kgByLatexType: Record<string, number>;
  totalKg: number;
}

/** Khớp services/api dto/ProductionReportResponse.java — CHỈ tính bản ghi CONFIRMED. latexTypeCodes
 * lấy từ toàn bộ danh mục LatexType (ổn định kể cả loại mủ không phát sinh trong kỳ, ADR-0002). */
export interface ProductionReportResponse {
  fromDate: string;
  toDate: string;
  latexTypeCodes: string[];
  latexTypeLabels: Record<string, string>;
  rows: ProductionReportRow[];
  teamSubtotals: ProductionReportTeamSubtotal[];
  grandTotalByLatexType: Record<string, number>;
  grandTotalKg: number;
}

/** Khớp services/api dto/DailyTotalPoint.java — 1 ngày, có thể totalKg = 0. */
export interface DailyTotalPoint {
  recordDate: string;
  totalKg: number;
}

/** Khớp services/api dto/ProductionDailyTrendResponse.java — `days` LUÔN đủ 1 điểm/ngày liên tục từ
 * fromDate tới toDate (kể cả ngày trống), dùng cho biểu đồ "Sản lượng 7 ngày" + trend Home. */
export interface ProductionDailyTrendResponse {
  fromDate: string;
  toDate: string;
  days: DailyTotalPoint[];
}

/** Khớp services/api dto/LatexSaleReportRow.java — 1 dòng/Tổ (đã là mức Tổ). */
export interface LatexSaleReportRow {
  teamId: string;
  teamName: string;
  kgByLatexType: Record<string, number>;
  totalKg: number;
}

/** Khớp services/api dto/LatexSaleReportResponse.java — CHỈ tính bản ghi CONFIRMED. */
export interface LatexSaleReportResponse {
  fromDate: string;
  toDate: string;
  latexTypeCodes: string[];
  latexTypeLabels: Record<string, string>;
  rows: LatexSaleReportRow[];
  grandTotalByLatexType: Record<string, number>;
  grandTotalKg: number;
}

/** Khớp services/api dto/OcrCallLogResponse.java — 1 dòng/lần gọi Claude API, bất kể thành công/lỗi. */
export interface OcrCallLogResponse {
  id: string;
  calledBy: string;
  calledByName: string;
  calledAt: string;
  targetType: OcrTargetType;
  photoUrl: string;
  model: string;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  typeMismatch: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
}

/** Khớp services/api dto/OcrCallLogStatsResponse.java */
export interface OcrCallLogStatsResponse {
  totalCalls: number;
  successCount: number;
  successRate: number;
  typeMismatchCount: number;
  typeMismatchRate: number;
  totalEstimatedCostUsd: number;
  avgDurationMs: number | null;
}

// ===================================================================================
// Module 3 — Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md mục 4). Khớp
// services/api dto/PayrollSummaryResponse.java, PayrollRowResponse.java, PayrollDetailResponse.java,
// PayrollLineItem.java, PayrollRowStatus.java, UpdateDeductionRequest.java, UpdateTechnicalGradeRequest.java.
// ===================================================================================

/** DERIVED, không lưu DB — dựa vào status production_records trong tháng (mục 2.5 spec). */
export type PayrollRowStatus = 'MISSING_DATA' | 'NEEDS_REVIEW' | 'CONFIRMED';

export type TechnicalGrade = 'A' | 'B' | 'C';

/** 1 dòng nhân viên ở Bảng lương — mọi field *Amount đã nhân sẵn (quantity × đơn giá hiện hành),
 * KHÔNG tự tính lại ở client. technicalGrade = null nghĩa là tháng này chưa được xếp hạng. */
export interface PayrollRowResponse {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  waterKg: number;
  waterAmount: number;
  mixedLatexKg: number;
  mixedLatexAmount: number;
  medicationCount: number;
  medicationAmount: number;
  attendanceDays: number;
  attendanceAmount: number;
  stormAllowanceDays: number;
  stormAllowanceAmount: number;
  seasonalWorkDays: number;
  seasonalWorkAmount: number;
  technicalGrade: TechnicalGrade | null;
  technicalGradeAmount: number;
  totalPay: number;
  deduction: number;
  deductionIsOverride: boolean;
  netPay: number;
  rowStatus: PayrollRowStatus;
}

/** Khớp GET /api/v1/payroll — `locked` là cờ đơn giản theo THÁNG, KHÔNG immutable (mục 2.4) — số
 * liệu luôn tính từ dữ liệu nguồn mới nhất dù đã khóa hay chưa. */
export interface PayrollSummaryResponse {
  yearMonth: string; // 'YYYY-MM'
  totalNetPay: number;
  totalEmployees: number;
  needsReviewCount: number;
  missingDataCount: number;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  rows: PayrollRowResponse[];
}

/** 1 dòng breakdown "số lượng × đơn giá = thành tiền" ở panel chi tiết (drill-down). */
export interface PayrollLineItem {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

/** Khớp GET /api/v1/payroll/{employeeId} */
export interface PayrollDetailResponse {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  yearMonth: string;
  lines: PayrollLineItem[];
  technicalGrade: TechnicalGrade | null;
  totalPay: number;
  deduction: number;
  deductionIsOverride: boolean;
  netPay: number;
  rowStatus: PayrollRowStatus;
}

/** PATCH /api/v1/payroll/{employeeId}/deduction — sửa Trừ/Tạm ứng riêng cho 1 người/1 tháng. */
export interface UpdateDeductionRequest {
  amount: number;
}

/** PATCH /api/v1/payroll/{employeeId}/technical-grade — grade: null = xóa dòng gán (bỏ xếp hạng
 * tháng đó, quay lại 0đ). */
export interface UpdateTechnicalGradeRequest {
  grade: TechnicalGrade | null;
}

/** Khớp services/api dto/PayrollMixedLatexRateConfigResponse.java — "Mủ tạp", KHÔNG có key phân
 * biệt (khác RateConfig/AllowanceConfig) — chỉ 1 dòng hiệu lực tại 1 thời điểm cho toàn hệ thống. */
export interface PayrollMixedLatexRateConfigResponse {
  id: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Khớp CreatePayrollMixedLatexRateConfigRequest.java + UpdatePayrollMixedLatexRateConfigRequest.java. */
export interface PayrollMixedLatexRateConfigRequest {
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Khớp services/api dto/TechnicalGradeConfigResponse.java — "Hạng kỹ thuật" A/B/C. */
export interface TechnicalGradeConfigResponse {
  id: string;
  grade: TechnicalGrade;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Khớp CreateTechnicalGradeConfigRequest.java (tạo, có grade) + UpdateTechnicalGradeConfigRequest.java (sửa). */
export interface TechnicalGradeConfigRequest {
  grade?: TechnicalGrade;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
