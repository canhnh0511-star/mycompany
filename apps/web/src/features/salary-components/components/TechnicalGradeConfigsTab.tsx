import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { MoneyField } from '../../../components/common/MoneyField';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { TECHNICAL_GRADE_LABEL } from '../../payroll/model/payroll.types';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
  useCreateTechnicalGradeConfig,
  useTechnicalGradeConfigs,
  useUpdateTechnicalGradeConfig,
} from '../hooks/useSalaryComponents';
import type { TechnicalGrade, TechnicalGradeConfig } from '../model/salaryComponents.types';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { getConfigStatus } from './configStatus';
import { EffectiveDateFields } from './EffectiveDateFields';

type FormState = null | 'create' | TechnicalGradeConfig;

const EMPTY_FIELDS = { grade: 'A' as TechnicalGrade, unitPrice: '', effectiveFrom: '', effectiveTo: '' };

/**
 * "Hạng kỹ thuật" (`technical_grade_configs`) — phụ cấp CỐ ĐỊNH/tháng theo hạng A/B/C, KHÔNG nhân
 * số lượng gì (mục 2.2 spec). `grade` chỉ chọn được lúc TẠO MỚI — sửa 1 dòng lịch sử không đổi
 * hạng được (giống `latexTypeId`/`code` của 2 tab kia). Hạng của TỪNG nhân viên/tháng xét riêng ở
 * panel chi tiết Bảng lương — KHÔNG sửa ở đây.
 */
export function TechnicalGradeConfigsTab() {
  const { data: configs, isLoading, isError, refetch } = useTechnicalGradeConfigs();
  const createMutation = useCreateTechnicalGradeConfig();
  const updateMutation = useUpdateTechnicalGradeConfig();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }
  function openEdit(config: TechnicalGradeConfig) {
    setFormState(config);
    setFields({
      grade: config.grade,
      unitPrice: String(config.unitPrice),
      effectiveFrom: config.effectiveFrom,
      effectiveTo: config.effectiveTo ?? '',
    });
    setFormError(null);
  }
  function closeForm() {
    setFormState(null);
    setFormError(null);
  }

  async function handleSave() {
    setFormError(null);
    const body = {
      unitPrice: Number(fields.unitPrice),
      effectiveFrom: fields.effectiveFrom,
      effectiveTo: fields.effectiveTo.trim() || null,
    };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ grade: fields.grade, ...body });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <>
      <SectionPanel
        title="Hạng kỹ thuật"
        description="Phụ cấp cố định/tháng theo hạng A/B/C — không nhân theo số lượng. Xếp hạng cho từng nhân viên/tháng sửa ở panel chi tiết Bảng lương, không sửa ở đây."
        action={{ label: 'Thêm mức hạng', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={configs}
          sortBy={(row) => row.effectiveFrom}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có mức phụ cấp hạng kỹ thuật nào."
          onEdit={openEdit}
          columns={[
            { header: 'Hạng', render: (row) => TECHNICAL_GRADE_LABEL[row.grade] },
            { header: 'Đơn giá', align: 'right', render: (row) => `${formatCurrency(row.unitPrice)}/tháng` },
            { header: 'Hiệu lực từ', render: (row) => formatDate(row.effectiveFrom) },
            { header: 'Đến', render: (row) => (row.effectiveTo ? formatDate(row.effectiveTo) : 'Vô hạn') },
            {
              header: 'Trạng thái',
              render: (row) => {
                const status = getConfigStatus(row.effectiveFrom, row.effectiveTo);
                return <StatusBadge label={status.label} tone={status.tone} />;
              },
            },
          ]}
        />
      </SectionPanel>

      <Dialog open={formState !== null} onClose={closeForm} fullWidth maxWidth="xs">
        <DialogTitle>{formState === 'create' ? 'Thêm mức Hạng kỹ thuật' : 'Sửa mức Hạng kỹ thuật'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {formState === 'create' ? (
              <TextField
                select
                label="Hạng"
                size="small"
                fullWidth
                value={fields.grade}
                onChange={(event) => setFields((f) => ({ ...f, grade: event.target.value as TechnicalGrade }))}
              >
                {Object.entries(TECHNICAL_GRADE_LABEL).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Hạng: <strong>{formState && TECHNICAL_GRADE_LABEL[formState.grade]}</strong> (không sửa được)
              </Typography>
            )}
            <MoneyField
              label="Đơn giá"
              size="small"
              fullWidth
              unit="đ/tháng"
              value={fields.unitPrice}
              onValueChange={(unitPrice) => setFields((f) => ({ ...f, unitPrice }))}
            />
            <EffectiveDateFields
              effectiveFrom={fields.effectiveFrom}
              onEffectiveFromChange={(effectiveFrom) => setFields((f) => ({ ...f, effectiveFrom }))}
              effectiveTo={fields.effectiveTo}
              onEffectiveToChange={(effectiveTo) => setFields((f) => ({ ...f, effectiveTo }))}
            />
            {formError && (
              <Typography sx={{ fontSize: 13 }} color="error.main">
                {formError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <LoadingButton onClick={closeForm} disabled={isSaving}>
            Hủy
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            loading={isSaving}
            disabled={!fields.unitPrice || !fields.effectiveFrom}
            onClick={handleSave}
          >
            Lưu
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
