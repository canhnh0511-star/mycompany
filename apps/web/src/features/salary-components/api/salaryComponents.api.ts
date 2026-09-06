import { apiGet, apiPatch, apiPostAuthed } from '../../../api/client';
import type {
  AllowanceConfig,
  CalcType,
  MixedLatexRateConfig,
  RateConfig,
  TechnicalGrade,
  TechnicalGradeConfig,
} from '../model/salaryComponents.types';

// ===== Mủ nước (rate-configs, chỉ scope latex_type=water — xem WaterRateTab) =====

export function getRateConfigs(latexTypeId: string | undefined): Promise<RateConfig[]> {
  return apiGet<RateConfig[]>('/api/v1/rate-configs', { latexTypeId });
}

export interface CreateRateConfigInput {
  latexTypeId: string;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
export interface UpdateRateConfigInput {
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function createRateConfig(body: CreateRateConfigInput): Promise<RateConfig> {
  return apiPostAuthed<RateConfig>('/api/v1/rate-configs', undefined, body);
}

export function updateRateConfig(id: string, body: UpdateRateConfigInput): Promise<RateConfig> {
  return apiPatch<RateConfig>(`/api/v1/rate-configs/${id}`, undefined, body);
}

// ===== Mủ tạp (payroll-mixed-latex-rate-configs) =====

export function getMixedLatexRateConfigs(): Promise<MixedLatexRateConfig[]> {
  return apiGet<MixedLatexRateConfig[]>('/api/v1/payroll-mixed-latex-rate-configs');
}

export interface MixedLatexRateConfigInput {
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function createMixedLatexRateConfig(body: MixedLatexRateConfigInput): Promise<MixedLatexRateConfig> {
  return apiPostAuthed<MixedLatexRateConfig>('/api/v1/payroll-mixed-latex-rate-configs', undefined, body);
}

export function updateMixedLatexRateConfig(id: string, body: MixedLatexRateConfigInput): Promise<MixedLatexRateConfig> {
  return apiPatch<MixedLatexRateConfig>(`/api/v1/payroll-mixed-latex-rate-configs/${id}`, undefined, body);
}

// ===== Phụ cấp / khấu trừ (allowance-configs) =====

export function getAllowanceConfigs(): Promise<AllowanceConfig[]> {
  return apiGet<AllowanceConfig[]>('/api/v1/allowance-configs');
}

export interface CreateAllowanceConfigInput {
  code: string;
  name: string;
  calcType: CalcType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
export interface UpdateAllowanceConfigInput {
  name: string;
  calcType: CalcType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function createAllowanceConfig(body: CreateAllowanceConfigInput): Promise<AllowanceConfig> {
  return apiPostAuthed<AllowanceConfig>('/api/v1/allowance-configs', undefined, body);
}

export function updateAllowanceConfig(id: string, body: UpdateAllowanceConfigInput): Promise<AllowanceConfig> {
  return apiPatch<AllowanceConfig>(`/api/v1/allowance-configs/${id}`, undefined, body);
}

// ===== Hạng kỹ thuật (technical-grade-configs) =====

export function getTechnicalGradeConfigs(): Promise<TechnicalGradeConfig[]> {
  return apiGet<TechnicalGradeConfig[]>('/api/v1/technical-grade-configs');
}

export interface CreateTechnicalGradeConfigInput {
  grade: TechnicalGrade;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
export interface UpdateTechnicalGradeConfigInput {
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function createTechnicalGradeConfig(body: CreateTechnicalGradeConfigInput): Promise<TechnicalGradeConfig> {
  return apiPostAuthed<TechnicalGradeConfig>('/api/v1/technical-grade-configs', undefined, body);
}

export function updateTechnicalGradeConfig(id: string, body: UpdateTechnicalGradeConfigInput): Promise<TechnicalGradeConfig> {
  return apiPatch<TechnicalGradeConfig>(`/api/v1/technical-grade-configs/${id}`, undefined, body);
}
