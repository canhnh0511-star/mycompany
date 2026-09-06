import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { MoneyField } from '../../../components/common/MoneyField';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../../utils/format';
import { useAllowanceConfigs, useCreateAllowanceConfig, useUpdateAllowanceConfig } from '../hooks/useSalaryComponents';
import { CALC_TYPE_LABEL, type AllowanceConfig, type CalcType } from '../model/salaryComponents.types';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { getConfigStatus } from './configStatus';
import { EffectiveDateFields } from './EffectiveDateFields';

type FormState = null | 'create' | AllowanceConfig;

const EMPTY_FIELDS = { code: '', name: '', calcType: 'PER_DAY' as CalcType, unitPrice: '', effectiveFrom: '', effectiveTo: '' };

// Các mã đã seed sẵn (CLAUDE.md §4) — gợi ý cho Admin, KHÔNG chặn nhập mã khác (`code` không phải
// enum ở backend, chỉ NotBlank — xem CreateAllowanceConfigRequest).
const KNOWN_CODE_OPTIONS: { code: string; label: string }[] = [
  { code: 'storm_allowance', label: 'Trợ cấp mưa bão' },
  { code: 'medication', label: 'Bồi thuốc' },
  { code: 'attendance', label: 'Chuyên cần' },
  { code: 'lighting', label: 'Tiền đèn' },
  { code: 'tapping_work', label: 'Công xã miệng' },
  { code: 'seasonal_work', label: 'Công thời vụ' },
];

/**
 * Phụ cấp/khấu trừ (`allowance_configs`) — `code` KHÔNG unique 1 mình, nhiều dòng theo thời gian
 * cho cùng 1 code là hợp lệ (time-versioned). `code` chỉ nhập được lúc TẠO MỚI — đổi mã của 1 dòng
 * lịch sử không có ý nghĩa (giống `latexTypeId` của RateConfig).
 */
export function AllowanceConfigsTab() {
  const { data: configs, isLoading, isError, refetch } = useAllowanceConfigs();
  const createMutation = useCreateAllowanceConfig();
  const updateMutation = useUpdateAllowanceConfig();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const [useCustomCode, setUseCustomCode] = useState(false);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
    setUseCustomCode(false);
  }
  function openEdit(config: AllowanceConfig) {
    setFormState(config);
    setFields({
      code: config.code,
      name: config.name,
      calcType: config.calcType,
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
      name: fields.name.trim(),
      calcType: fields.calcType,
      unitPrice: Number(fields.unitPrice),
      effectiveFrom: fields.effectiveFrom,
      effectiveTo: fields.effectiveTo.trim() || null,
    };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ code: fields.code.trim(), ...body });
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
        title="Phụ cấp / Khấu trừ"
        description="Trợ cấp mưa bão, bồi thuốc, chuyên cần, tiền đèn, công xã miệng, công thời vụ — dùng để tính các cột phụ cấp trong Bảng lương."
        action={{ label: 'Thêm phụ cấp', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={configs}
          sortBy={(row) => row.effectiveFrom}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có phụ cấp nào."
          onEdit={openEdit}
          columns={[
            { header: 'Tên', render: (row) => row.name },
            { header: 'Mã', render: (row) => row.code },
            { header: 'Cách tính', render: (row) => CALC_TYPE_LABEL[row.calcType] },
            { header: 'Giá trị', align: 'right', render: (row) => formatCurrency(row.unitPrice) },
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
        <DialogTitle>{formState === 'create' ? 'Thêm phụ cấp' : `Sửa: ${formState?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {formState !== 'create' ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Mã: <strong>{formState?.code}</strong> (không sửa được)
              </Typography>
            ) : useCustomCode ? (
              <TextField
                label="Mã (code)"
                size="small"
                fullWidth
                autoFocus
                value={fields.code}
                onChange={(event) => setFields((f) => ({ ...f, code: event.target.value.trim() }))}
                placeholder="VD: tapping_work"
                helperText="snake_case, không dấu — xem quy ước ở các mã có sẵn."
              />
            ) : (
              <TextField
                select
                label="Mã (code)"
                size="small"
                fullWidth
                value={fields.code}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '__custom__') {
                    setUseCustomCode(true);
                    setFields((f) => ({ ...f, code: '' }));
                    return;
                  }
                  const known = KNOWN_CODE_OPTIONS.find((opt) => opt.code === value);
                  setFields((f) => ({ ...f, code: value, name: known && !f.name ? known.label : f.name }));
                }}
              >
                {KNOWN_CODE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.code} value={opt.code}>
                    {opt.label} ({opt.code})
                  </MenuItem>
                ))}
                <MenuItem value="__custom__">Mã khác…</MenuItem>
              </TextField>
            )}
            <TextField
              label="Tên hiển thị"
              size="small"
              fullWidth
              value={fields.name}
              onChange={(event) => setFields((f) => ({ ...f, name: event.target.value }))}
              placeholder="VD: Trợ cấp mưa bão"
            />
            <TextField
              select
              label="Cách tính"
              size="small"
              fullWidth
              value={fields.calcType}
              onChange={(event) => setFields((f) => ({ ...f, calcType: event.target.value as CalcType }))}
            >
              {Object.entries(CALC_TYPE_LABEL).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <MoneyField
              label="Giá trị"
              size="small"
              fullWidth
              unit="đ"
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
            disabled={
              !fields.name.trim() ||
              !fields.unitPrice ||
              !fields.effectiveFrom ||
              (formState === 'create' && !fields.code.trim())
            }
            onClick={handleSave}
          >
            Lưu
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
