import { apiGet } from '../../../api/client';
import type {
  DashboardKpis,
  PayrollSummaryData,
  RecentDocumentRow,
  TeamStatusRow,
  WorkQueueItemData,
} from '../model/dashboard.types';
import {
  fixtureKpis,
  fixturePayrollSummary,
  fixtureRecentDocuments,
  fixtureTeamStatus,
  fixtureWorkQueue,
} from './dashboardFixtures';

/**
 * Mỗi panel gọi API riêng (không dùng 1 endpoint gộp) — đúng tinh thần spec
 * §4 (TanStack Query quản lý riêng dashboard/work queue/team summary/payroll/
 * recent documents) và §33 (1 widget lỗi không được kéo sập cả dashboard).
 *
 * Backend hiện CHƯA có các endpoint `/api/v1/dashboard/*` này — cần
 * services/api triển khai tương ứng. Cho tới lúc đó, các hook dưới sẽ trả về
 * trạng thái lỗi (đúng như spec §33 mô tả), TRỪ khi chạy `npm run dev`, khi
 * đó dùng fixture để xem trước giao diện khớp design đã duyệt — fixture bị
 * loại khỏi bundle production (xem dashboardFixtures.ts).
 */
const USE_DEV_FIXTURES = import.meta.env.DEV;

export function getKpis(workDate: string): Promise<DashboardKpis> {
  if (USE_DEV_FIXTURES) return Promise.resolve(fixtureKpis(workDate));
  return apiGet<DashboardKpis>('/api/v1/dashboard/kpis', { date: workDate });
}

export function getWorkQueue(workDate: string): Promise<WorkQueueItemData[]> {
  if (USE_DEV_FIXTURES) return Promise.resolve(fixtureWorkQueue(workDate));
  return apiGet<WorkQueueItemData[]>('/api/v1/dashboard/work-queue', { date: workDate });
}

export function getTeamStatus(workDate: string): Promise<TeamStatusRow[]> {
  if (USE_DEV_FIXTURES) return Promise.resolve(fixtureTeamStatus());
  return apiGet<TeamStatusRow[]>('/api/v1/dashboard/teams', { date: workDate });
}

export function getPayrollSummary(month: string): Promise<PayrollSummaryData> {
  if (USE_DEV_FIXTURES) return Promise.resolve(fixturePayrollSummary(month));
  return apiGet<PayrollSummaryData>('/api/v1/dashboard/payroll-summary', { month });
}

export function getRecentDocuments(workDate: string): Promise<RecentDocumentRow[]> {
  if (USE_DEV_FIXTURES) return Promise.resolve(fixtureRecentDocuments(workDate));
  return apiGet<RecentDocumentRow[]>('/api/v1/dashboard/recent-documents', {
    date: workDate,
    limit: 6,
  });
}
