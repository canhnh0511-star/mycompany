import { tokenStorage } from '@/lib/auth/tokenStorage';

/**
 * apiClient — điểm DUY NHẤT mọi feature gọi backend qua đó (ADR-0009). Gắn Authorization header,
 * và là nơi DUY NHẤT xử lý 401 (clear token + điều hướng login) — không rải rác try/catch 401 ở
 * từng feature. Dựng trên `fetch` trần, không dùng axios (ADR-0009).
 *
 * Base URL đọc từ EXPO_PUBLIC_API_BASE_URL (biến env public của Expo, inline lúc build — xem
 * https://docs.expo.dev/guides/environment-variables/). Mặc định trỏ localhost:8080 cho dev, khớp
 * `server.port` của services/api (application.yml).
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
console.log('[DEBUG] apiClient: API_BASE_URL =', API_BASE_URL);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Đăng ký bởi root layout lúc app khởi động (cần useRouter() nên không gọi router trực tiếp từ đây) —
// xem src/app/_layout.tsx.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown; // object thường (đã JSON.stringify sẵn nếu là FormData/Blob thì tự truyền qua headers riêng)
  skipAuth?: boolean; // dùng cho POST /auth/login — chưa có token để gắn
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body; // để browser/RN tự set Content-Type multipart kèm boundary
    } else {
      finalHeaders.set('Content-Type', 'application/json');
      finalBody = JSON.stringify(body);
    }
  }

  if (!skipAuth) {
    const token = await tokenStorage.get();
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  console.log('[DEBUG] apiClient: fetch', `${API_BASE_URL}${path}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });
  console.log('[DEBUG] apiClient: response', response.status, path);

  if (response.status === 401 && !skipAuth) {
    await tokenStorage.clear();
    onUnauthorized?.();
    throw new ApiError(401, 'Phiên đăng nhập hết hạn');
  }

  if (!response.ok) {
    // ProblemDetail (RFC 7807) từ GlobalExceptionHandler backend — xem CLAUDE.md §7.
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, problem?.detail ?? problem?.title ?? response.statusText, problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
