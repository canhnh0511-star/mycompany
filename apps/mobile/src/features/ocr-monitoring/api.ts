import { apiClient } from '@/lib/api/client';
import type { OcrCallLogResponse, OcrCallLogStatsResponse, OcrTargetType, Page } from '@/types/api';

export interface OcrCallLogFilters {
  targetType?: OcrTargetType;
  success?: boolean;
  /** yyyy-mm-dd — chuyển sang Instant (đầu/cuối ngày UTC) trước khi gửi, xem toInstantRange bên dưới. */
  fromDate?: string;
  toDate?: string;
}

/** Backend nhận `Instant` (docs/adr/0008), không phải LocalDate như report — chuyển ngày Admin chọn
 * thành mốc đầu/cuối ngày UTC. Đơn giản hóa: chấp nhận lệch múi giờ vài giờ ở biên (không cần chính
 * xác tuyệt đối cho màn theo dõi chi phí). */
function toInstantRange(filters: OcrCallLogFilters): { from?: string; to?: string } {
  return {
    from: filters.fromDate ? `${filters.fromDate}T00:00:00Z` : undefined,
    to: filters.toDate ? `${filters.toDate}T23:59:59Z` : undefined,
  };
}

function buildQuery(filters: OcrCallLogFilters) {
  const { from, to } = toInstantRange(filters);
  const params = new URLSearchParams();
  if (filters.targetType) params.set('targetType', filters.targetType);
  if (filters.success !== undefined) params.set('success', String(filters.success));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.toString();
}

/** Theo dõi OCR (Tuần 6, ADR-0019 mục 4) — ocr_call_logs list + /stats, backend có sẵn từ Phase 4. */
export const ocrMonitoringApi = {
  list: (filters: OcrCallLogFilters = {}) => {
    const qs = buildQuery(filters);
    return apiClient.get<Page<OcrCallLogResponse>>(`/api/v1/ocr-call-logs${qs ? `?${qs}` : ''}`);
  },
  stats: (filters: Pick<OcrCallLogFilters, 'fromDate' | 'toDate'> = {}) => {
    const qs = buildQuery(filters);
    return apiClient.get<OcrCallLogStatsResponse>(`/api/v1/ocr-call-logs/stats${qs ? `?${qs}` : ''}`);
  },
};
