import { Text } from '@/components/ui/text';

/**
 * Lớp abstraction App* trên gluestack-ui (ADR-0015) — feature code import từ đây, KHÔNG import
 * thẳng `@/components/ui/*`. Hiện tại chỉ re-export (chưa cần tùy biến thêm); mọi override token/
 * hành vi dùng chung sau này (vd style lỗi validate) sửa ở đây, không sửa từng nơi gọi.
 */
export const AppText = Text;
