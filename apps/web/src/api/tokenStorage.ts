/**
 * Lưu JWT access token trên web — cùng key với apps/mobile (ADR-0010) để nhất
 * quán quy ước đặt tên giữa 2 nền tảng, dù đây là 2 origin/app riêng biệt.
 */
const TOKEN_KEY = 'mycompany_access_token';

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage có thể bị chặn (chế độ private nghiêm ngặt) — bỏ qua, không throw.
  }
}

export function clearAccessToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}
