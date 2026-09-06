import { useMemo, useState } from 'react';
import { toIsoDate } from '../../../utils/format';

export type QuickRange = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Tính khoảng ngày cho 1 lựa chọn nhanh (spec §4.2). */
export function rangeFor(quick: QuickRange): { fromDate: string; toDate: string } {
  const now = new Date();
  switch (quick) {
    case 'today':
      return { fromDate: toIsoDate(now), toDate: toIsoDate(now) };
    case 'last7': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { fromDate: toIsoDate(from), toDate: toIsoDate(now) };
    }
    case 'lastMonth': {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { fromDate: toIsoDate(startOfMonth(lastMonthDate)), toDate: toIsoDate(endOfMonth(lastMonthDate)) };
    }
    case 'thisMonth':
    default:
      return { fromDate: toIsoDate(startOfMonth(now)), toDate: toIsoDate(now) };
  }
}

/** State bộ lọc dùng chung cho toàn Dashboard (spec §4) — mọi widget đọc chung 1 filter. */
export function useProductionReportFilters() {
  const initial = rangeFor('thisMonth');
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [teamId, setTeamId] = useState('');

  function applyQuickRange(quick: QuickRange) {
    const { fromDate: from, toDate: to } = rangeFor(quick);
    setFromDate(from);
    setToDate(to);
  }

  const filters = useMemo(
    () => ({ fromDate, toDate, teamId: teamId || undefined }),
    [fromDate, toDate, teamId],
  );

  return { fromDate, setFromDate, toDate, setToDate, teamId, setTeamId, applyQuickRange, filters };
}
