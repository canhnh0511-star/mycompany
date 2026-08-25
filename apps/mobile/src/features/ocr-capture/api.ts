import { apiClient } from '@/lib/api/client';
import type {
  CaptureImageRequest,
  OcrTargetType,
  ResolveConflictRequest,
  ResolveDateRequest,
  ScanBatchAuditLogResponse,
  ScanBatchLookupResponse,
  ScanBatchPendingCountResponse,
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
  /** 1 request/1 ảnh — tạo/merge batch, OCR, verify ngày, detect conflict, tạo draft, recompute status.
   * timeoutMs cao hơn default (30s) — backend gọi Claude Vision đồng bộ, ceiling riêng 120s
   * (ClaudeOcrService), request client phải chờ được LÂU HƠN ceiling đó mới không tự abort sai khi
   * backend vẫn đang xử lý hợp lệ. */
  captureImage: (body: CaptureImageRequest) =>
    apiClient.post<ScanBatchResponse>('/api/v1/scan-batches/images', body, { timeoutMs: 150_000 }),
  get: (batchId: string) => apiClient.get<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}`),
  retryImage: (imageId: string) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/images/${imageId}/retry`),
  /** Xóa (soft) 1 ảnh chụp/chọn nhầm khỏi batch — chỉ áp dụng ảnh FAILED, xem javadoc
   * ScanBatchService.removeImage(). */
  removeImage: (imageId: string) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/images/${imageId}/remove`),
  /** Batch-level "Thử lại" trên banner FAILED — retry mọi ảnh FAILED trong batch cùng lúc. */
  retryBatch: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/retry`),
  /** "Hủy phiên này" trên banner FAILED, hoặc reject 1 Supplement đang review (Spec 1 mục 5). */
  cancel: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/cancel`),
  resolveDate: (imageId: string, body: ResolveDateRequest) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/images/${imageId}/resolve-date`, body),
  /** Theo conflictId (không phải imageId) — 1 ảnh có thể có nhiều conflict cùng lúc. */
  resolveConflict: (conflictId: string, body: ResolveConflictRequest) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/conflicts/${conflictId}/resolve`, body),
  /** Gọi SAU khi Admin sửa xong 1 dòng thuộc ảnh đang có TOTAL_MISMATCH open — khớp lại thì tự đóng
   * cảnh báo, còn lệch thì cập nhật số lệch mới nhất. */
  recheckTotal: (conflictId: string) =>
    apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/conflicts/${conflictId}/recheck-total`),
  approve: (batchId: string) => apiClient.post<ScanBatchResponse>(`/api/v1/scan-batches/${batchId}/approve`),
  auditLog: (batchId: string) =>
    apiClient.get<ScanBatchAuditLogResponse[]>(`/api/v1/scan-batches/${batchId}/audit-log`),
  /** Home "Chờ kiểm tra" (2026-08-25) — số batch đang chờ xử lý, đếm THEO BATCH (không phải theo số
   * dòng draft production_records/latex_sales phát sinh — 1 batch có thể tạo nhiều dòng). */
  pendingCount: () => apiClient.get<ScanBatchPendingCountResponse>('/api/v1/scan-batches/pending-count'),
};

/**
 * PUT thẳng file lên Supabase Storage bằng chính `uploadUrl` đã ký sẵn (kèm token trong query string) —
 * KHÔNG qua `apiClient` (không cần/không nên gắn JWT của backend vào request này, và base URL khác
 * hẳn — xem SupabaseStorageService.createSignedUploadUrl ở backend).
 */
// fetch trần không có timeout mặc định — mạng thực địa chập chờn (CLAUDE.md §9) có thể khiến PUT treo
// vô thời hạn, app chỉ thấy spinner "Đang tải lên..." mãi không bao giờ báo lỗi để thử lại (phát hiện
// khi test thật trên iPhone, cùng lớp lỗi với apiClient — xem lib/api/client.ts). 60s đủ rộng cho ảnh
// chụp phiếu qua mạng di động chậm.
const UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadPhotoToSupabase(uploadUrl: string, contentType: UploadContentType, fileUri: string) {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
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
