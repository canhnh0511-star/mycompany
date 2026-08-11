import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

/**
 * TanStack Query client dùng chung toàn app (ADR-0009). Retry mặc định của thư viện (3 lần, backoff)
 * hợp với UX "mất mạng thực địa" (CLAUDE.md §9) cho GET — nhưng không retry lỗi 4xx (client error,
 * retry không giúp gì) và không retry 401 (đã bị apiClient chặn/điều hướng login trước khi tới đây).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false, // batch/OCR/confirm — không retry ngầm, để người dùng chủ động bấm lại (rõ ràng hơn)
    },
  },
});

/** Query key factory — tránh hardcode mảng key rải rác từng feature, tránh lệch key khi invalidate. */
export const queryKeys = {
  productionRecords: {
    all: ['production-records'] as const,
    list: (filters: Record<string, unknown>) => ['production-records', 'list', filters] as const,
    drafts: () => ['production-records', 'list', { status: 'DRAFT' }] as const,
    detail: (id: string) => ['production-records', 'detail', id] as const,
  },
  latexSales: {
    all: ['latex-sales'] as const,
    list: (filters: Record<string, unknown>) => ['latex-sales', 'list', filters] as const,
    drafts: () => ['latex-sales', 'list', { status: 'DRAFT' }] as const,
    detail: (id: string) => ['latex-sales', 'detail', id] as const,
  },
  attendanceRecords: {
    all: ['attendance-records'] as const,
    list: (filters: Record<string, unknown>) => ['attendance-records', 'list', filters] as const,
  },
  teams: { all: ['teams'] as const },
  employees: {
    all: ['employees'] as const,
    list: (filters: Record<string, unknown>) => ['employees', 'list', filters] as const,
  },
  latexTypes: { all: ['latex-types'] as const },
  rateConfigs: { all: ['rate-configs'] as const },
  allowanceConfigs: { all: ['allowance-configs'] as const },
  ocrCallLogs: {
    list: (filters: Record<string, unknown>) => ['ocr-call-logs', 'list', filters] as const,
    stats: (filters: Record<string, unknown> = {}) => ['ocr-call-logs', 'stats', filters] as const,
  },
  editHistory: (tableName: string, recordId: string) => ['edit-history', tableName, recordId] as const,
  reports: {
    productionRecords: (filters: Record<string, unknown>) =>
      ['reports', 'production-records', filters] as const,
    latexSales: (filters: Record<string, unknown>) => ['reports', 'latex-sales', filters] as const,
  },
  me: ['me'] as const,
};
