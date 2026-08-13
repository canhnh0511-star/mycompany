/** yyyy-MM-dd local (không dùng toISOString() — lệch múi giờ). Mặc định filter mở màn Báo cáo:
 * đầu tháng hiện tại → hôm nay (kỳ hay xem nhất, Admin tự đổi nếu cần khoảng khác). Export để tái dùng
 * ở Home (`features/home/HomeScreen.tsx`, Phase 4 module-1-1-frontend-redesign) — cùng 1 nguồn tính
 * "hôm nay" thay vì mỗi nơi tự viết lại. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function defaultReportDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fromDate: toIsoDate(firstOfMonth), toDate: toIsoDate(now) };
}

/** 7 ngày gần nhất TÍNH CẢ hôm nay (hôm nay - 6 → hôm nay) — dùng cho Home "Sản lượng 7 ngày" +
 * trend "so với TB 7 ngày" (module-1-1-frontend-redesign, gọi `GET .../daily-trend`). */
export function last7DaysRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const sixDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return { fromDate: toIsoDate(sixDaysAgo), toDate: toIsoDate(now) };
}
