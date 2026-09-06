import { apiGet, apiPostAuthed } from '../../../api/client';
import type { OcrTargetType, ScanBatch, ScanBatchLookup } from '../model/scanBatch.types';

export type UploadContentType = 'image/jpeg' | 'image/png';

interface SignedUploadUrl {
  photoPath: string;
  uploadUrl: string;
  token: string;
}

/** Bước 1/2 upload ảnh — xin URL ký sẵn để PUT thẳng lên Supabase Storage (CLAUDE.md §5, ADR-0005). */
export function getUploadUrl(contentType: UploadContentType): Promise<SignedUploadUrl> {
  return apiPostAuthed<SignedUploadUrl>('/api/v1/ocr/upload-url', undefined, { contentType });
}

// Mạng chập chờn không chỉ là rủi ro thực địa mobile (CLAUDE.md §9) — 1 PUT treo vô thời hạn trên web
// cũng chỉ hiện spinner mãi không báo lỗi để thử lại. Cùng ceiling 60s như mobile
// (apps/mobile/src/features/ocr-capture/api.ts::uploadPhotoToSupabase).
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * PUT thẳng `file` lên Supabase Storage bằng `uploadUrl` đã ký sẵn — KHÔNG qua `apiPostAuthed` (không
 * gắn JWT của backend vào request này, base URL khác hẳn). Port lại từ
 * `apps/mobile/src/features/ocr-capture/api.ts::uploadPhotoToSupabase` — cơ chế giống hệt, chỉ khác
 * nguồn Blob: mobile đọc từ `fileUri` qua `fetch`, web dùng thẳng `File` (đã là 1 `Blob`).
 */
export async function uploadPhotoToSupabase(uploadUrl: string, contentType: UploadContentType, file: File) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Mất kết nối khi tải ảnh lên — thử lại giúp tôi.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    throw new Error(`Tải ảnh lên thất bại (HTTP ${res.status})`);
  }
}

export function lookupScanBatch(documentType: OcrTargetType, teamId: string, workDate: string): Promise<ScanBatchLookup> {
  return apiGet<ScanBatchLookup>('/api/v1/scan-batches/lookup', { documentType, teamId, workDate });
}

/** 1 request/1 ảnh, đồng bộ — backend gọi Claude Vision, ceiling 120s (ClaudeOcrService). Không set
 * timeout ở tầng fetch cho request này (khác upload ảnh) vì client PHẢI chờ được lâu hơn ceiling đó,
 * nếu không sẽ tự abort sai khi backend vẫn đang xử lý hợp lệ — cùng lý do đã ghi ở mobile. */
export function captureScanImage(body: {
  documentType: OcrTargetType;
  workDate: string;
  teamId: string;
  photoPath: string;
  clientImageId: string;
}): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>('/api/v1/scan-batches/images', undefined, body);
}

export function getScanBatch(batchId: string): Promise<ScanBatch> {
  return apiGet<ScanBatch>(`/api/v1/scan-batches/${batchId}`);
}

export function retryScanImage(imageId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/images/${imageId}/retry`);
}

export function removeScanImage(imageId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/images/${imageId}/remove`);
}

export function resolveScanImageDate(imageId: string, resolution: 'KEEP_SESSION_DATE' | 'CHANGE_DATE'): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/images/${imageId}/resolve-date`, undefined, { resolution });
}

export function resolveScanBatchConflict(
  conflictId: string,
  body: { action: 'OVERRIDE' | 'DISCARD' | 'ASSIGN_EMPLOYEE'; employeeId?: string },
): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/conflicts/${conflictId}/resolve`, undefined, body);
}

export function recheckScanBatchTotal(conflictId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/conflicts/${conflictId}/recheck-total`);
}

export function approveScanBatch(batchId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/${batchId}/approve`);
}

/** Banner FAILED "Thử lại" (mọi ảnh FAILED trong batch cùng lúc) — CLAUDE.md UX note cảnh báo lỗi
 * ngay tại chỗ, kèm hành động khôi phục thay vì chỉ báo lỗi suông. */
export function retryScanBatch(batchId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/${batchId}/retry`);
}

/** Banner FAILED "Hủy phiên này". */
export function cancelScanBatch(batchId: string): Promise<ScanBatch> {
  return apiPostAuthed<ScanBatch>(`/api/v1/scan-batches/${batchId}/cancel`);
}
