import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import type { LatexTypeResponse } from '@/types/api';
import {
  useCreateLatexTypeMutation,
  useDeleteLatexTypeMutation,
  useLatexTypesQuery,
  useUpdateLatexTypeMutation,
} from './useLatexTypes';

type FormState = null | 'create' | LatexTypeResponse;

const EMPTY_FIELDS = { code: '', label: '', unit: 'kg' };

/**
 * CRUD Loại mủ — danh mục MỞ (ADR-0002), `code` chỉ nhập lúc tạo, không sửa được. Có DELETE (khác
 * Teams/Employees) nhưng backend chặn 409 nếu còn tham chiếu — xác nhận xóa 2 bước (bấm lần 1 hiện nút
 * "Xác nhận xóa", không dùng Modal/Alert theo đúng lý do ở ADR-0015).
 */
export function LatexTypesScreen() {
  const { data: latexTypes, isLoading, isError, error } = useLatexTypesQuery();
  const createMutation = useCreateLatexTypeMutation();
  const updateMutation = useUpdateLatexTypeMutation();
  const deleteMutation = useDeleteLatexTypeMutation();
  const { showToast } = useAppToast();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
  }

  function openEdit(type: LatexTypeResponse) {
    setFormState(type);
    setFields({ code: type.code, label: type.label, unit: type.unit });
  }

  function closeForm() {
    setFormState(null);
    setFields(EMPTY_FIELDS);
  }

  async function handleSave() {
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ code: fields.code.trim(), label: fields.label.trim(), unit: fields.unit.trim() });
        showToast({ title: 'Đã tạo loại mủ mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({
          id: formState.id,
          body: { label: fields.label.trim(), unit: fields.unit.trim() },
        });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      showToast({
        title: 'Lưu thất bại',
        description: err instanceof ApiError ? err.message : 'Lỗi không xác định',
        variant: 'error',
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      showToast({ title: 'Đã xóa loại mủ', variant: 'success' });
    } catch (err) {
      showToast({
        title: 'Không xóa được',
        description: err instanceof ApiError ? err.message : 'Lỗi không xác định',
        variant: 'error',
      });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <HStack className="items-center justify-between">
          <AppHeading size="xl">Quản lý Loại mủ</AppHeading>
          {formState === null ? <AppButton onPress={openCreate}>Thêm loại mủ</AppButton> : null}
        </HStack>

        {formState !== null ? (
          <Box className="border border-border rounded-md p-4">
            <VStack space="sm">
              <AppText className="font-semibold">
                {formState === 'create' ? 'Loại mủ mới' : `Sửa: ${formState.label}`}
              </AppText>
              {formState === 'create' ? (
                <AppInput
                  label="Mã (code)"
                  value={fields.code}
                  onChangeText={(code) => setFields((f) => ({ ...f, code }))}
                  placeholder="VD: water, cup, strip, coagulated"
                  autoCapitalize="none"
                />
              ) : (
                <AppText size="xs" className="text-muted-foreground">
                  Mã: {formState.code} (không sửa được)
                </AppText>
              )}
              <AppInput
                label="Nhãn hiển thị"
                value={fields.label}
                onChangeText={(label) => setFields((f) => ({ ...f, label }))}
                placeholder="VD: Mủ nước"
              />
              <AppInput
                label="Đơn vị"
                value={fields.unit}
                onChangeText={(unit) => setFields((f) => ({ ...f, unit }))}
                placeholder="kg"
              />
              <HStack space="sm">
                <AppButton
                  onPress={handleSave}
                  isLoading={isSaving}
                  isDisabled={!fields.label.trim() || (formState === 'create' && !fields.code.trim())}
                >
                  Lưu
                </AppButton>
                <AppButton variant="outline" onPress={closeForm} isDisabled={isSaving}>
                  Hủy
                </AppButton>
              </HStack>
            </VStack>
          </Box>
        ) : null}

        {isLoading ? <AppText className="text-muted-foreground">Đang tải...</AppText> : null}
        {isError ? (
          <AppText className="text-destructive">
            Không tải được danh sách: {error instanceof ApiError ? error.message : 'Lỗi không xác định'}
          </AppText>
        ) : null}

        <VStack space="xs">
          {latexTypes?.map((type) => (
            <Box key={type.id} className="border border-border rounded-md p-3">
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{type.label}</AppText>
                  <AppText size="sm" className="text-muted-foreground">
                    {`${type.code} · ${type.unit}`}
                  </AppText>
                </VStack>
                <HStack space="xs">
                  <AppButton variant="outline" size="sm" onPress={() => openEdit(type)}>
                    Sửa
                  </AppButton>
                  {confirmingDeleteId === type.id ? (
                    <AppButton
                      variant="destructive"
                      size="sm"
                      isLoading={deleteMutation.isPending}
                      onPress={() => handleDelete(type.id)}
                    >
                      Xác nhận xóa
                    </AppButton>
                  ) : (
                    <AppButton variant="outline" size="sm" onPress={() => setConfirmingDeleteId(type.id)}>
                      Xóa
                    </AppButton>
                  )}
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
