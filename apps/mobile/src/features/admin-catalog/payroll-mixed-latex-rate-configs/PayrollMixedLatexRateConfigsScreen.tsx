import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import type { PayrollMixedLatexRateConfigResponse } from '@/types/api';
import {
  useCreatePayrollMixedLatexRateConfigMutation,
  usePayrollMixedLatexRateConfigsQuery,
  useUpdatePayrollMixedLatexRateConfigMutation,
} from './usePayrollMixedLatexRateConfigs';

type FormState = null | 'create' | PayrollMixedLatexRateConfigResponse;

const EMPTY_FIELDS = { unitPrice: '', effectiveFrom: '', effectiveTo: '' };

/**
 * CRUD "Mủ tạp" (Module 3 — Bảng lương, docs/specs/spec-3-bang-luong-v1-draft.md mục 2.1) — đơn giá
 * GỘP cho mủ chén + mủ dây + mủ đông khi tính lương, KHÔNG đổi cách Sản lượng/OCR lưu 3 loại mủ
 * này riêng biệt. Cùng pattern CRUD time-versioned như `RateConfigsScreen` — không có DELETE, không
 * có field phân biệt (không như RateConfig có latexTypeId) vì chỉ 1 dòng hiệu lực tại 1 thời điểm.
 */
export function PayrollMixedLatexRateConfigsScreen() {
  const { data: configs, isLoading, isError, error } = usePayrollMixedLatexRateConfigsQuery();
  const createMutation = useCreatePayrollMixedLatexRateConfigMutation();
  const updateMutation = useUpdatePayrollMixedLatexRateConfigMutation();
  const { showToast } = useAppToast();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }

  function openEdit(config: PayrollMixedLatexRateConfigResponse) {
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
    setFields(EMPTY_FIELDS);
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
        showToast({ title: 'Đã tạo đơn giá Mủ tạp mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      // 409 overlap từ backend hiển thị NGAY trong form (không phải toast) — cùng lý do RateConfigsScreen.
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <VStack space="xs">
          <HStack className="items-center justify-between">
            <AppHeading size="xl">Đơn giá Mủ tạp</AppHeading>
            {formState === null ? <AppButton onPress={openCreate}>Thêm đơn giá</AppButton> : null}
          </HStack>
          <AppText size="sm" className="text-muted-foreground">
            Áp dụng cho tổng kg mủ chén + mủ dây + mủ đông khi tính lương (khác đơn giá riêng từng
            loại ở màn "Đơn giá" — chỉ dùng cho Sản lượng/Bán mủ).
          </AppText>
        </VStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">{formState === 'create' ? 'Đơn giá mới' : 'Sửa đơn giá'}</AppText>
              <AppInput
                label="Đơn giá (đ/kg)"
                keyboardType="decimal-pad"
                value={fields.unitPrice}
                onChangeText={(unitPrice) => setFields((f) => ({ ...f, unitPrice }))}
              />
              <HStack space="sm">
                <Box className="flex-1">
                  <AppInput
                    label="Hiệu lực từ (yyyy-mm-dd)"
                    value={fields.effectiveFrom}
                    onChangeText={(effectiveFrom) => setFields((f) => ({ ...f, effectiveFrom }))}
                    placeholder="2026-01-01"
                  />
                </Box>
                <Box className="flex-1">
                  <AppInput
                    label="Đến (bỏ trống = vô hạn)"
                    value={fields.effectiveTo}
                    onChangeText={(effectiveTo) => setFields((f) => ({ ...f, effectiveTo }))}
                    placeholder="Bỏ trống"
                  />
                </Box>
              </HStack>
              {formError ? (
                <AppText size="sm" className="text-destructive">
                  {formError}
                </AppText>
              ) : null}
              <HStack space="sm">
                <AppButton onPress={handleSave} isLoading={isSaving} isDisabled={!fields.unitPrice || !fields.effectiveFrom}>
                  Lưu
                </AppButton>
                <AppButton variant="outline" onPress={closeForm} isDisabled={isSaving}>
                  Hủy
                </AppButton>
              </HStack>
            </VStack>
          </AppCard>
        ) : null}

        {isLoading ? <SkeletonList /> : null}
        {isError ? <ErrorState message="Không tải được danh sách." detail={getErrorMessage(error)} /> : null}
        {!isLoading && configs?.length === 0 ? <EmptyState message="Chưa có đơn giá Mủ tạp nào." /> : null}

        <VStack space="xs">
          {configs?.map((config) => (
            <AppCard key={config.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{`${config.unitPrice.toLocaleString('vi-VN')} đ/kg`}</AppText>
                  <AppText size="sm" className="text-muted-foreground">
                    {`${config.effectiveFrom} → ${config.effectiveTo ?? 'vô hạn'}`}
                  </AppText>
                </VStack>
                <AppButton variant="outline" size="sm" onPress={() => openEdit(config)}>
                  Sửa
                </AppButton>
              </HStack>
            </AppCard>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
