import { useMemo } from 'react';
import { useEmployeesLookupQuery, useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { useProductionRecordsListQuery } from '@/features/production-records/useProductionRecordsList';
import type { EmployeeResponse, TeamResponse } from '@/types/api';

export interface TeamDailySummary {
  team: TeamResponse;
  status: 'done' | 'partial' | 'none';
  submittedCount: number;
  totalCount: number;
  /** Tên nhân viên active CHƯA có phiếu (kể cả draft) trong ngày — rỗng khi status !== 'partial'. */
  missingEmployeeNames: string[];
}

/**
 * Trạng thái từng Tổ trong 1 ngày (✓ Hoàn tất / ⚠ Cần kiểm tra (thiếu 1 phần) / ○ Chưa có phiếu) — dùng
 * chung cho Home ("Tổ hôm nay", Phase 4) và màn "Ngày làm việc" (features/team-workday, Phase riêng
 * SAU §16 — user yêu cầu bổ sung 2026-08-13). Tách ra đây thay vì để riêng mỗi màn tự tính để tránh 2
 * nơi lệch logic (Home vốn chỉ cần `status`, màn Ngày làm việc cần thêm `missingEmployeeNames`).
 *
 * "Có phiếu" tính theo `productionToday` (list API, gồm cả DRAFT) — KHÔNG dùng report (chỉ tính
 * CONFIRMED) vì sẽ báo sai "chưa có phiếu" cho Tổ vừa chụp ảnh nhưng chưa qua review (đúng lưu ý cũ ở
 * Phase 4 audit). KHÔNG cần API mới — ghép từ 3 API lookup/list đã có sẵn.
 */
export function useTeamDailySummaries(date: string) {
  const teams = useTeamsLookupQuery();
  const activeEmployees = useEmployeesLookupQuery({ status: 'ACTIVE' });
  const productionOfDay = useProductionRecordsListQuery({ fromDate: date, toDate: date });

  const isLoading = teams.isLoading || activeEmployees.isLoading || productionOfDay.isLoading;
  const isError = teams.isError || activeEmployees.isError || productionOfDay.isError;
  const error = teams.error ?? activeEmployees.error ?? productionOfDay.error;

  const summaries = useMemo<TeamDailySummary[]>(() => {
    const employeesByTeam = new Map<string, EmployeeResponse[]>();
    for (const e of activeEmployees.data ?? []) {
      if (!employeesByTeam.has(e.teamId)) employeesByTeam.set(e.teamId, []);
      employeesByTeam.get(e.teamId)!.push(e);
    }
    const submittedIdsByTeam = new Map<string, Set<string>>();
    for (const r of productionOfDay.data?.content ?? []) {
      if (!submittedIdsByTeam.has(r.teamId)) submittedIdsByTeam.set(r.teamId, new Set());
      submittedIdsByTeam.get(r.teamId)!.add(r.employeeId);
    }
    return (teams.data ?? []).map((team) => {
      const employees = employeesByTeam.get(team.id) ?? [];
      const submittedIds = submittedIdsByTeam.get(team.id) ?? new Set<string>();
      const missing = employees.filter((e) => !submittedIds.has(e.id));
      const status: TeamDailySummary['status'] =
        submittedIds.size === 0 ? 'none' : missing.length === 0 && employees.length > 0 ? 'done' : 'partial';
      return {
        team,
        status,
        submittedCount: submittedIds.size,
        totalCount: employees.length,
        missingEmployeeNames: status === 'partial' ? missing.map((e) => e.fullName) : [],
      };
    });
  }, [teams.data, activeEmployees.data, productionOfDay.data]);

  return { summaries, isLoading, isError, error };
}
