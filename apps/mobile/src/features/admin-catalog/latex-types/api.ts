import { apiClient } from '@/lib/api/client';
import type { LatexTypeResponse } from '@/types/api';

export interface CreateLatexTypeRequest {
  code: string;
  label: string;
  unit: string;
}

export interface UpdateLatexTypeRequest {
  label: string;
  unit: string;
}

/** Danh mục MỞ (ADR-0002) — `code` KHÔNG sửa được sau khi tạo. DELETE có guard 409 ở backend nếu còn
 * tham chiếu ở rate_configs/production_record_items/latex_sale_items. */
export const latexTypesApi = {
  list: () => apiClient.get<LatexTypeResponse[]>('/api/v1/latex-types'),
  create: (body: CreateLatexTypeRequest) => apiClient.post<LatexTypeResponse>('/api/v1/latex-types', body),
  update: (id: string, body: UpdateLatexTypeRequest) =>
    apiClient.patch<LatexTypeResponse>(`/api/v1/latex-types/${id}`, body),
  remove: (id: string) => apiClient.delete<void>(`/api/v1/latex-types/${id}`),
};
