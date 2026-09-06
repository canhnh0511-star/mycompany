import { apiGet } from './client';

/** Khớp `EditHistoryResponse.java` — `oldData`/`newData` là JSON string nguyên văn (snapshot
 * AGGREGATE, CLAUDE.md §4), client tự parse. Dùng chung cho Danh sách phiếu (Phase 3) và Bán mủ
 * (Phase 4) — cả 2 đều cần xem lịch sử chỉnh sửa theo `tableName`+`recordId`. */
export interface EditHistoryEntry {
  id: string;
  tableName: string;
  recordId: string;
  editedBy: string;
  editedByName: string;
  editedAt: string;
  oldData: string;
  newData: string;
}

export function getEditHistory(tableName: string, recordId: string): Promise<EditHistoryEntry[]> {
  return apiGet<EditHistoryEntry[]>('/api/v1/edit-history', { tableName, recordId });
}

/** So sánh oldData/newData (đã parse JSON) — trả danh sách field thực sự đổi giá trị, dạng
 * "field: cũ → mới" để hiển thị timeline. So sánh nông (1 cấp) — snapshot record aggregate có thể
 * chứa mảng `items` lồng nhau, trường hợp đó hiện nguyên JSON rút gọn thay vì so sánh sâu. */
export function diffEditHistoryFields(oldDataRaw: string, newDataRaw: string): { field: string; from: string; to: string }[] {
  let oldObj: Record<string, unknown> = {};
  let newObj: Record<string, unknown> = {};
  try {
    oldObj = JSON.parse(oldDataRaw) as Record<string, unknown>;
  } catch {
    /* để trống nếu parse lỗi — hiện như không có field cũ */
  }
  try {
    newObj = JSON.parse(newDataRaw) as Record<string, unknown>;
  } catch {
    /* để trống nếu parse lỗi */
  }
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const diffs: { field: string; from: string; to: string }[] = [];
  for (const key of keys) {
    const before = oldObj[key];
    const after = newObj[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    diffs.push({ field: key, from: stringifyValue(before), to: stringifyValue(after) });
  }
  return diffs;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
