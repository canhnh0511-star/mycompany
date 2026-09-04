import { clearAccessToken, getAccessToken } from './tokenStorage';

/**
 * Base URL của Spring Boot API — cấu hình qua biến môi trường Vite
 * (`VITE_API_BASE_URL`, xem `.env.example`). Mặc định trỏ localhost cho dev.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path.replace(/^\//, ''), `${API_BASE_URL}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * GET có kèm Bearer token (nếu có) — dùng cho mọi lời gọi API cần auth.
 * Không log token/response nhạy cảm (CLAUDE.md §7).
 */
export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse<T>(response);
}

/**
 * POST — hiện chỉ dùng cho `/api/v1/auth/login` (không kèm Bearer token, vì lúc gọi chưa có token —
 * chính là request để LẤY token). Không dùng chung handleResponse cho lỗi 401/403 ở đây: sai mật
 * khẩu lúc đăng nhập phải hiện lỗi ngay trên form, không phải redirect vòng lặp về /login.
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await safeErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

/**
 * POST có kèm Bearer token — dùng cho các action ghi cần auth (vd chốt/mở lương). Khác `apiPost`
 * (không token, chỉ dành riêng cho login) — dùng chung `handleResponse` nên 401/403 tự đưa về /login,
 * đúng hành vi mong muốn cho mọi request SAU khi đã đăng nhập.
 */
export async function apiPostAuthed<T>(path: string, params?: QueryParams, body?: unknown): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(buildUrl(path, params), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

/** PATCH có kèm Bearer token — sửa 1 field (vd Trừ/Tạm ứng, Hạng kỹ thuật). */
export async function apiPatch<T>(path: string, params: QueryParams | undefined, body: unknown): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(buildUrl(path, params), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

/**
 * Token thiếu/hết hạn (CLAUDE.md §4 — access token duy nhất, hết hạn 1 ngày, không refresh token) ->
 * backend trả 401/403 (SecurityConfig chưa cấu hình authenticationEntryPoint riêng nên mặc định luôn
 * là 403, kể cả khi CHƯA đăng nhập lần nào — không phải lỗi CORS/backend, xem docs/adr liên quan).
 * Xoá token cũ (nếu có) + đưa thẳng về /login thay vì để mọi widget hiện lỗi. Redirect cứng
 * (window.location) vì đây là code ngoài React tree, không có access tới react-router navigate.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401 || response.status === 403) {
    clearAccessToken();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError(response.status, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }
  if (!response.ok) {
    const message = await safeErrorMessage(response);
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Yêu cầu thất bại (${response.status})`;
  } catch {
    return `Yêu cầu thất bại (${response.status})`;
  }
}
