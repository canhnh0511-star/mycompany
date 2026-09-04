/**
 * Utility format dùng chung — spec §32: "Tạo utility dùng chung, không format
 * rải rác trong component."
 */

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
});

const WEEKDAY_LABELS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

/** "120.500.000 ₫" */
export function formatCurrency(value: number): string {
  return `${currencyFormatter.format(value)} ₫`;
}

/** "1.804 kg" */
export function formatKg(value: number): string {
  return `${numberFormatter.format(value)} kg`;
}

/** "1.804" — dùng trong bảng khi đơn vị đã ghi ở tiêu đề cột. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "04/09/2026" — nhận Date hoặc chuỗi ISO (yyyy-MM-dd). */
export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? parseIsoDate(value) : value;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** "04/09/2026 (Thứ Sáu)" — dùng cho date selector trên top bar. */
export function formatDateWithWeekday(value: Date | string): string {
  const date = typeof value === 'string' ? parseIsoDate(value) : value;
  return `${formatDate(date)} (${WEEKDAY_LABELS[date.getDay()]})`;
}

/** "2026-08" -> "Tháng 08/2026". */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `Tháng ${month}/${year}`;
}

/** Date -> "yyyy-MM-dd" (dùng làm query param / key, không phụ thuộc timezone). */
export function toIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(value: string): Date {
  const [yyyy, mm, dd] = value.split('-').map(Number);
  return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1);
}
