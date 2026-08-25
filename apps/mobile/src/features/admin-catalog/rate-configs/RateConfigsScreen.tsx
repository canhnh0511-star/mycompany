import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppDateInput } from '@/components/AppDateInput';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { useAppToast } from '@/components/useAppToast';
import { useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { RateConfigResponse } from '@/types/api';
import { useCreateRateConfigMutation, useRateConfigsQuery, useUpdateRateConfigMutation } from './useRateConfigs';

type FormState = null | 'create' | RateConfigResponse;

const EMPTY_FIELDS = { latexTypeId: '', unitPrice: '', effectiveFrom: '', effectiveTo: '' };

/**
 * CRUD Đơn giá theo thời gian — không có DELETE (giữ lịch sử). Chồng lấn `effectiveFrom`/`effectiveTo`
 * theo `latexTypeId` bị backend chặn 409 (EXCLUDE constraint DB) — hiển thị thẳng message lỗi trả về,
 * KHÔNG mô phỏng lại validate overlap ở client (ADR-0013/§2.6: chỉ validate rẻ/rõ ràng ở client).
 */
export function RateConfigsScreen() {
  const { data: rateConfigs, isLoading, isError, error } = useRateConfigsQuery();
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const createMutation = useCreateRateConfigMutation();
  const updateMutation = useUpdateRateConfigMutation();
  const { showToast } = useAppToast();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const latexTypeOptions = (latexTypes ?? []).map((t) => ({ label: t.label, value: t.id }));

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }

  function openEdit(config: RateConfigResponse) {
    setFormState(config);
    setFields({
      latexTypeId: config.latexTypeId,
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
      latexTypeId: fields.latexTypeId,
      unitPrice: Number(fields.unitPrice),
      effectiveFrom: fields.effectiveFrom,
      effectiveTo: fields.effectiveTo.trim() || null,
    };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync(body);
        showToast({ title: 'Đã tạo đơn giá mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      // 409 overlap từ backend hiển thị NGAY trong form (không phải toast) vì Admin cần sửa lại ngày —
      // toast biến mất trước khi kịp đọc kỹ nội dung lỗi chi tiết (kèm id + khoảng ngày xung đột).
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <HStack className="items-center justify-between">
          <AppHeading size="xl">Quản lý Đơn giá</AppHeading>
          {formState === null ? <AppButton onPress={openCreate}>Thêm đơn giá</AppButton> : null}
        </HStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">{formState === 'create' ? 'Đơn giá mới' : 'Sửa đơn giá'}</AppText>
              <AppSelect
                label="Loại mủ"
                value={fields.latexTypeId || null}
                options={latexTypeOptions}
                onChange={(latexTypeId) => setFields((f) => ({ ...f, latexTypeId }))}
              />
              <AppInput
                label="Đơn giá (đ/kg)"
                keyboardType="decimal-pad"
                value={fields.unitPrice}
                onChangeText={(unitPrice) => setFields((f) => ({ ...f, unitPrice }))}
              />
              <HStack space="sm">
                <Box className="flex-1">
                  <AppDateInput
                    label="Hiệu lực từ"
                    value={fields.effectiveFrom}
                    onChangeText={(effectiveFrom) => setFields((f) => ({ ...f, effectiveFrom }))}
                  />
                </Box>
                <Box className="flex-1">
                  <AppDateInput
                    label="Đến (bỏ trống = vô hạn)"
                    value={fields.effectiveTo}
                    onChangeText={(effectiveTo) => setFields((f) => ({ ...f, effectiveTo }))}
                  />
                </Box>
              </HStack>
              {formError ? (
                <AppText size="sm" className="text-destructive">
                  {formError}
                </AppText>
              ) : null}
              <HStack space="sm">
                <AppButton
                  onPress={handleSave}
                  isLoading={isSaving}
                  isDisabled={!fields.latexTypeId || !fields.unitPrice || !fields.effectiveFrom}
                >
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
        {!isLoading && rateConfigs?.length === 0 ? <EmptyState message="Chưa có đơn giá nào." /> : null}

        <VStack space="xs">
          {rateConfigs?.map((config) => (
            <AppCard key={config.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{`${config.latexTypeCode} — ${config.unitPrice.toLocaleString('vi-VN')} đ/kg`}</AppText>
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
