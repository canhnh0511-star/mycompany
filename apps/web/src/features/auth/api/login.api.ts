import { apiPost } from '../../../api/client';
import type { LoginResponse } from '../model/auth.types';

/**
 * `identifier` nhận cả email lẫn số điện thoại (backend thử email trước, không thấy thử phone —
 * xem LoginRequest.java) — JSON body vẫn gửi key `email` để khớp đúng LoginRequest phía backend
 * (field đó đã mở rộng ý nghĩa nhưng GIỮ NGUYÊN tên key để không phá tương thích ngược).
 */
export function login(identifier: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/v1/auth/login', { email: identifier, password });
}
