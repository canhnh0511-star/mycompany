import { formatDate, formatKg, formatNumber } from '../../../utils/format';

export { formatDate, formatKg, formatNumber };

/** "dd/MM" — dùng cho trục X trend chart và danh sách ngày ngắn gọn trong alert. */
export function formatShortDate(value: string): string {
  const [, mm, dd] = value.split('-');
  return `${dd}/${mm}`;
}

/** "+8.4%" / "-3.1%" — luôn có dấu, 1 chữ số thập phân. `null` phải được xử lý riêng ở component
 * (spec §13.3 — không hiển thị "0%" giả khi thực chất là "chưa có dữ liệu"). */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function teamStatusLabel(status: 'GOOD' | 'ATTENTION' | 'MISSING_DATA'): string {
  switch (status) {
    case 'GOOD':
      return 'Tốt';
    case 'ATTENTION':
      return 'Cần xem';
    case 'MISSING_DATA':
      return 'Thiếu dữ liệu';
  }
}
