import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '../api/reports.api';

export { useTeams, useEmployees } from '../../../hooks/useLookups';

export function useProductionReport(filters: api.ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'production', filters],
    queryFn: () => api.getProductionReport(filters),
    enabled,
  });
}

export function useLatexSaleReport(filters: Omit<api.ReportFilters, 'employeeId'>, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'latex-sales', filters],
    queryFn: () => api.getLatexSaleReport(filters),
    enabled,
  });
}

export function useExportProductionXlsx() {
  return useMutation({ mutationFn: api.exportProductionXlsx });
}
export function useExportProductionPdf() {
  return useMutation({ mutationFn: api.exportProductionPdf });
}
export function useExportLatexSaleXlsx() {
  return useMutation({ mutationFn: api.exportLatexSaleXlsx });
}
export function useExportLatexSalePdf() {
  return useMutation({ mutationFn: api.exportLatexSalePdf });
}
