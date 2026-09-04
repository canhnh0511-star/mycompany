import type {
  DashboardKpis,
  PayrollSummaryData,
  RecentDocumentRow,
  TeamStatusRow,
  WorkQueueItemData,
} from '../model/dashboard.types';

/**
 * Fixture CHỈ dùng khi chạy dev server chưa nối backend thật
 * (`import.meta.env.DEV` — xem dashboard.api.ts). Vite thay `import.meta.env.DEV`
 * bằng literal `false` khi build production nên nhánh gọi các hàm này bị loại
 * bỏ hoàn toàn khỏi bundle production (dead-code elimination) — không có dữ
 * liệu mock nào lọt vào runtime production (CLAUDE.md §41/DoD).
 *
 * Số liệu khớp ảnh reference đã duyệt: docs/design/home-dashboard-reference.png.
 */

export function fixtureKpis(workDate: string): DashboardKpis {
  return {
    workDate,
    productionKg: 1804,
    productionByTeam: [
      { teamName: 'Tổ 1', kg: 742 },
      { teamName: 'Tổ 2', kg: 612 },
      { teamName: 'Tổ 3', kg: 450 },
    ],
    workforcePresent: 21,
    workforceExpected: 30,
    soldKg: 1684,
    soldRevenue: 72_450_000,
    costAmount: 18_750_000,
    costCount: 8,
    estimatedProfit: 53_700_000,
    trends: {
      production: { direction: 'up', value: '12%', label: 'so với hôm qua', semantic: 'positive' },
      workforce: { direction: 'up', value: '4', label: 'so với hôm qua', semantic: 'positive' },
      sold: { direction: 'up', value: '8%', label: 'so với hôm qua', semantic: 'positive' },
      cost: { direction: 'up', value: '6%', label: 'so với hôm qua', semantic: 'negative' },
      estimatedProfit: { direction: 'up', value: '10%', label: 'so với hôm qua', semantic: 'positive' },
    },
  };
}

export function fixtureWorkQueue(workDate: string): WorkQueueItemData[] {
  return [
    {
      id: '1',
      severity: 'warning',
      title: `Tổ 3 chưa có phiếu ngày ${shortDate(workDate)}`,
      description: 'Cần chụp phiếu để có dữ liệu sản lượng',
      actionLabel: 'Chụp / Xem',
      actionHref: `/phieu?team=to-3&date=${workDate}`,
    },
    {
      id: '2',
      severity: 'warning',
      title: '2 phiếu cần kiểm tra',
      description: 'OCR có độ tin cậy thấp',
      actionLabel: 'Kiểm tra',
      actionHref: `/phieu?status=need-review&date=${workDate}`,
    },
    {
      id: '3',
      severity: 'error',
      title: '2 người chưa có sản lượng',
      description: 'Không thể tính lương',
      actionLabel: 'Xem danh sách',
      actionHref: `/san-luong?filter=missing&date=${workDate}`,
    },
    {
      id: '4',
      severity: 'info',
      title: 'Bảng lương tháng 09 còn 3 người thiếu dữ liệu',
      description: 'Cần bổ sung để chốt bảng lương',
      actionLabel: 'Xem chi tiết',
      actionHref: '/bang-luong/2026-09?filter=incomplete',
    },
    {
      id: '5',
      severity: 'info',
      title: 'Chi phí chờ duyệt: 2 khoản',
      description: 'Tổng số tiền: 4.250.000 đ',
      actionLabel: 'Duyệt ngay',
      actionHref: `/chi-phi?status=pending&date=${workDate}`,
    },
  ];
}

export function fixtureTeamStatus(): TeamStatusRow[] {
  return [
    { teamId: 'to-1', teamName: 'Tổ 1', productionKg: 742, workforcePresent: 8, workforceExpected: 10, soldKg: 700, status: 'complete' },
    { teamId: 'to-2', teamName: 'Tổ 2', productionKg: 612, workforcePresent: 9, workforceExpected: 10, soldKg: 584, status: 'complete' },
    { teamId: 'to-3', teamName: 'Tổ 3', productionKg: 450, workforcePresent: 4, workforceExpected: 10, soldKg: 400, status: 'missing' },
  ];
}

export function fixturePayrollSummary(month: string): PayrollSummaryData {
  return {
    month,
    totalExpected: 120_500_000,
    employeeCount: 30,
    needsReviewCount: 3,
    distribution: [
      { bucket: 'complete', count: 27 },
      { bucket: 'incomplete', count: 3 },
      { bucket: 'pending_confirmation', count: 0 },
      { bucket: 'finalized', count: 0 },
    ],
    detailHref: `/bang-luong/${month}`,
  };
}

export function fixtureRecentDocuments(workDate: string): RecentDocumentRow[] {
  return [
    { id: '7', code: 'PH-2026-0904-0007', documentType: 'production', recordDate: workDate, teamName: 'Tổ 2', status: 'need_review' },
    { id: '6', code: 'PH-2026-0904-0006', documentType: 'latex_sale', recordDate: workDate, teamName: 'Tổ 1', status: 'approved' },
    { id: '5', code: 'PH-2026-0904-0005', documentType: 'production', recordDate: workDate, teamName: 'Tổ 1', status: 'approved' },
    { id: '4', code: 'PH-2026-0904-0004', documentType: 'production', recordDate: workDate, teamName: 'Tổ 3', status: 'draft' },
  ];
}

function shortDate(iso: string): string {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
}
