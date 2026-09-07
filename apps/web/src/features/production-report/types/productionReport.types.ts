/**
 * Data contract cho Dashboard "Báo cáo sản lượng" — khớp `ProductionDashboardResponse`
 * (services/api ProductionDashboardService). Số liệu sản lượng dùng `number | null`: `null` nghĩa là
 * KHÔNG ĐỦ CƠ SỞ / KHÔNG CÓ DỮ LIỆU (spec §13/§25 "0 khác null") — component hiển thị phải phân biệt
 * rõ, không coi `null` như `0`.
 */

export type AlertSeverity = 'RED' | 'AMBER' | 'BLUE';
export type TeamStatus = 'GOOD' | 'ATTENTION' | 'MISSING_DATA';
export type AlertLinkType = 'TEAM' | 'DATE' | 'SCAN_BATCH';

export interface ProductionDashboardSummary {
  totalProductionKg: number;
  averagePerRecordedDayKg: number | null;
  averagePerWorkerKg: number | null;
  recordedDayCount: number;
  workerCount: number;
  totalDaysInRange: number;
  completedDayCount: number;
  previousPeriodChangePercent: number | null;
  previousPeriodChangeKg: number | null;
  previousPeriodAvailable: boolean;
}

export interface ProductionTrendPoint {
  date: string;
  currentKg: number | null;
  previousDate: string;
  previousPeriodKg: number | null;
}

export interface RubberTypeProduction {
  code: string;
  label: string;
  productionKg: number;
  percentage: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  productionKg: number;
  workerCount: number;
  averagePerWorkerKg: number | null;
  changePercent: number | null;
  status: TeamStatus;
}

export interface TopWorker {
  employeeId: string;
  employeeName: string;
  teamId: string;
  teamName: string;
  productionKg: number;
  /** kg theo từng loại mủ (key = code, khớp `latexTypeCodes`/`latexTypeLabels` ở response cha) —
   * dùng cho popup "Xem thêm" (top 10, đủ cột từng loại mủ + cột Tổng). */
  kgByLatexType: Record<string, number>;
}

export interface ProductionAlert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  description: string;
  linkType: AlertLinkType | null;
  linkTeamId: string | null;
  linkDate: string | null;
  linkScanBatchId: string | null;
}

export interface ProductionDataCompleteness {
  totalDaysInRange: number;
  confirmedDays: number;
  pendingDays: number;
  noDataDays: number;
  completionPercent: number;
  documentsNeedingReview: number;
}

export interface ProductionHeatmapCell {
  date: string;
  teamId: string;
  teamName: string;
  productionKg: number | null;
  workerCount: number | null;
  documentCount: number;
  kgByLatexType: Record<string, number>;
}

export interface ProductionDashboardResponse {
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
  latexTypeCodes: string[];
  latexTypeLabels: Record<string, string>;
  summary: ProductionDashboardSummary;
  trend: ProductionTrendPoint[];
  rubberTypes: RubberTypeProduction[];
  teamPerformance: TeamPerformance[];
  topWorkers: TopWorker[];
  alerts: ProductionAlert[];
  completeness: ProductionDataCompleteness;
  heatmap: ProductionHeatmapCell[];
}

export interface ProductionDashboardFilters {
  fromDate: string;
  toDate: string;
  teamId?: string;
}
