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
import { useLatexTypesLookupQuery, useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { CreateLatexSaleRequest } from '@/types/api';
import { useLatexSalesBatchMutation } from './useLatexSalesBatch';

interface ItemFieldValue {
  kg: string;
  drcPercent: string;
}

interface RowFieldValue {
  teamId: string;
  buyerName: string;
  sellerSignedBy: string;
  notes: string;
  items: ItemFieldValue[];
  submitError?: string;
  submitStatus?: 'pending' | 'saved' | 'error';
}

interface FormValues {
  recordDate: string;
  rows: RowFieldValue[];
}

function emptyRow(itemCount: number): RowFieldValue {
  return {
    teamId: '',
    buyerName: '',
    sellerSignedBy: '',
    notes: '',
    items: Array.from({ length: itemCount }, () => ({ kg: '', drcPercent: '' })),
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Form "Nhập tay nhanh" — tab Bán mủ theo Tổ. Cùng pattern với `features/production-records`
 * (react-hook-form + useFieldArray cho rows, batch best-effort ADR-0007) nhưng KHÔNG có employeeId —
 * chỉ ghi tên người mua/người ký (text) theo Tổ (CLAUDE.md §4).
 */
export function LatexSaleQuickEntryForm() {
  const { data: teams } = useTeamsLookupQuery();
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const batchMutation = useLatexSalesBatchMutation();
  const { showToast } = useAppToast();

  const { control, handleSubmit, getValues, setValue, watch } = useForm<FormValues>({
    defaultValues: { recordDate: todayIso(), rows: [] },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: 'rows' });

  useEffect(() => {
    if (latexTypes && fields.length === 0) {
      append(emptyRow(latexTypes.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexTypes]);

  const teamOptions = (teams ?? []).map((t) => ({ label: t.name, value: t.id }));

  async function onSubmit(values: FormValues) {
    if (!latexTypes || latexTypes.length === 0) return;

    const requests: CreateLatexSaleRequest[] = values.rows.map((row) => ({
      recordDate: values.recordDate,
      teamId: row.teamId,
      buyerName: row.buyerName.trim() || null,
      sellerSignedBy: row.sellerSignedBy.trim() || null,
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

    let hasClientError = false;
    values.rows.forEach((row, i) => {
      if (!row.teamId) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Chọn Tổ' });
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
                  label="Tổ"
                  value={row?.teamId || null}
                  options={teamOptions}
                  onChange={(v) => setValue(`rows.${rowIndex}.teamId`, v)}
                  error={row?.submitStatus === 'error' && !row.teamId ? row.submitError : undefined}
                />
                <HStack space="sm">
                  <Box className="flex-1">
                    <AppInput
                      label="Người mua"
                      value={row?.buyerName ?? ''}
                      onChangeText={(v) => setValue(`rows.${rowIndex}.buyerName`, v)}
                    />
                  </Box>
                  <Box className="flex-1">
                    <AppInput
                      label="Người ký"
                      value={row?.sellerSignedBy ?? ''}
                      onChangeText={(v) => setValue(`rows.${rowIndex}.sellerSignedBy`, v)}
                    />
                  </Box>
                </HStack>

                <HStack space="sm" className="flex-wrap">
                  {(latexTypes ?? []).map((type, itemIndex) => (
                    <VStack key={type.id} space="xs" className="flex-1" style={{ minWidth: 110 }}>
                      <AppInput
                        label={`${type.label} (${type.unit})`}
                        keyboardType="decimal-pad"
                        placeholder="0"
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

                {row?.submitStatus === 'error' && row.teamId ? (
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
