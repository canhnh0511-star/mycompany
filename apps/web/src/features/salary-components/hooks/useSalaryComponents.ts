import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/salaryComponents.api';

export { useLatexTypes } from '../../../hooks/useLookups';

// ===== Mủ nước =====

export function useRateConfigs(latexTypeId: string | undefined) {
  return useQuery({
    queryKey: ['rate-configs', latexTypeId],
    queryFn: () => api.getRateConfigs(latexTypeId),
    enabled: !!latexTypeId,
  });
}

function useInvalidate(queryKey: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [queryKey] });
}

export function useCreateRateConfig() {
  const invalidate = useInvalidate('rate-configs');
  return useMutation({ mutationFn: api.createRateConfig, onSuccess: invalidate });
}

export function useUpdateRateConfig() {
  const invalidate = useInvalidate('rate-configs');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateRateConfigInput }) => api.updateRateConfig(id, body),
    onSuccess: invalidate,
  });
}

// ===== Mủ tạp =====

export function useMixedLatexRateConfigs() {
  return useQuery({ queryKey: ['mixed-latex-rate-configs'], queryFn: api.getMixedLatexRateConfigs });
}

export function useCreateMixedLatexRateConfig() {
  const invalidate = useInvalidate('mixed-latex-rate-configs');
  return useMutation({ mutationFn: api.createMixedLatexRateConfig, onSuccess: invalidate });
}

export function useUpdateMixedLatexRateConfig() {
  const invalidate = useInvalidate('mixed-latex-rate-configs');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.MixedLatexRateConfigInput }) =>
      api.updateMixedLatexRateConfig(id, body),
    onSuccess: invalidate,
  });
}

// ===== Phụ cấp / khấu trừ =====

export function useAllowanceConfigs() {
  return useQuery({ queryKey: ['allowance-configs'], queryFn: api.getAllowanceConfigs });
}

export function useCreateAllowanceConfig() {
  const invalidate = useInvalidate('allowance-configs');
  return useMutation({ mutationFn: api.createAllowanceConfig, onSuccess: invalidate });
}

export function useUpdateAllowanceConfig() {
  const invalidate = useInvalidate('allowance-configs');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateAllowanceConfigInput }) =>
      api.updateAllowanceConfig(id, body),
    onSuccess: invalidate,
  });
}

// ===== Hạng kỹ thuật =====

export function useTechnicalGradeConfigs() {
  return useQuery({ queryKey: ['technical-grade-configs'], queryFn: api.getTechnicalGradeConfigs });
}

export function useCreateTechnicalGradeConfig() {
  const invalidate = useInvalidate('technical-grade-configs');
  return useMutation({ mutationFn: api.createTechnicalGradeConfig, onSuccess: invalidate });
}

export function useUpdateTechnicalGradeConfig() {
  const invalidate = useInvalidate('technical-grade-configs');
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.UpdateTechnicalGradeConfigInput }) =>
      api.updateTechnicalGradeConfig(id, body),
    onSuccess: invalidate,
  });
}
