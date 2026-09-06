import { apiGet } from '../../../api/client';

export interface ProductionWorkerDetail {
  employeeId: string;
  employeeName: string;
  teamName: string;
  fromDate: string;
  toDate: string;
  totalKg: number;
  recordedDayCount: number;
  kgByLatexType: Record<string, number>;
  dailyTrend: { recordDate: string; totalKg: number }[];
}

export function getProductionWorkerDetail(
  employeeId: string,
  filters: { fromDate: string; toDate: string },
): Promise<ProductionWorkerDetail> {
  return apiGet<ProductionWorkerDetail>(
    `/api/v1/reports/production-records/dashboard/workers/${employeeId}`,
    { fromDate: filters.fromDate, toDate: filters.toDate },
  );
}
