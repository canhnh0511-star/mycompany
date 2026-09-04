import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { queryClient, queryKeys } from '@/lib/query/queryClient';
import type { ImageStatus, OcrTargetType, UploadContentType } from '@/types/api';
import { ocrApi, scanBatchApi, uploadPhotoToSupabase } from './api';

export type QueueItemStatus = 'uploading' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  fileName: string;
  /** URI cục bộ (file://...) — dùng để hiện thumbnail ảnh thật trong hàng đợi (khớp Claude Design 03/04),
   * KHÔNG phải photoPath trên Supabase Storage. */
  uri: string;
  status: QueueItemStatus;
  error?: string;
  /** Sinh client-side, gửi kèm CaptureImageRequest (RULE 4 dedup retry-upload) — dùng để khớp lại
   * đúng dòng trong `ScanBatchResponse.images[]` (server trả về clientImageId nguyên văn). */
  clientImageId: string;
  /** Chỉ có sau khi captureImage() thành công — id ScanBatch chứa ảnh này (thường mọi ảnh trong 1
   * phiên chụp cùng team/ngày/loại phiếu đều merge vào cùng 1 batch, xem `batchId` hook trả về). */
  batchId?: string;
  scanImageId?: string;
  imageStatus?: ImageStatus;
}

/** Tối đa 2 ảnh xử lý song song — né rate-limit Claude API (ADR-0011/§2.4). */
const MAX_CONCURRENT = 2;

function createSemaphore(max: number) {
  let count = 0;
  const waiting: (() => void)[] = [];
  return {
    async acquire() {
      if (count < max) {
        count += 1;
        return;
      }
      await new Promise<void>((resolve) => waiting.push(resolve));
      count += 1;
    },
    release() {
      count -= 1;
      const next = waiting.shift();
      next?.();
    },
  };
}

function guessContentType(uri: string): UploadContentType {
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

function newClientImageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Hàng đợi xử lý ảnh trong bộ nhớ (KHÔNG phải offline queue bền vững — CLAUDE.md §9 đã chấp nhận rủi ro
 * mất mạng ở v1) — mỗi ảnh 1 item `uploading → processing → done/error`, tối đa 2 xử lý song song
 * (ADR-0011). Reset khi rời màn Chụp ảnh (state cục bộ, không phải Zustand — khác `activeTeamId`/
 * `sessionWorkDate` ở `store.ts` vốn cần sống qua điều hướng giữa các tab).
 *
 * 0021-scan-batch-model: mỗi ảnh giờ POST `/scan-batches/images` (thay `/ocr/capture` cũ) — trả về
 * TOÀN BỘ ScanBatch (không chỉ ảnh vừa xử lý). `batchId` hook trả về là id batch mới nhất nhận được —
 * dùng để điều hướng sang màn Batch Review khi bấm "Hoàn tất" (mọi ảnh cùng phiên/team/ngày/loại phiếu
 * merge vào cùng 1 batch trong trường hợp bình thường).
 */
export function useOcrQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const semaphoreRef = useRef(createSemaphore(MAX_CONCURRENT));

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const enqueue = useCallback(
    (uri: string, fileName: string, documentType: OcrTargetType, teamId: string, workDate: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const clientImageId = newClientImageId();
      setItems((prev) => [{ id, fileName, uri, status: 'uploading' as const, clientImageId }, ...prev]);

      (async () => {
        await semaphoreRef.current.acquire();
        try {
          const contentType = guessContentType(uri);
          const { photoPath, uploadUrl } = await ocrApi.getUploadUrl(contentType);
          await uploadPhotoToSupabase(uploadUrl, contentType, uri);

          updateItem(id, { status: 'processing' });
          const response = await scanBatchApi.captureImage({
            documentType,
            workDate,
            teamId,
            photoPath,
            clientImageId,
          });

          setBatchId(response.id);
          const image = response.images.find((img) => img.clientImageId === clientImageId);
          if (!image || image.status === 'FAILED') {
            updateItem(id, {
              status: 'error',
              error: image?.errorMessage ?? 'Lỗi không xác định',
              batchId: response.id,
              scanImageId: image?.id,
              imageStatus: image?.status,
            });
          } else {
            updateItem(id, {
              status: 'done',
              batchId: response.id,
              scanImageId: image.id,
              imageStatus: image.status,
            });
          }
          queryClient.setQueryData(queryKeys.scanBatches.detail(response.id), response);
          queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.drafts() });
          queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.drafts() });
        } catch (err) {
          const message = err instanceof ApiError || err instanceof Error ? err.message : 'Lỗi không xác định';
          updateItem(id, { status: 'error', error: message });
        } finally {
          semaphoreRef.current.release();
        }
      })();

      return id;
    },
    [updateItem],
  );

  // Batch đã APPROVED/CANCELLED (xem CaptureScreen — useFocusEffect gọi khi quay lại màn Chụp ảnh sau
  // khi rời sang Batch Review) — không thể thêm ảnh vào batch đó nữa, dọn sạch hàng đợi cũ để Admin
  // chụp phiên MỚI. Trước đây không có cơ chế này: `items` là state cục bộ tưởng "tự reset khi rời màn"
  // (ghi chú javadoc cũ) nhưng thực ra CaptureScreen KHÔNG unmount khi router.push sang Batch Review rồi
  // back lại (native stack giữ nguyên instance) — phát hiện khi test thật trên iPhone (2026-08-23), user
  // hủy phiên để chụp lại nhưng màn Chụp ảnh vẫn còn nguyên ảnh cũ.
  const reset = useCallback(() => {
    setItems([]);
    setBatchId(null);
  }, []);

  // Ảnh đã bị xóa khỏi batch qua Batch Review (removeImage — vd ACTIVE nhưng đọc sai, Admin xóa để
  // chụp lại, xem BatchReviewScreen) nhưng batch vẫn NEED_REVIEW/READY_TO_APPROVE (non-terminal) nên
  // `reset()` toàn bộ không chạy — thumbnail của ảnh đã xóa vẫn nằm lì trong hàng đợi cục bộ, trong khi
  // trên server ảnh đó đã REPLACED. Chỉ lọc bỏ ĐÚNG item ứng với ảnh đã xóa, giữ nguyên các ảnh khác
  // trong hàng đợi — phát hiện khi test thật trên iPhone (2026-08-23).
  const removeStaleItems = useCallback((activeScanImageIds: Set<string>) => {
    setItems((prev) => prev.filter((it) => !it.scanImageId || activeScanImageIds.has(it.scanImageId)));
  }, []);

  return { items, enqueue, batchId, reset, removeStaleItems };
}
