import { apiPatch, apiPostAuthed } from '../../../api/client';
import type { EmployeeOption, TeamOption } from '../../../api/lookups.api';

// GET đã có sẵn ở `api/lookups.api.ts` (getTeams/getEmployees) — file này chỉ thêm các thao tác GHI
// (create/update) cho Cấu hình hệ thống, dùng chung type `TeamOption`/`EmployeeOption`.

export interface CreateTeamInput {
  name: string;
  description: string | null;
}
export type UpdateTeamInput = CreateTeamInput;

export function createTeam(body: CreateTeamInput): Promise<TeamOption> {
  return apiPostAuthed<TeamOption>('/api/v1/teams', undefined, body);
}
export function updateTeam(id: string, body: UpdateTeamInput): Promise<TeamOption> {
  return apiPatch<TeamOption>(`/api/v1/teams/${id}`, undefined, body);
}

export interface CreateEmployeeInput {
  fullName: string;
  teamId: string;
  userId: string | null;
}
export interface UpdateEmployeeInput {
  fullName: string;
  teamId: string;
  status: 'ACTIVE' | 'INACTIVE';
  userId: string | null;
  spouseEmployeeId: string | null;
}

export function createEmployee(body: CreateEmployeeInput): Promise<EmployeeOption> {
  return apiPostAuthed<EmployeeOption>('/api/v1/employees', undefined, body);
}
export function updateEmployee(id: string, body: UpdateEmployeeInput): Promise<EmployeeOption> {
  return apiPatch<EmployeeOption>(`/api/v1/employees/${id}`, undefined, body);
}
