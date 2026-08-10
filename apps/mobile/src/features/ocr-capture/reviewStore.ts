import { create } from 'zustand';
import type { OcrCaptureResponse } from '@/types/api';

interface OcrReviewState {
  /** Keyed theo `ocrCallLogId` — route `/ocr-review/[logId]` chỉ truyền được string qua URL param,
   * object response đầy đủ (kèm items) phải sống ở đây. Chỉ là bộ nhớ tạm truyền dữ liệu giữa 2 màn
   * (Chụp ảnh → Review) — nguồn sự thật vẫn là draft row trên server (ADR-0012); mất entry ở đây (app
   * bị kill giữa chừng) không mất dữ liệu, chỉ mất khả năng mở lại đúng response gốc từ đây, Admin vẫn
   * xem lại draft qua tab Tra cứu. */
  responses: Record<string, OcrCaptureResponse>;
  addResponse: (response: OcrCaptureResponse) => void;
  removeResponse: (ocrCallLogId: string) => void;
}

export const useOcrReviewStore = create<OcrReviewState>((set) => ({
  responses: {},
  addResponse: (response) =>
    set((state) => ({ responses: { ...state.responses, [response.ocrCallLogId]: response } })),
  removeResponse: (ocrCallLogId) =>
    set((state) => {
      const { [ocrCallLogId]: _removed, ...rest } = state.responses;
      return { responses: rest };
    }),
}));
