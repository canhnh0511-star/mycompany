import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveScanBatch,
  cancelScanBatch,
  captureScanImage,
  getScanBatch,
  getUploadUrl,
  lookupScanBatch,
  recheckScanBatchTotal,
  removeScanImage,
  resolveScanBatchConflict,
  resolveScanImageDate,
  retryScanBatch,
  retryScanImage,
  uploadPhotoToSupabase,
  type UploadContentType,
} from '../api/scanBatch.api';
import type { OcrTargetType, ScanBatch } from '../model/scanBatch.types';

const scanBatchKey = (batchId: string) => ['scan-batch', batchId] as const;

export function useScanBatchLookup(documentType: OcrTargetType, teamId: string, workDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ['scan-batch-lookup', documentType, teamId, workDate],
    queryFn: () => lookupScanBatch(documentType, teamId, workDate),
    enabled,
  });
}

export function useScanBatch(batchId: string | null) {
  return useQuery({
    queryKey: batchId ? scanBatchKey(batchId) : ['scan-batch', 'none'],
    queryFn: () => getScanBatch(batchId as string),
    enabled: batchId !== null,
  });
}

function contentTypeOf(file: File): UploadContentType {
  return file.type === 'image/png' ? 'image/png' : 'image/jpeg';
}

/** Mọi action Scan Batch trả về TOÀN BỘ `ScanBatch` mới nhất — ghi thẳng vào cache thay vì invalidate
 * + refetch (đúng nguyên tắc trong comment `ScanBatchController`: luôn render lại từ response, không
 * tự suy state ở client). */
function useWriteScanBatchCache() {
  const queryClient = useQueryClient();
  return (batch: ScanBatch) => queryClient.setQueryData(scanBatchKey(batch.id), batch);
}

/**
 * Upload + OCR 1 ảnh (upload-url -> PUT Supabase -> captureImage) — trả về `ScanBatch` mới nhất, kể
 * cả khi đây là ảnh ĐẦU TIÊN của 1 batch chưa tồn tại (backend tự tạo). Gọi TUẦN TỰ từng ảnh ở nơi
 * dùng hook này (không `Promise.all`) — khớp thiết kế "1 request/1 ảnh, đồng bộ" của backend.
 */
export function useCaptureScanImage() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({
    mutationFn: async (params: { documentType: OcrTargetType; workDate: string; teamId: string; file: File }) => {
      const contentType = contentTypeOf(params.file);
      const signed = await getUploadUrl(contentType);
      await uploadPhotoToSupabase(signed.uploadUrl, contentType, params.file);
      return captureScanImage({
        documentType: params.documentType,
        workDate: params.workDate,
        teamId: params.teamId,
        photoPath: signed.photoPath,
        clientImageId: crypto.randomUUID(),
      });
    },
    onSuccess: writeCache,
  });
}

export function useRetryScanImage() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (imageId: string) => retryScanImage(imageId), onSuccess: writeCache });
}

export function useRemoveScanImage() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (imageId: string) => removeScanImage(imageId), onSuccess: writeCache });
}

export function useResolveScanImageDate() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({
    mutationFn: ({ imageId, resolution }: { imageId: string; resolution: 'KEEP_SESSION_DATE' | 'CHANGE_DATE' }) =>
      resolveScanImageDate(imageId, resolution),
    onSuccess: writeCache,
  });
}

export function useResolveScanBatchConflict() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({
    mutationFn: ({
      conflictId,
      action,
      employeeId,
    }: {
      conflictId: string;
      action: 'OVERRIDE' | 'DISCARD' | 'ASSIGN_EMPLOYEE';
      employeeId?: string;
    }) => resolveScanBatchConflict(conflictId, { action, employeeId }),
    onSuccess: writeCache,
  });
}

export function useRecheckScanBatchTotal() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (conflictId: string) => recheckScanBatchTotal(conflictId), onSuccess: writeCache });
}

export function useApproveScanBatch() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (batchId: string) => approveScanBatch(batchId), onSuccess: writeCache });
}

export function useRetryScanBatch() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (batchId: string) => retryScanBatch(batchId), onSuccess: writeCache });
}

export function useCancelScanBatch() {
  const writeCache = useWriteScanBatchCache();
  return useMutation({ mutationFn: (batchId: string) => cancelScanBatch(batchId), onSuccess: writeCache });
}
