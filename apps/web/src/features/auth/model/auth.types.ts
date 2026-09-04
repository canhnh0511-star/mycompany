/** Khớp `LoginResponse` (services/api) — POST /api/v1/auth/login. */
export interface LoginResponse {
  accessToken: string;
  userId: string;
  fullName: string;
  role: string;
}
