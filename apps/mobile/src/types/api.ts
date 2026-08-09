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

export type EmployeeStatus = 'active' | 'inactive';

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

export type RecordStatus = 'draft' | 'confirmed' | 'cancelled';

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
