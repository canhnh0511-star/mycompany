/** yyyy-MM-dd local (không dùng toISOString() — lệch múi giờ). Mặc định filter mở màn Báo cáo:
 * đầu tháng hiện tại → hôm nay (kỳ hay xem nhất, Admin tự đổi nếu cần khoảng khác). */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultReportDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fromDate: toIsoDate(firstOfMonth), toDate: toIsoDate(now) };
}
