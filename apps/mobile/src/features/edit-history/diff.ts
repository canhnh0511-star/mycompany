/**
 * So sánh 2 snapshot AGGREGATE (oldData/newData của 1 dòng edit_history, CLAUDE.md §4) → danh sách
 * dòng thay đổi dạng "trước → sau" để hiển thị ở màn chi tiết record. Chỉ diff các field có ý nghĩa
 * với người xem (bỏ id/createdBy/createdAt/ocrCallLogId/photoUrl/status — status không đổi qua PATCH,
 * chỉ đổi qua confirm/cancel riêng và KHÔNG ghi edit_history cho bước đó, ADR-0006/docs/api.md).
 */

export interface DiffLine {
  label: string;
  before: string;
  after: string;
}

const FIELD_LABELS: Record<string, string> = {
  recordDate: 'Ngày',
  employeeName: 'Nhân viên',
  teamName: 'Tổ',
  buyerName: 'Người mua',
  sellerSignedBy: 'Người ký',
  notes: 'Ghi chú',
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

interface SnapshotItem {
  latexTypeCode: string;
  kg: number;
  drcPercent: number | null;
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function diffSnapshots(oldData: string, newData: string): DiffLine[] {
  const before = safeParse(oldData);
  const after = safeParse(newData);
  const lines: DiffLine[] = [];

  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const beforeValue = fmt(before[key]);
    const afterValue = fmt(after[key]);
    if (beforeValue !== afterValue) {
      lines.push({ label, before: beforeValue, after: afterValue });
    }
  }

  const beforeItems = (before.items as SnapshotItem[] | undefined) ?? [];
  const afterItems = (after.items as SnapshotItem[] | undefined) ?? [];
  const codes = new Set([...beforeItems.map((i) => i.latexTypeCode), ...afterItems.map((i) => i.latexTypeCode)]);

  for (const code of codes) {
    const beforeItem = beforeItems.find((i) => i.latexTypeCode === code);
    const afterItem = afterItems.find((i) => i.latexTypeCode === code);
    const beforeKg = beforeItem ? `${beforeItem.kg} kg` : '—';
    const afterKg = afterItem ? `${afterItem.kg} kg` : '—';
    if (beforeKg !== afterKg) {
      lines.push({ label: code, before: beforeKg, after: afterKg });
    }
    const beforeDrc = fmt(beforeItem?.drcPercent != null ? `${beforeItem.drcPercent}%` : null);
    const afterDrc = fmt(afterItem?.drcPercent != null ? `${afterItem.drcPercent}%` : null);
    if (beforeDrc !== afterDrc) {
      lines.push({ label: `${code} — DRC`, before: beforeDrc, after: afterDrc });
    }
  }

  return lines;
}
