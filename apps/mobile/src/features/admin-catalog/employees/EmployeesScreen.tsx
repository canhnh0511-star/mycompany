import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { useAppToast } from '@/components/useAppToast';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { ApiError } from '@/lib/api/client';
import type { EmployeeResponse, EmployeeStatus } from '@/types/api';
import { useCreateEmployeeMutation, useEmployeesQuery, useUpdateEmployeeMutation } from './useEmployees';

type FormState = null | 'create' | EmployeeResponse;

const EMPTY_FIELDS = { fullName: '', teamId: '', status: 'active' as EmployeeStatus };

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' as EmployeeStatus },
  { label: 'Inactive', value: 'inactive' as EmployeeStatus },
];

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
          <Box className="border border-border rounded-md p-4">
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
          </Box>
        ) : null}

        {isLoading ? <AppText className="text-muted-foreground">Đang tải...</AppText> : null}
        {isError ? (
          <AppText className="text-destructive">
            Không tải được danh sách: {error instanceof ApiError ? error.message : 'Lỗi không xác định'}
          </AppText>
        ) : null}
        {!isLoading && employees?.length === 0 ? (
          <AppText className="text-muted-foreground">Chưa có nhân viên nào.</AppText>
        ) : null}

        <VStack space="xs">
          {employees?.map((employee) => (
            <Box key={employee.id} className="border border-border rounded-md p-3">
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{employee.fullName}</AppText>
                  <HStack space="xs" className="items-center">
                    <AppText size="sm" className="text-muted-foreground">
                      {employee.teamName}
                    </AppText>
                    <Box className={`rounded-full px-2 py-0.5 ${employee.status === 'active' ? 'bg-accent' : 'bg-muted'}`}>
                      <AppText size="xs">{employee.status}</AppText>
                    </Box>
                  </HStack>
                </VStack>
                <AppButton variant="outline" size="sm" onPress={() => openEdit(employee)}>
                  Sửa
                </AppButton>
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
