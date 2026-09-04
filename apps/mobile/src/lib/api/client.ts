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
  /** 401 ở endpoint này KHÔNG có nghĩa "hết phiên đăng nhập" — vd PATCH /users/me/password trả 401 khi
   * gõ sai MẬT KHẨU HIỆN TẠI (BadCredentialsException, vẫn dùng chung access token hợp lệ), không phải
   * token hết hạn/không hợp lệ. Nếu thiếu cờ này, `request()` sẽ tự logout + điều hướng login (đúng cho
   * MỌI endpoint khác) — sai hoàn toàn ở đây (bug tìm thấy lúc test trên emulator 2026-08-25: gõ sai mật
   * khẩu hiện tại làm user bị đăng xuất luôn với thông báo "Phiên đăng nhập hết hạn", thay vì báo lỗi
   * tại chỗ). Đặt `true` để 401 chỉ ném `ApiError` bình thường, không chạm token/điều hướng. */
  skipUnauthorizedHandler?: boolean;
  /** ms trước khi tự abort — mặc định DEFAULT_TIMEOUT_MS. `fetch` KHÔNG có timeout mặc định, nên nếu
   * kết nối mạng thực địa chập chờn (CLAUDE.md §9) khiến request treo, app chỉ thấy spinner quay mãi,
   * không bao giờ tự thoát ra lỗi để cho phép thử lại — phát hiện khi test thật trên iPhone
   * (2026-08-23). Override cao hơn cho endpoint biết trước có thể chạy lâu hợp lệ (vd captureImage —
   * OCR backend giờ có ceiling riêng 120s, xem ClaudeOcrService). */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

// Log request/response ra console — CHỈ dev build (`__DEV__`, biến global do Metro/RN tự inject, luôn
// `false` trong production bundle nên tự loại bỏ khỏi build thật, không cần tắt tay). Không log
// header/body (có thể chứa Authorization/mật khẩu) — chỉ method/path/status/thời gian, đủ để debug
// network mà không vi phạm tinh thần "không log dữ liệu nhạy cảm" (CLAUDE.md §7, áp cho cả frontend).
function logRequest(method: string, path: string) {
  if (__DEV__) console.log(`[api] → ${method} ${path}`);
}
function logResponse(method: string, path: string, status: number, startedAt: number) {
  if (__DEV__) console.log(`[api] ← ${method} ${path} ${status} (${Date.now() - startedAt}ms)`);
}
function logError(method: string, path: string, error: unknown, startedAt: number) {
  if (__DEV__) console.log(`[api] ✗ ${method} ${path} lỗi (${Date.now() - startedAt}ms):`, error);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    skipAuth,
    skipUnauthorizedHandler,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    ...rest
  } = options;
  const method = rest.method ?? 'GET';
  const startedAt = Date.now();

  // Tôn trọng signal caller truyền vào (nếu có) — nối với timeout tự tạo qua AbortSignal.any, không
  // ghi đè mất khả năng caller tự hủy request.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

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

  logRequest(method, path);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      signal: combinedSignal,
    });
  } catch (err) {
    // Lỗi network trần (mất mạng, DNS, CORS...) — fetch không tự có status, log riêng để phân biệt với
    // lỗi HTTP có status ở nhánh dưới (CLAUDE.md §9 rủi ro mất mạng thực địa). AbortError do timeout tự
    // tạo ở trên đổi thành thông báo dễ hiểu thay vì để lộ "AbortError" kỹ thuật ra UI.
    logError(method, path, err, startedAt);
    if (err instanceof Error && err.name === 'AbortError' && !signal?.aborted) {
      throw new Error('Mất kết nối tới máy chủ — thử lại giúp tôi.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  logResponse(method, path, response.status, startedAt);

  if (response.status === 401 && !skipAuth && !skipUnauthorizedHandler) {
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
