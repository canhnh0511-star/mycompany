import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/client';

/**
 * Backend CHƯA có hệ thống thông báo — cùng pattern fixture dev-only như
 * dashboard.api.ts (xem ghi chú ở đó): số hiển thị khi `npm run dev` chỉ để
 * khớp ảnh reference, bị Vite loại khỏi bundle production. Ở production,
 * request thật sẽ lỗi (chưa có endpoint) -> count undefined -> TopBar không
 * hiện badge, đúng rule "không mock dữ liệu production".
 */
const USE_DEV_FIXTURE = import.meta.env.DEV;

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: (): Promise<number> => {
      if (USE_DEV_FIXTURE) return Promise.resolve(3);
      return apiGet<{ count: number }>('/api/v1/notifications/unread-count').then((res) => res.count);
    },
    staleTime: 60_000,
    retry: false,
  });
}
