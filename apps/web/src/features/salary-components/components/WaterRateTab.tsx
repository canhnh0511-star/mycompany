import { useMemo, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { MoneyField } from '../../../components/common/MoneyField';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../../utils/format';
import { useCreateRateConfig, useLatexTypes, useRateConfigs, useUpdateRateConfig } from '../hooks/useSalaryComponents';
import type { RateConfig } from '../model/salaryComponents.types';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { getConfigStatus } from './configStatus';
import { EffectiveDateFields } from './EffectiveDateFields';

type FormState = null | 'create' | RateConfig;

const EMPTY_FIELDS = { unitPrice: '', effectiveFrom: '', effectiveTo: '' };

/**
 * Đơn giá "Mủ nước" (đ/kg) — Thành phần lương chỉ quản lý dòng `rate_configs` có `latex_type=water`,
 * loại DUY NHẤT dùng để tính cột "Mủ nước" trong Bảng lương (docs/specs/spec-3-bang-luong-v1-draft.md
 * mục 1). Mủ chén/dây/đông không quản lý ở đây — dùng đơn giá GỘP riêng, xem tab "Mủ tạp".
 */
export function WaterRateTab() {
  const { data: latexTypes } = useLatexTypes();
  const waterType = useMemo(() => latexTypes?.find((type) => type.code === 'water'), [latexTypes]);

  const { data: rateConfigs, isLoading, isError, refetch } = useRateConfigs(waterType?.id);
  const createMutation = useCreateRateConfig();
  const updateMutation = useUpdateRateConfig();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }
  function openEdit(config: RateConfig) {
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
    if (!waterType) return;
    setFormError(null);
    const body = {
      unitPrice: Number(fields.unitPrice),
      effectiveFrom: fields.effectiveFrom,
      effectiveTo: fields.effectiveTo.trim() || null,
    };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ latexTypeId: waterType.id, ...body });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
      }
      closeForm();
    } catch (err) {
      // 409 chồng lấn khoảng effective từ backend (EXCLUDE constraint) hiển thị NGAY trong form —
      // Admin cần đọc kỹ ngày xung đột để sửa lại, không phải toast biến mất nhanh.
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <>
      <SectionPanel
        title="Đơn giá Mủ nước"
        description="Áp dụng cho toàn công ty, không phân biệt Tổ — đổi giá ở đây ảnh hưởng ngay cột &quot;Mủ nước&quot; của Bảng lương."
        action={{ label: 'Thêm đơn giá', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={rateConfigs}
          sortBy={(row) => row.effectiveFrom}
          isLoading={isLoading || !waterType}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có đơn giá Mủ nước nào."
          onEdit={openEdit}
          columns={[
            {
              header: 'Đơn giá',
              align: 'right',
              render: (row) => `${formatCurrency(row.unitPrice)}/kg`,
            },
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
        <DialogTitle>{formState === 'create' ? 'Thêm đơn giá Mủ nước' : 'Sửa đơn giá Mủ nước'}</DialogTitle>
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
