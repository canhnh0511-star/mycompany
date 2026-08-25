import { useState } from 'react';
import { ScrollView } from 'react-native';
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
import { StatusBadge } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { EmployeeResponse, EmployeeStatus } from '@/types/api';
import { useCreateEmployeeMutation, useEmployeesQuery, useUpdateEmployeeMutation } from './useEmployees';

type FormState = null | 'create' | EmployeeResponse;

const EMPTY_FIELDS = { fullName: '', teamId: '', status: 'ACTIVE' as EmployeeStatus };

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' as EmployeeStatus },
  { label: 'Inactive', value: 'INACTIVE' as EmployeeStatus },
];

/** Nhãn tiếng Việt cho enum backend (CLAUDE.md §19 — không hiện thẳng "ACTIVE"/"INACTIVE" ra UI). Định
 * nghĩa tại chỗ, chỉ 1 nơi dùng — cùng nguyên tắc `ROLE_LABEL` ở `app/(tabs)/profile/index.tsx`. */
const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Nghỉ',
};

/** CRUD Nhân viên — cùng pattern list + form inline như `TeamsScreen` (không Modal, ADR-0015). */
export function EmployeesScreen() {
  const { data: employees, isLoading, isError, error } = useEmployeesQuery();
  const { data: teams } = useTeamsLookupQuery();
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const { showToast } = useAppToast();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const teamOptions = (teams ?? []).map((t) => ({ label: t.name, value: t.id }));

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
  }

  function openEdit(employee: EmployeeResponse) {
    setFormState(employee);
    setFields({ fullName: employee.fullName, teamId: employee.teamId, status: employee.status });
  }

  function closeForm() {
    setFormState(null);
    setFields(EMPTY_FIELDS);
  }

  async function handleSave() {
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ fullName: fields.fullName.trim(), teamId: fields.teamId, userId: null });
        showToast({ title: 'Đã tạo nhân viên mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({
          id: formState.id,
          body: {
            fullName: fields.fullName.trim(),
            teamId: fields.teamId,
            status: fields.status,
            userId: formState.userId,
          },
        });
        showToast({ title: 'Đã lưu thay đổi', variant: 'success' });
      }
      closeForm();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Lỗi không xác định';
      showToast({ title: 'Lưu thất bại', description: message, variant: 'error' });
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <HStack className="items-center justify-between">
          <AppHeading size="xl">Quản lý Nhân viên</AppHeading>
          {formState === null ? <AppButton onPress={openCreate}>Thêm nhân viên</AppButton> : null}
        </HStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">
                {formState === 'create' ? 'Nhân viên mới' : `Sửa: ${formState.fullName}`}
              </AppText>
              <AppInput
                label="Họ tên"
                value={fields.fullName}
                onChangeText={(fullName) => setFields((f) => ({ ...f, fullName }))}
                placeholder="VD: Nguyễn Văn A"
              />
              <AppSelect
                label="Tổ"
                value={fields.teamId || null}
                options={teamOptions}
                onChange={(teamId) => setFields((f) => ({ ...f, teamId }))}
              />
              {formState !== 'create' ? (
                <AppSelect
                  label="Trạng thái"
                  value={fields.status}
                  options={STATUS_OPTIONS}
                  onChange={(status) => setFields((f) => ({ ...f, status }))}
                />
              ) : null}
              <HStack space="sm">
                <AppButton
                  onPress={handleSave}
                  isLoading={isSaving}
                  isDisabled={!fields.fullName.trim() || !fields.teamId}
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
        {!isLoading && employees?.length === 0 ? <EmptyState message="Chưa có nhân viên nào." /> : null}

        <VStack space="xs">
          {employees?.map((employee) => (
            <AppCard key={employee.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{employee.fullName}</AppText>
                  <HStack space="xs" className="items-center">
                    <AppText size="sm" className="text-muted-foreground">
                      {employee.teamName}
                    </AppText>
                    <StatusBadge
                      label={EMPLOYEE_STATUS_LABEL[employee.status]}
                      tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}
                    />
                  </HStack>
                </VStack>
                <AppButton variant="outline" size="sm" onPress={() => openEdit(employee)}>
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
