/** Khớp `UserProfileResponse` (services/api) — GET /api/v1/users/me. */
export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  position: string | null;
}
