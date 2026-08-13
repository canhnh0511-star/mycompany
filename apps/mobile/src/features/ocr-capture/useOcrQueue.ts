import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { queryClient, queryKeys } from '@/lib/query/queryClient';
import type { OcrCaptureResponse, OcrTargetType, UploadContentType } from '@/types/api';
import { ocrApi, uploadPhotoToSupabase } from './api';
import { useOcrReviewStore } from './reviewStore';

export type QueueItemStatus = 'uploading' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  fileName: string;
  /** URI cục bộ (file://...) — dùng để hiện thumbnail ảnh thật trong hàng đợi (khớp Claude Design 03/04),
   * KHÔNG phải photoPath trên Supabase Storage. */
  uri: string;
  status: QueueItemStatus;
  error?: string;
  response?: OcrCaptureResponse;
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

/**
 * Hàng đợi xử lý ảnh trong bộ nhớ (KHÔNG phải offline queue bền vững — CLAUDE.md §9 đã chấp nhận rủi ro
 * mất mạng ở v1) — mỗi ảnh 1 item `uploading → processing → done/error`, tối đa 2 xử lý song song
 * (ADR-0011). Reset khi rời màn Chụp ảnh (state cục bộ, không phải Zustand — khác `activeTeamId` ở
 * `store.ts` vốn cần sống qua điều hướng giữa các tab).
 */
export function useOcrQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const semaphoreRef = useRef(createSemaphore(MAX_CONCURRENT));
  const addReview = useOcrReviewStore((s) => s.addResponse);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const enqueue = useCallback(
    (uri: string, fileName: string, targetType: OcrTargetType, teamId: string | null) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [{ id, fileName, uri, status: 'uploading' as const }, ...prev]);

      (async () => {
        await semaphoreRef.current.acquire();
        try {
          const contentType = guessContentType(uri);
          const { photoPath, uploadUrl } = await ocrApi.getUploadUrl(contentType);
          await uploadPhotoToSupabase(uploadUrl, contentType, uri);

          updateItem(id, { status: 'processing' });
          const response = await ocrApi.capture({ targetType, photoPath, teamId });

          if (!response.success) {
            updateItem(id, { status: 'error', error: response.errorMessage ?? 'Lỗi không xác định', response });
          } else if (response.typeMismatch) {
            updateItem(id, {
              status: 'error',
              error: response.mismatchReason ?? 'Ảnh không khớp loại phiếu đã chọn',
              response,
            });
          } else {
            updateItem(id, { status: 'done', response });
            addReview(response); // truyền response sang màn Review qua store (route param không mang được object)
            queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.drafts() });
            queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.drafts() });
          }
        } catch (err) {
          const message = err instanceof ApiError || err instanceof Error ? err.message : 'Lỗi không xác định';
          updateItem(id, { status: 'error', error: message });
        } finally {
          semaphoreRef.current.release();
        }
      })();

      return id;
    },
    [updateItem, addReview],
  );

  return { items, enqueue };
}
