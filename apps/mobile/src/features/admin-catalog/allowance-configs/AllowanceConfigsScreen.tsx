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
import { ApiError } from '@/lib/api/client';
import type { AllowanceConfigResponse, CalcType } from '@/types/api';
import {
  useAllowanceConfigsQuery,
  useCreateAllowanceConfigMutation,
  useUpdateAllowanceConfigMutation,
} from './useAllowanceConfigs';

type FormState = null | 'create' | AllowanceConfigResponse;

const EMPTY_FIELDS = {
  code: '',
  name: '',
  calcType: 'PER_DAY' as CalcType,
  unitPrice: '',
  effectiveFrom: '',
  effectiveTo: '',
};

const CALC_TYPE_OPTIONS: { label: string; value: CalcType }[] = [
  { label: 'Theo ngày công (PER_DAY)', value: 'PER_DAY' },
  { label: 'Theo phần cây (PER_TREE_SECTION)', value: 'PER_TREE_SECTION' },
  { label: 'Theo ca (PER_SHIFT)', value: 'PER_SHIFT' },
  { label: 'Cố định (FIXED)', value: 'FIXED' },
];

/**
 * CRUD Phụ cấp/khấu trừ — chỉ khai báo cấu hình cho Module 3 sau này (CLAUDE.md §4), chưa tính lương ở
 * Module 1. `code` KHÔNG unique một mình — nhiều dòng cùng code theo thời gian khác nhau hợp lệ.
 */
export function AllowanceConfigsScreen() {
  const { data: allowanceConfigs, isLoading, isError, error } = useAllowanceConfigsQuery();
  const createMutation = useCreateAllowanceConfigMutation();
  const updateMutation = useUpdateAllowanceConfigMutation();
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

  function openEdit(config: AllowanceConfigResponse) {
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
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }

  async function handleSave() {
    setFormError(null);
    const body = {
      code: formState === 'create' ? fields.code.trim() : undefined,
      name: fields.name.trim(),
      calcType: fields.calcType,
      unitPrice: Number(fields.unitPrice),
      effectiveFrom: fields.effectiveFrom,
      effectiveTo: fields.effectiveTo.trim() || null,
    };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync(body);
        showToast({ title: 'Đã tạo phụ cấp mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <HStack className="items-center justify-between">
          <AppHeading size="xl">Quản lý Phụ cấp</AppHeading>
          {formState === null ? <AppButton onPress={openCreate}>Thêm phụ cấp</AppButton> : null}
        </HStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">{formState === 'create' ? 'Phụ cấp mới' : `Sửa: ${formState.name}`}</AppText>
              {formState === 'create' ? (
                <AppInput
                  label="Mã (code)"
                  value={fields.code}
                  onChangeText={(code) => setFields((f) => ({ ...f, code }))}
                  placeholder="VD: storm_allowance, medication, attendance, lighting, tapping_work"
                  autoCapitalize="none"
                />
              ) : (
                <AppText size="xs" className="text-muted-foreground">
                  Mã: {formState.code} (không sửa được)
                </AppText>
              )}
              <AppInput
                label="Tên hiển thị"
                value={fields.name}
                onChangeText={(name) => setFields((f) => ({ ...f, name }))}
                placeholder="VD: Trợ cấp mưa bão"
              />
              <AppSelect
                label="Cách tính"
                value={fields.calcType}
                options={CALC_TYPE_OPTIONS}
                onChange={(calcType) => setFields((f) => ({ ...f, calcType }))}
              />
              <AppInput
                label="Giá trị (đ)"
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
                  isDisabled={
                    !fields.name.trim() ||
                    !fields.unitPrice ||
                    !fields.effectiveFrom ||
                    (formState === 'create' && !fields.code.trim())
                  }
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
        {!isLoading && allowanceConfigs?.length === 0 ? <EmptyState message="Chưa có phụ cấp nào." /> : null}

        <VStack space="xs">
          {allowanceConfigs?.map((config) => (
            <AppCard key={config.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{config.name}</AppText>
                  <AppText size="sm" className="text-muted-foreground">
                    {`${config.code} · ${config.calcType} · ${config.unitPrice.toLocaleString('vi-VN')} đ`}
                  </AppText>
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
