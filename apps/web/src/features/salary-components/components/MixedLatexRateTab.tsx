import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { MoneyField } from '../../../components/common/MoneyField';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
  useCreateMixedLatexRateConfig,
  useMixedLatexRateConfigs,
  useUpdateMixedLatexRateConfig,
} from '../hooks/useSalaryComponents';
import type { MixedLatexRateConfig } from '../model/salaryComponents.types';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { getConfigStatus } from './configStatus';
import { EffectiveDateFields } from './EffectiveDateFields';

type FormState = null | 'create' | MixedLatexRateConfig;

const EMPTY_FIELDS = { unitPrice: '', effectiveFrom: '', effectiveTo: '' };

/**
 * "Mủ tạp" — đơn giá GỘP cho mủ chén + mủ dây + mủ đông, CHỈ dùng để tính lương (mục 2.1 spec) —
 * không gắn loại mủ nào, không đổi cách Sản lượng/OCR lưu 3 loại này riêng biệt. Chỉ 1 dòng hiệu lực
 * tại 1 thời điểm cho toàn hệ thống (không có key phân biệt như `latexTypeId`/`code`).
 */
export function MixedLatexRateTab() {
  const { data: configs, isLoading, isError, refetch } = useMixedLatexRateConfigs();
  const createMutation = useCreateMixedLatexRateConfig();
  const updateMutation = useUpdateMixedLatexRateConfig();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }
  function openEdit(config: MixedLatexRateConfig) {
    setFormState(config);
    setFields({
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
        await createMutation.mutateAsync(body);
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
        title="Đơn giá Mủ tạp"
        description="Đơn giá gộp (đ/kg) áp cho tổng khối lượng mủ chén + mủ dây + mủ đông — chỉ ảnh hưởng cách tính lương."
        action={{ label: 'Thêm đơn giá', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={configs}
          sortBy={(row) => row.effectiveFrom}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có đơn giá Mủ tạp nào."
          onEdit={openEdit}
          columns={[
            { header: 'Đơn giá', align: 'right', render: (row) => `${formatCurrency(row.unitPrice)}/kg` },
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
        <DialogTitle>{formState === 'create' ? 'Thêm đơn giá Mủ tạp' : 'Sửa đơn giá Mủ tạp'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <MoneyField
              label="Đơn giá"
              size="small"
              fullWidth
              unit="đ/kg"
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
