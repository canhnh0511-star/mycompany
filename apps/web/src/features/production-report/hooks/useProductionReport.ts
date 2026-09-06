import { useQuery } from '@tanstack/react-query';
import { getProductionDashboard } from '../api/productionReportApi';
import { getProductionWorkerDetail } from '../api/productionWorkerApi';
import type { ProductionDashboardFilters } from '../types/productionReport.types';

export function useProductionDashboard(filters: ProductionDashboardFilters) {
  return useQuery({
    queryKey: ['production-report', 'dashboard', filters],
    queryFn: () => getProductionDashboard(filters),
  });
}

export function useProductionWorkerDetail(
  employeeId: string | null,
  filters: { fromDate: string; toDate: string },
) {
  return useQuery({
    queryKey: ['production-report', 'worker-detail', employeeId, filters],
    queryFn: () => getProductionWorkerDetail(employeeId as string, filters),
    enabled: !!employeeId,
  });
}
