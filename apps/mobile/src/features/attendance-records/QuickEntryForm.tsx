import { useFieldArray, useForm } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { useEmployeesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { AttendanceType, CreateAttendanceRecordRequest } from '@/types/api';
import { useAttendanceRecordsBatchMutation } from './useAttendanceRecordsBatch';

interface RowFieldValue {
  employeeId: string;
  attendanceType: AttendanceType | '';
  quantity: string;
  notes: string;
  submitError?: string;
  submitStatus?: 'pending' | 'saved' | 'error';
}

interface FormValues {
  recordDate: string;
  rows: RowFieldValue[];
}

function emptyRow(): RowFieldValue {
  return { employeeId: '', attendanceType: '', quantity: '', notes: '' };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** `lighting` (tiền đèn) cố ý KHÔNG có trong danh sách — phụ cấp cố định/tháng, không gắn chấm công
 * theo ngày (CLAUDE.md §4). */
const ATTENDANCE_TYPE_OPTIONS: { label: string; value: AttendanceType }[] = [
  { label: 'Công xã miệng (TAPPING_WORK)', value: 'TAPPING_WORK' },
  { label: 'Chuyên cần (ATTENDANCE)', value: 'ATTENDANCE' },
  { label: 'Trợ cấp mưa bão (STORM_ALLOWANCE)', value: 'STORM_ALLOWANCE' },
  { label: 'Bôi thuốc (MEDICATION)', value: 'MEDICATION' },
];

/**
 * Form "Nhập tay nhanh" — tab Chuyên cần. Data shape khác hẳn production-records/latex-sales: không có
 * danh sách loại mủ, mỗi dòng chỉ 1 `attendanceType` + `quantity` — không dùng chung layout multi-item.
 * Vẫn cùng tinh thần ADR-0007/ADR-0013: batch best-effort theo từng dòng, react-hook-form +
 * useFieldArray cho rows, validate rẻ ở client.
 */
export function AttendanceQuickEntryForm() {
  const { data: employees } = useEmployeesLookupQuery({ status: 'ACTIVE' });
  const batchMutation = useAttendanceRecordsBatchMutation();
  const { showToast } = useAppToast();

  const { control, handleSubmit, getValues, setValue, watch } = useForm<FormValues>({
    defaultValues: { recordDate: todayIso(), rows: [emptyRow()] },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: 'rows' });

  const employeeOptions = (employees ?? []).map((e) => ({ label: `${e.fullName} (${e.teamName})`, value: e.id }));

  async function onSubmit(values: FormValues) {
    const requests: CreateAttendanceRecordRequest[] = values.rows.map((row) => ({
      recordDate: values.recordDate,
      employeeId: row.employeeId,
      attendanceType: row.attendanceType as AttendanceType,
      quantity: Number(row.quantity),
      notes: row.notes.trim() || null,
    }));

    let hasClientError = false;
    values.rows.forEach((row, i) => {
      if (!row.employeeId) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Chọn nhân viên' });
        hasClientError = true;
      } else if (!row.attendanceType) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Chọn loại' });
        hasClientError = true;
      } else if (!row.quantity || Number(row.quantity) <= 0) {
        update(i, { ...row, submitStatus: 'error', submitError: 'Số lượng phải > 0' });
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
            <AppCard key={field.id}>
              <VStack space="sm">
                <HStack className="items-center justify-between">
                  {row?.submitStatus === 'saved' ? (
                    <StatusBadge label="✓ Đã lưu" tone="success" />
                  ) : row?.submitStatus === 'error' ? (
                    <StatusBadge label={`Lỗi dòng #${rowIndex + 1}`} tone="error" />
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
                />
                <AppSelect
                  label="Loại"
                  value={row?.attendanceType || null}
                  options={ATTENDANCE_TYPE_OPTIONS}
                  onChange={(v) => setValue(`rows.${rowIndex}.attendanceType`, v)}
                />
                <AppInput
                  label="Số lượng"
                  keyboardType="decimal-pad"
                  placeholder="VD: 1 (công), số phần cây..."
                  value={row?.quantity ?? ''}
                  onChangeText={(v) => setValue(`rows.${rowIndex}.quantity`, v)}
                />

                {row?.submitStatus === 'error' ? (
                  <AppText size="xs" className="text-destructive">
                    {row.submitError}
                  </AppText>
                ) : null}
              </VStack>
            </AppCard>
          );
        })}

        <AppButton variant="outline" onPress={() => append(emptyRow())}>
          + Thêm dòng
        </AppButton>
      </VStack>

      <Box className="mt-4">
        <AppButton size="lg" onPress={handleSubmit(onSubmit)} isLoading={batchMutation.isPending} isDisabled={fields.length === 0}>
          {`Lưu tất cả (${fields.length} dòng)`}
        </AppButton>
      </Box>
    </ScrollView>
  );
}
