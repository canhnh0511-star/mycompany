/**
 * "Thành phần lương" — CRUD các cấu hình time-versioned nuôi công thức tính Bảng lương (Module 3).
 * Khớp services/api dto RateConfigResponse/AllowanceConfigResponse/TechnicalGradeConfigResponse/
 * PayrollMixedLatexRateConfigResponse. Không có DELETE cho bất kỳ config nào — giữ lịch sử đơn giá
 * (CLAUDE.md §4), "xóa" 1 dòng nghĩa là đặt `effectiveTo` = hôm qua qua PATCH, không có action riêng.
 */
import type { TechnicalGrade } from '../../payroll/model/payroll.types';
export type { TechnicalGrade };
// Lookup dùng chung (Bảng lương/Thành phần lương/Phiếu đều cần) — xem `src/api/lookups.api.ts`.
export type { LatexTypeOption } from '../../../api/lookups.api';

export type CalcType = 'PER_DAY' | 'PER_TREE_SECTION' | 'PER_SHIFT' | 'FIXED';

export const CALC_TYPE_LABEL: Record<CalcType, string> = {
  PER_DAY: 'Theo ngày công',
  PER_TREE_SECTION: 'Theo phần cây',
  PER_SHIFT: 'Theo ca',
  FIXED: 'Cố định',
};

/** Đơn giá theo loại mủ — Thành phần lương chỉ quản lý dòng latex_type=water, xem WaterRateTab. */
export interface RateConfig {
  id: string;
  latexTypeId: string;
  latexTypeCode: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

/** "Mủ tạp" — đơn giá gộp mủ chén + mủ dây + mủ đông, không gắn latex_type nào (mục 2.1 spec). */
export interface MixedLatexRateConfig {
  id: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Phụ cấp/khấu trừ — `code` KHÔNG unique 1 mình, nhiều dòng theo thời gian cho cùng code hợp lệ. */
export interface AllowanceConfig {
  id: string;
  code: string;
  name: string;
  calcType: CalcType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** "Hạng kỹ thuật" — cố định/tháng theo hạng A/B/C, KHÔNG nhân số lượng gì (mục 2.2 spec). */
export interface TechnicalGradeConfig {
  id: string;
  grade: TechnicalGrade;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
