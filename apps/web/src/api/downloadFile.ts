import { API_BASE_URL } from './client';
import { getAccessToken } from './tokenStorage';

/**
 * Tải file Excel/PDF — KHÔNG dùng `window.open` (không gửi kèm được Bearer token, backend yêu cầu
 * auth cho mọi route trừ /auth/login). Tự `fetch` lấy `blob`, tạo `<a>` tạm rồi thu hồi ngay sau khi
 * click (tránh rò rỉ object URL). Tách ra đây (trước ở `features/reports/api/reports.api.ts`) để
 * `features/payroll` dùng lại thay vì tự viết lại y hệt.
 */
export async function downloadFile(
  path: string,
  params: Record<string, string | undefined>,
  fileName: string,
): Promise<void> {
  const url = new URL(path.replace(/^\//, ''), `${API_BASE_URL}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const token = getAccessToken();
  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Tải file thất bại (${response.status})`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
