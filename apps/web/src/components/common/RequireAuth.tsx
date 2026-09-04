import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getAccessToken } from '../../api/tokenStorage';

/**
 * Chưa có token -> chưa từng đăng nhập -> đưa thẳng về /login thay vì để MainLayout render rồi mọi
 * widget đồng loạt 403 (xem client.ts#handleResponse — token hết hạn GIỮA phiên vẫn xử lý ở đó,
 * component này chỉ chặn lúc mới load app mà chưa đăng nhập lần nào).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = getAccessToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
