import { heatmapScale } from '../../../theme/colors';

export type TrendSemantic = 'positive' | 'negative' | 'neutral';

/** Xanh nếu tăng, đỏ nếu giảm, xám nếu bằng (spec §5.2). */
export function trendSemantic(value: number | null): TrendSemantic {
  if (value == null || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

/**
 * Màu ô heatmap theo scale sequential green — dynamic theo min/max của khoảng ngày/lọc hiện tại
 * (spec §12.4 "không dùng absolute threshold cứng"). `null` (no-data) trả về `heatmapScale.noData`.
 */
export function heatmapColorFor(kg: number | null, maxKg: number): string {
  if (kg == null) return heatmapScale.noData;
  if (maxKg <= 0) return heatmapScale.veryLow;
  const ratio = kg / maxKg;
  if (ratio <= 0) return heatmapScale.veryLow;
  if (ratio < 0.2) return heatmapScale.veryLow;
  if (ratio < 0.45) return heatmapScale.low;
  if (ratio < 0.7) return heatmapScale.medium;
  if (ratio < 0.9) return heatmapScale.high;
  return heatmapScale.veryHigh;
}
