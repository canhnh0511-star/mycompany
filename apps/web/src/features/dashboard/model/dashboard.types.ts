import type { StatusTone } from '../../../components/common/StatusBadge';

export interface Trend {
  direction: 'up' | 'down' | 'neutral';
  /** vd "12%" — đã format sẵn, component không tự tính. */
  value: string;
  label: string;
  /** up không mặc định = tốt (vd chi phí tăng là xấu) — backend quyết định semantic. */
  semantic: 'positive' | 'negative' | 'neutral';
}

export interface TeamProductionShare {
  teamName: string;
  kg: number;
}

export interface DashboardKpis {
  workDate: string;
  productionKg?: number;
  productionByTeam?: TeamProductionShare[];
  workforcePresent?: number;
  /** Chỉ hiển thị "present / expected" khi có roster đáng tin cậy (spec §13). */
  workforceExpected?: number;
  soldKg?: number;
  soldRevenue?: number;
  costAmount?: number;
  costCount?: number;
  estimatedProfit?: number;
  trends?: {
    production?: Trend;
    workforce?: Trend;
    sold?: Trend;
    cost?: Trend;
    estimatedProfit?: Trend;
  };
}

export type WorkQueueSeverity = 'warning' | 'error' | 'info';

export interface WorkQueueItemData {
  id: string;
  severity: WorkQueueSeverity;
  title: string;
  description?: string;
  actionLabel: string;
  actionHref: string;
}

export type TeamDataStatus = 'complete' | 'missing' | 'needs_review';

export const TEAM_STATUS_LABEL: Record<TeamDataStatus, string> = {
  complete: 'Đủ dữ liệu',
  missing: 'Thiếu phiếu',
  needs_review: 'Cần kiểm tra',
};

export const TEAM_STATUS_TONE: Record<TeamDataStatus, StatusTone> = {
  complete: 'success',
  missing: 'warning',
  needs_review: 'info',
};

export interface TeamStatusRow {
  teamId: string;
  teamName: string;
  productionKg: number;
  workforcePresent: number;
  workforceExpected: number;
  soldKg: number;
  status: TeamDataStatus;
}

export type PayrollBucket = 'complete' | 'incomplete' | 'pending_confirmation' | 'finalized';

export const PAYROLL_BUCKET_LABEL: Record<PayrollBucket, string> = {
  complete: 'Đủ dữ liệu',
  incomplete: 'Thiếu dữ liệu',
  pending_confirmation: 'Chờ xác nhận',
  finalized: 'Đã chốt',
};

export interface PayrollDistributionSlice {
  bucket: PayrollBucket;
  count: number;
}

export interface PayrollSummaryData {
  month: string;
  /**
   * Module 1 chưa tính lương tự động (cần rate_configs + allowance_configs + attendance +
   * production + logic tính lương — việc của Module 3, ngoài phạm vi Module 1, xem CLAUDE.md mục 1).
   * Backend luôn trả null cho field này — PayrollSummaryPanel tự hiện "Chưa có dữ liệu" khi null.
   */
  totalExpected?: number;
  employeeCount: number;
  needsReviewCount: number;
  distribution: PayrollDistributionSlice[];
  detailHref: string;
}

export type DocumentType = 'production' | 'latex_sale';

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  production: 'Sổ ghi mủ',
  latex_sale: 'Sổ bán mủ',
};

/** Mapping UI chuẩn — spec §2. Không hiển thị trực tiếp thuật ngữ backend. */
export type DocumentStatus =
  | 'draft'
  | 'processing'
  | 'need_review'
  | 'ready_to_approve'
  | 'approved'
  | 'failed'
  | 'cancelled';

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Bản nháp',
  processing: 'Đang xử lý',
  need_review: 'Cần kiểm tra',
  ready_to_approve: 'Sẵn sàng xác nhận',
  approved: 'Đã xác nhận',
  failed: 'Xử lý thất bại',
  cancelled: 'Đã hủy',
};

export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, StatusTone> = {
  draft: 'neutral',
  processing: 'info',
  need_review: 'warning',
  ready_to_approve: 'info',
  approved: 'success',
  failed: 'error',
  cancelled: 'neutral',
};

export interface RecentDocumentRow {
  id: string;
  code: string;
  documentType: DocumentType;
  recordDate: string;
  teamName: string;
  status: DocumentStatus;
}
