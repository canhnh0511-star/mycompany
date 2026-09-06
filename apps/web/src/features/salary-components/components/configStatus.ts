import type { StatusTone } from '../../../components/common/StatusBadge';
import { toIsoDate } from '../../../utils/format';

/**
 * Trạng thái hiển thị (KHÔNG lưu DB) của 1 dòng config time-versioned, suy ra từ effectiveFrom/To
 * so với hôm nay — giúp Admin nhận ra ngay dòng nào đang thật sự áp dụng khi liệt kê cả lịch sử.
 */
export function getConfigStatus(effectiveFrom: string, effectiveTo: string | null): { label: string; tone: StatusTone } {
  const today = toIsoDate(new Date());
  if (effectiveFrom > today) return { label: 'Sắp áp dụng', tone: 'info' };
  if (effectiveTo && effectiveTo < today) return { label: 'Đã hết hạn', tone: 'neutral' };
  return { label: 'Đang áp dụng', tone: 'success' };
}
