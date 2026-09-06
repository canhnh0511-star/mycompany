/**
 * Xuất CSV client-side cho bảng "Hiệu suất theo Tổ" — spec §4.2 yêu cầu menu Xuất báo cáo có option
 * CSV bên cạnh Excel/PDF; Excel/PDF tái dùng endpoint export sẵn có của báo cáo phẳng
 * (ProductionReportTab), CSV không cần round-trip backend vì dữ liệu đã có sẵn ở dashboard.
 */
export function downloadCsv(fileName: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
