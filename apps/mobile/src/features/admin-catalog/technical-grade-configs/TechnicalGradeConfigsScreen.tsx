import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import type { TechnicalGrade, TechnicalGradeConfigResponse } from '@/types/api';
import {
  useCreateTechnicalGradeConfigMutation,
  useTechnicalGradeConfigsQuery,
  useUpdateTechnicalGradeConfigMutation,
} from './useTechnicalGradeConfigs';

type FormState = null | 'create' | TechnicalGradeConfigResponse;

const EMPTY_FIELDS = { grade: '' as TechnicalGrade | '', unitPrice: '', effectiveFrom: '', effectiveTo: '' };

const GRADE_OPTIONS: { label: string; value: TechnicalGrade }[] = [
  { label: 'Loại A', value: 'A' },
  { label: 'Loại B', value: 'B' },
  { label: 'Loại C', value: 'C' },
];

/**
 * CRUD "Hạng kỹ thuật" (Module 3 — Bảng lương, docs/specs/spec-3-bang-luong-v1-draft.md mục 2.2) —
 * đơn giá CỐ ĐỊNH/tháng theo hạng A/B/C, cùng pattern CRUD time-versioned như `RateConfigsScreen`.
 * `grade` chỉ chọn được khi TẠO MỚI — sửa 1 dòng lịch sử không đổi hạng được (giống lý do
 * `latexTypeId` không sửa được ở RateConfig), nên khi sửa chỉ hiện dạng chữ, không cho đổi.
 *
 * LƯU Ý — đây KHÔNG phải màn gán hạng cho từng nhân viên/tháng (đó là
 * `EmployeeTechnicalGradeAssignment`, sửa ở panel chi tiết màn Bảng lương). Màn này chỉ khai báo
 * MỨC GIÁ áp dụng chung cho mỗi hạng.
 */
export function TechnicalGradeConfigsScreen() {
  const { data: configs, isLoading, isError, error } = useTechnicalGradeConfigsQuery();
  const createMutation = useCreateTechnicalGradeConfigMutation();
  const updateMutation = useUpdateTechnicalGradeConfigMutation();
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

  function openEdit(config: TechnicalGradeConfigResponse) {
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
        if (!fields.grade) {
          setFormError('Chọn hạng trước khi lưu');
          return;
        }
        await createMutation.mutateAsync({ ...body, grade: fields.grade });
        showToast({ title: 'Đã tạo đơn giá Hạng kỹ thuật mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      // 409 overlap từ backend hiển thị NGAY trong form — cùng lý do RateConfigsScreen.
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <VStack space="xs">
          <HStack className="items-center justify-between">
            <AppHeading size="xl">Đơn giá Hạng kỹ thuật</AppHeading>
            {formState === null ? <AppButton onPress={openCreate}>Thêm đơn giá</AppButton> : null}
          </HStack>
          <AppText size="sm" className="text-muted-foreground">
            Mức phụ cấp cố định/tháng theo hạng A/B/C — không nhân theo số lượng. Gán hạng cho từng
            nhân viên theo từng tháng thực hiện ở panel chi tiết màn "Bảng lương", không phải ở đây.
          </AppText>
        </VStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">{formState === 'create' ? 'Đơn giá mới' : 'Sửa đơn giá'}</AppText>
              {formState === 'create' ? (
                <AppSelect
                  label="Hạng"
                  value={fields.grade || null}
                  options={GRADE_OPTIONS}
                  onChange={(grade) => setFields((f) => ({ ...f, grade }))}
                />
              ) : (
                <VStack space="xs">
                  <AppText size="sm" className="text-muted-foreground">
                    Hạng
                  </AppText>
                  <AppText className="font-medium">{`Loại ${fields.grade}`}</AppText>
                </VStack>
              )}
              <AppInput
                label="Đơn giá (đ/tháng)"
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
                <AppButton
                  onPress={handleSave}
                  isLoading={isSaving}
                  isDisabled={!fields.unitPrice || !fields.effectiveFrom || (formState === 'create' && !fields.grade)}
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
        {!isLoading && configs?.length === 0 ? <EmptyState message="Chưa có đơn giá Hạng kỹ thuật nào." /> : null}

        <VStack space="xs">
          {configs?.map((config) => (
            <AppCard key={config.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{`Loại ${config.grade} — ${config.unitPrice.toLocaleString('vi-VN')} đ/tháng`}</AppText>
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
