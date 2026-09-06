import { useQuery } from '@tanstack/react-query';
import { getEmployees, getLatexTypes, getTeams, type EmployeeFilters } from '../api/lookups.api';

/** `queryKey` cố định dùng chung — mọi feature gọi cùng hook này share 1 cache, tránh gọi lại nhiều nơi. */
export function useLatexTypes() {
  return useQuery({ queryKey: ['latex-types'], queryFn: getLatexTypes });
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: getTeams });
}

export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters ?? {}],
    queryFn: () => getEmployees(filters),
  });
}
