import { apiGet, apiPatch, apiPostAuthed } from '../../../api/client';
import type { BatchResult } from '../../../api/batch.types';

/** Khớp `LatexItemRequest.java`. */
export interface LatexItemInput {
  latexTypeId: string;
  kg: number;
  drcPercent: number | null;
}

/** Khớp `CreateProductionRecordRequest.java` — nhập tay ghi thẳng source=manual, status=confirmed
 * (không qua draft, ADR-0006 chỉ áp dụng luồng OCR). */
export interface CreateProductionRecordInput {
  recordDate: string;
  employeeId: string;
  notes: string | null;
  items: LatexItemInput[];
}

/** Khớp `ProductionRecordResponse.java` — chỉ khai field bảng roster thật sự dùng tới. */
export interface ProductionRecordResult {
  id: string;
  recordDate: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  notes: string | null;
  status: string;
  items: { latexTypeId: string; latexTypeCode: string; kg: number; drcPercent: number | null }[];
  /** JSON string mảng field OCR đọc không chắc — xem `utils/ocrParsing.ts::parseLowConfidenceFields`. */
  lowConfidenceFields: string | null;
}

export function createProductionRecordsBatch(
  rows: CreateProductionRecordInput[],
): Promise<BatchResult<ProductionRecordResult>> {
  return apiPostAuthed<BatchResult<ProductionRecordResult>>('/api/v1/production-records/batch', undefined, rows);
}

/** Toàn bộ record (nhập tay + OCR, bất kể scanBatch nào) của 1 Tổ trong 1 ngày — nguồn dữ liệu
 * chính cho bảng roster hợp nhất (mục B2): mỗi employee trong roster khớp tối đa 1 record active
 * (partial unique index `employee_id+record_date`, CLAUDE.md §4) cho đúng ngày này. `PageableDefault`
 * backend 50/trang — 1 Tổ hiếm khi >50 công nhân, đặt `size` rộng hơn cho chắc. */
export function getProductionRecordsByTeamAndDate(teamId: string, date: string): Promise<{ content: ProductionRecordResult[] }> {
  return apiGet<{ content: ProductionRecordResult[] }>('/api/v1/production-records', {
    teamId,
    fromDate: date,
    toDate: date,
    size: 200,
  });
}

/** Khớp `UpdateProductionRecordRequest.java` — sửa aggregate toàn bộ, `items` thay thế HOÀN TOÀN
 * danh sách cũ (không patch từng item). */
export interface UpdateProductionRecordInput {
  recordDate: string;
  employeeId: string;
  notes: string | null;
  items: LatexItemInput[];
}

export function updateProductionRecord(id: string, body: UpdateProductionRecordInput): Promise<ProductionRecordResult> {
  return apiPatch<ProductionRecordResult>(`/api/v1/production-records/${id}`, undefined, body);
}
