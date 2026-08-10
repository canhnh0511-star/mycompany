import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { useAppToast } from '@/components/useAppToast';
import { useEmployeesLookupQuery, useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { CreateProductionRecordRequest } from '@/types/api';
import { useProductionRecordsBatchMutation } from './useProductionRecordsBatch';

interface ItemFieldValue {
  kg: string;
  drcPercent: string;
}

interface RowFieldValue {
  employeeId: string;
  notes: string;
  /** Cùng thứ tự với danh sách latexTypes đã fetch — KHÔNG phải field array riêng (số loại mủ cố định
   * trong 1 lần render, không phải thứ Admin tự thêm/xóa như dòng). */
  items: ItemFieldValue[];
  /** Lỗi trả về từ BatchResult sau khi submit (ADR-0007) — map theo `index`, hiển thị inline. */
  submitError?: string;
  submitStatus?: 'pending' | 'saved' | 'error';
}

interface FormValues {
  recordDate: string;
  rows: RowFieldValue[];
}

function emptyRow(itemCount: number): RowFieldValue {
  return {
    employeeId: '',
    notes: '',
    items: Array.from({ length: itemCount }, () => ({ kg: '', drcPercent: '' })),
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Form "Nhập tay nhanh" — tab Sản lượng cá nhân (wireframe: seg control Sản lượng/Bán mủ/Chuyên cần,
 * mỗi dòng 1 `draft-row`). Nhiều dòng/nhân viên cùng ngày, mỗi dòng nhiều loại mủ — batch best-effort
 * theo từng dòng (ADR-0007), react-hook-form + useFieldArray cho rows (ADR-0013/§2.6).
 *
 * Validate ở client CHỈ những gì rẻ/rõ ràng (required, số không âm) — KHÔNG mô phỏng lại business rule
 * backend (vd 1 record active/employee/ngày). Nguồn sự thật lỗi vẫn là response `BatchResult` theo
 * `index`, map ngược lại đúng dòng để hiển thị (không alert chung).
 */
export function ProductionQuickEntryForm() {
  const { data: employees } = useEmployeesLookupQuery({ status: 'ACTIVE' });
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const batchMutation = useProductionRecordsBatchMutation();
  const { showToast } = useAppToast();

  const itemCount = latexTypes?.length ?? 0;
  const { control, register, handleSubmit, getValues, setValue, watch, reset } = useForm<FormValues>({
    defaultValues: { recordDate: todayIso(), rows: [] },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: 'rows' });

  // Chỉ seed 1 dòng trống đầu tiên sau khi đã biết số loại mủ (items phải khớp độ dài latexTypes).
  useEffect(() => {
    if (latexTypes && fields.length === 0) {
      append(emptyRow(latexTypes.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexTypes]);

  const employeeOptions = (employees ?? []).map((e) => ({ label: `${e.fullName} (${e.teamName})`, value: e.id }));

  async function onSubmit(values: FormValues) {
    if (!latexTypes || latexTypes.length === 0) return;

    const requests: CreateProductionRecordRequest[] = values.rows.map((row) => ({
      recordDate: values.recordDate,
      employeeId: row.employeeId,
      notes: row.notes.trim() || null,
      items: latexTypes
        .map((type, i) => {
          const raw = row.items[i];
          const kg = Number(raw?.kg);
          if (!raw?.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcRaw = raw.drcPercent;
          const drcPercent = type.code === 'water' && drcRaw ? Number(drcRaw) : null;
          return { latexTypeId: type.id, kg, drcPercent };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    }));

    // Validate rẻ ở client trước khi gọi API: nhân viên bắt buộc + ít nhất 1 loại mủ > 0/dòng.
    let hasClientError = false;
    values.rows.forEach((row, i) => {
      if (!row.employeeId) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Chọn nhân viên' });
        hasClientError = true;
      } else if (requests[i].items.length === 0) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Cần ít nhất 1 loại mủ > 0' });
        hasClientError = true;
      } else {
        update(i, { ...row, submitStatus: 'pending', submitError: undefined });
      }
    });
    if (hasClientError) return;

    try {
      const result = await batchMutation.mutateAsync(requests);
      let successCount = 0;
      result.results.forEach((item) => {
        const row = getValues(`rows.${item.index}`);
        if (item.success) {
          successCount += 1;
          update(item.index, { ...row, submitStatus: 'saved', submitError: undefined });
        } else {
          update(item.index, { ...row, submitStatus: 'error', submitError: item.error ?? 'Lỗi không xác định' });
        }
      });
      showToast({
        title: `Đã lưu ${successCount}/${result.results.length} dòng`,
        variant: successCount === result.results.length ? 'success' : 'error',
      });
    } catch (err) {
      showToast({
        title: 'Lưu thất bại',
        description: err instanceof ApiError ? err.message : 'Lỗi không xác định',
        variant: 'error',
      });
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <AppInput label="Ngày" value={watch('recordDate')} onChangeText={(v) => setValue('recordDate', v)} />

        {fields.map((field, rowIndex) => {
          const row = watch(`rows.${rowIndex}`);
          return (
            <Box key={field.id} className="border border-border rounded-md p-3">
              <VStack space="sm">
                <HStack className="items-center justify-between">
                  {row?.submitStatus === 'saved' ? (
                    <Box className="rounded-full bg-accent px-2 py-0.5">
                      <AppText size="xs">✓ Đã lưu</AppText>
                    </Box>
                  ) : row?.submitStatus === 'error' ? (
                    <Box className="rounded-full bg-destructive px-2 py-0.5">
                      <AppText size="xs" className="text-white">
                        Lỗi dòng #{rowIndex + 1}
                      </AppText>
                    </Box>
                  ) : (
                    <AppText size="xs" className="text-muted-foreground">
                      Dòng #{rowIndex + 1}
                    </AppText>
                  )}
                  <AppButton variant="outline" size="sm" onPress={() => remove(rowIndex)}>
                    Xóa dòng
                  </AppButton>
                </HStack>

                <AppSelect
                  label="Nhân viên"
                  value={row?.employeeId || null}
                  options={employeeOptions}
                  onChange={(v) => setValue(`rows.${rowIndex}.employeeId`, v)}
                  error={row?.submitStatus === 'error' && !row.employeeId ? row.submitError : undefined}
                />

                <HStack space="sm" className="flex-wrap">
                  {(latexTypes ?? []).map((type, itemIndex) => (
                    <VStack key={type.id} space="xs" className="flex-1" style={{ minWidth: 110 }}>
                      <AppInput
                        label={`${type.label} (${type.unit})`}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        {...register(`rows.${rowIndex}.items.${itemIndex}.kg`)}
                        onChangeText={(v) => setValue(`rows.${rowIndex}.items.${itemIndex}.kg`, v)}
                        value={row?.items?.[itemIndex]?.kg ?? ''}
                      />
                      {type.code === 'water' ? (
                        <AppInput
                          label="DRC (%)"
                          keyboardType="decimal-pad"
                          placeholder="—"
                          onChangeText={(v) => setValue(`rows.${rowIndex}.items.${itemIndex}.drcPercent`, v)}
                          value={row?.items?.[itemIndex]?.drcPercent ?? ''}
                        />
                      ) : null}
                    </VStack>
                  ))}
                </HStack>

                {row?.submitStatus === 'error' && row.employeeId ? (
                  <AppText size="xs" className="text-destructive">
                    {row.submitError}
                  </AppText>
                ) : null}
              </VStack>
            </Box>
          );
        })}

        <AppButton variant="outline" onPress={() => latexTypes && append(emptyRow(latexTypes.length))}>
          + Thêm dòng
        </AppButton>
      </VStack>

      <Box className="mt-4">
        <AppButton onPress={handleSubmit(onSubmit)} isLoading={batchMutation.isPending} isDisabled={fields.length === 0}>
          {`Lưu tất cả (${fields.length} dòng)`}
        </AppButton>
      </Box>
    </ScrollView>
  );
}
