import { apiClient } from '@/lib/api/client';
import type { OcrCaptureRequest, OcrCaptureResponse, SignedUploadUrlResponse, UploadContentType } from '@/types/api';

export const ocrApi = {
  getUploadUrl: (contentType: UploadContentType) =>
    apiClient.post<SignedUploadUrlResponse>('/api/v1/ocr/upload-url', { contentType }),
  capture: (body: OcrCaptureRequest) => apiClient.post<OcrCaptureResponse>('/api/v1/ocr/capture', body),
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
