import { apiClient } from '@/lib/api/client';
import type {
  CaptureImageRequest,
  OcrTargetType,
  ResolveConflictRequest,
  ResolveDateRequest,
  ScanBatchAuditLogResponse,
  ScanBatchLookupResponse,
  ScanBatchResponse,
  SignedUploadUrlResponse,
  UploadContentType,
} from '@/types/api';

export const ocrApi = {
  getUploadUrl: (contentType: UploadContentType) =>
    apiClient.post<SignedUploadUrlResponse>('/api/v1/ocr/upload-url', { contentType }),
};

/**
 * Scan Session/Batch (0021-scan-batch-model, Spec 1) — thay thế hẳn `ocrApi.capture` cũ
 * (`POST /api/v1/ocr/capture`, 1 ảnh → N draft độc lập). Mọi endpoint trả về TOÀN BỘ `ScanBatchResponse`
 * (không chỉ phần vừa đổi) — frontend luôn render lại từ response mới nhất, không tự suy state.
 */
export const scanBatchApi = {
  /** Gọi TRƯỚC khi mở camera — biết ngay có batch FAILED/APPROVED đang giữ đúng key
   * (documentType+teamId+workDate) này không, để hiện banner chặn ngay tại màn chọn loại phiếu thay vì
   * để Admin chụp xong mới nhận 409 (Spec 1 mục 1). */
  lookup: (documentType: OcrTargetType, teamId: string, workDate: string) =>
    apiClient.get<ScanBatchLookupResponse>(
      `/api/v1/scan-batches/lookup?documentType=${documentType}&teamId=${teamId}&workDate=${workDate}`,
    ),
  /** 1 request/1 ảnh — tạo/merge batch, OCR, verify ngày, detect conflict, tạo draft, recompute status. */
  captureImage: (body: CaptureImageRequest) =>
    apiClient.post<ScanBatchResponse>('/api/v1/scan-batches/images', body),
  get: (batchId: string) => apiClient.get<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}`),
  retryImage: (imageId: string) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/images/${imageId}/retry`),
  /** Batch-level "Thử lại" trên banner FAILED — retry mọi ảnh FAILED trong batch cùng lúc. */
  retryBatch: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/retry`),
  /** "Hủy phiên này" trên banner FAILED, hoặc reject 1 Supplement đang review (Spec 1 mục 5). */
  cancel: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/cancel`),
  resolveDate: (imageId: string, body: ResolveDateRequest) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/images/${imageId}/resolve-date`, body),
  /** Theo conflictId (không phải imageId) — 1 ảnh có thể có nhiều conflict cùng lúc. */
  resolveConflict: (conflictId: string, body: ResolveConflictRequest) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/conflicts/${conflictId}/resolve`, body),
  approve: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/approve`),
  auditLog: (batchId: string) =>
    apiClient.get<ScanBatchAuditLogResponse[]>(`/api/v1/scan-batches/${batchId}/audit-log`),
};

/**
 * PUT thẳng file lên Supabase Storage bằng chính `uploadUrl` đã ký sẵn (kèm token trong query string) —
 * KHÔNG qua `apiClient` (không cần/không nên gắn JWT của backend vào request này, và base URL khác
 * hẳn — xem SupabaseStorageService.createSignedUploadUrl ở backend).
 */
export async function uploadPhotoToSupabase(uploadUrl: string, contentType: UploadContentType, fileUri: string) {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Tải ảnh lên thất bại (HTTP ${res.status})`);
  }
}
