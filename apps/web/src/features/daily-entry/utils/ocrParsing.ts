import type { LatexTypeOption } from '../../../api/lookups.api';

/**
 * Parse `low_confidence_fields` (JSON string, mảng string — vd `["kg:cup","employee_name"]`) —
 * khớp prompt OCR đã sửa (mục A2, ClaudeOcrService): field không kèm loại mủ (không có ":") áp dụng
 * chung cho cả dòng, field có `:<latex_type_code>` chỉ áp dụng đúng loại mủ đó.
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
  let tokens: unknown;
  try {
    tokens = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
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
