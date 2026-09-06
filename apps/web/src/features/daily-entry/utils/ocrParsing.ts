import type { LatexTypeOption } from '../../../api/lookups.api';
import type { ScanBatch } from '../model/scanBatch.types';

/**
 * Parse `low_confidence_fields` — JSON string dạng `{"fields": ["kg:cup","employee_name"]}`
 * (ProductionRecordService.writeLowConfidenceFieldsOrNull — object bọc ngoài `{"fields": [...]}`,
 * KHÔNG PHẢI mảng thuần) — field không kèm loại mủ (không có ":") áp dụng chung cho cả dòng, field
 * có `:<latex_type_code>` chỉ áp dụng đúng loại mủ đó.
 *
 * Bug đã sửa (2026-09-06, phát hiện qua test thật): bản trước đọc thẳng `JSON.parse(raw)` rồi kiểm
 * `Array.isArray` — vì raw thực tế là OBJECT (`{"fields": [...]}`) chứ không phải mảng thuần, check
 * này luôn false → hàm luôn trả EMPTY, khiến toàn bộ tính năng tô ô OCR-không-chắc-chắn theo từng ô
 * chưa từng hoạt động với dữ liệu thật (chỉ vô tình không lộ ra vì ảnh test trước đó không kích hoạt
 * low-confidence field nào).
 */
export interface ParsedLowConfidence {
  nameFlagged: boolean;
  /** latexTypeId (không phải code — đã map qua `latexTypes`) của các cột cần tô riêng. */
  flaggedLatexTypeIds: string[];
  /** true nếu có field số liệu KHÔNG qualify được loại mủ nào — tô tất cả cột số của dòng. */
  genericValueFlagged: boolean;
}

const EMPTY: ParsedLowConfidence = { nameFlagged: false, flaggedLatexTypeIds: [], genericValueFlagged: false };

export function parseLowConfidenceFields(raw: string | null, latexTypes: LatexTypeOption[]): ParsedLowConfidence {
  if (!raw) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  const tokens = Array.isArray(parsed) ? parsed : (parsed as { fields?: unknown })?.fields;
  if (!Array.isArray(tokens)) return EMPTY;

  let nameFlagged = false;
  let genericValueFlagged = false;
  const flaggedLatexTypeIds = new Set<string>();

  for (const token of tokens) {
    if (typeof token !== 'string') continue;
    if (token === 'employee_name') {
      nameFlagged = true;
      continue;
    }
    const separatorIndex = token.indexOf(':');
    if (separatorIndex === -1) {
      genericValueFlagged = true;
      continue;
    }
    const code = token.slice(separatorIndex + 1);
    const latexType = latexTypes.find((t) => t.code === code);
    if (latexType) {
      flaggedLatexTypeIds.add(latexType.id);
    } else {
      genericValueFlagged = true;
    }
  }

  return { nameFlagged, flaggedLatexTypeIds: [...flaggedLatexTypeIds], genericValueFlagged };
}

/** Parse `ocr_column_totals` (JSON string — vd `[{"latex_type_code":"water","total_kg":76.5}]`) ->
 * map latexTypeCode -> tổng kg, để hiển thị "Tổng trên ảnh" trong panel OCR info. */
export function parseOcrColumnTotals(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const entry of parsed) {
      const code = entry?.latex_type_code;
      const totalKg = entry?.total_kg;
      if (typeof code === 'string' && typeof totalKg === 'number') {
        result[code] = totalKg;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * rowIndex gốc trên phiếu giấy cho các nhân viên KHÔNG có `production_record` nào (dòng trống —
 * nghỉ/không cạo, HOẶC đã gộp chung sản lượng vào dòng vợ/chồng — xem
 * `ScanBatchService.captureProductionRecordRows`, `ConflictType.EMPTY_ROW_SKIPPED`). Trước đây bảng
 * roster không có cách nào biết vị trí đúng của các dòng này trên ảnh (không record = không rowIndex),
 * phải TỰ ĐOÁN bằng vị trí mặc định trong danh sách nhân viên — sai lệch so với ảnh gốc (phản hồi
 * trực tiếp). Backend giờ luôn mở 1 conflict EMPTY_ROW_SKIPPED (blocking:false, không hiện thành cảnh
 * báo — `ScanBatchAlertList` không render loại này) kèm `employeeId`/`rowIndex` cho MỌI dòng có tên
 * trên phiếu dù không có số liệu, đọc thẳng ở đây để sắp bảng đúng hơn.
 */
export function getEmptyRowIndexByEmployeeId(batch: ScanBatch): Map<string, number> {
  const result = new Map<string, number>();
  for (const conflict of batch.conflicts) {
    if (conflict.conflictType !== 'EMPTY_ROW_SKIPPED' || !conflict.detail) continue;
    try {
      const parsed = JSON.parse(conflict.detail) as { employeeId?: string; rowIndex?: number };
      if (parsed.employeeId && parsed.rowIndex != null) {
        result.set(parsed.employeeId, parsed.rowIndex);
      }
    } catch {
      /* bỏ qua nếu detail không parse được — dòng đó vẫn rơi về fallback theo vị trí mặc định */
    }
  }
  return result;
}

/** `latexTypeCode` của mọi conflict TOTAL_MISMATCH đang OPEN trong batch — dùng để highlight cả cột
 * tương ứng trên bảng roster (`ProductionRosterTable`), không chỉ hiện text cảnh báo (phản hồi:
 * "phát hiện lệch tổng nhưng không highlight ô nào gây lệch"). */
export function getTotalMismatchLatexTypeCodes(batch: ScanBatch): string[] {
  const codes = new Set<string>();
  for (const conflict of batch.conflicts) {
    if (conflict.status !== 'OPEN' || conflict.conflictType !== 'TOTAL_MISMATCH' || !conflict.detail) continue;
    try {
      const parsed = JSON.parse(conflict.detail) as { latexTypeCode?: string };
      if (parsed.latexTypeCode) codes.add(parsed.latexTypeCode);
    } catch {
      /* bỏ qua nếu detail không parse được — không có cột nào để highlight */
    }
  }
  return [...codes];
}
