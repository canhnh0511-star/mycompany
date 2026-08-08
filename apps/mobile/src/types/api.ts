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
