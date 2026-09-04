import { apiGet } from '../../../api/client';
import type { CurrentUser } from '../model/user.types';

export function getCurrentUser(): Promise<CurrentUser> {
  return apiGet<CurrentUser>('/api/v1/users/me');
}
