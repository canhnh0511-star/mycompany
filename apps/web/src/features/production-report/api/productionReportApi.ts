import { apiGet } from '../../../api/client';
import type { ProductionDashboardFilters, ProductionDashboardResponse } from '../types/productionReport.types';

export function getProductionDashboard(filters: ProductionDashboardFilters): Promise<ProductionDashboardResponse> {
  return apiGet<ProductionDashboardResponse>('/api/v1/reports/production-records/dashboard', {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    teamId: filters.teamId,
  });
}
