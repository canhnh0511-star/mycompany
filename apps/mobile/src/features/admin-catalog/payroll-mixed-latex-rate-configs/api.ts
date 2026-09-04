import { apiClient } from '@/lib/api/client';
import type { PayrollMixedLatexRateConfigRequest, PayrollMixedLatexRateConfigResponse } from '@/types/api';

/** "Mủ tạp" (Module 3 — Bảng lương). Không có DELETE — giữ lịch sử đơn giá (CLAUDE.md §4). Overlap
 * effective_from/to chặn 409 ở backend (không phân biệt theo key nào — chỉ 1 dòng hiệu lực tại 1
 * thời điểm cho toàn hệ thống). */
export const payrollMixedLatexRateConfigsApi = {
  list: () => apiClient.get<PayrollMixedLatexRateConfigResponse[]>('/api/v1/payroll-mixed-latex-rate-configs'),
  create: (body: PayrollMixedLatexRateConfigRequest) =>
    apiClient.post<PayrollMixedLatexRateConfigResponse>('/api/v1/payroll-mixed-latex-rate-configs', body),
  update: (id: string, body: PayrollMixedLatexRateConfigRequest) =>
    apiClient.patch<PayrollMixedLatexRateConfigResponse>(`/api/v1/payroll-mixed-latex-rate-configs/${id}`, body),
};
