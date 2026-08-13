import { useState } from 'react';
import { ScrollView } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useAppToast } from '@/components/useAppToast';
import { ApiError } from '@/lib/api/client';
import type { TeamResponse } from '@/types/api';
import { useCreateTeamMutation, useTeamsQuery, useUpdateTeamMutation } from './useTeams';

/** `null` = form đóng, `'create'` = tạo mới, object = đang sửa team đó (CRUD Teams, không có DELETE — CLAUDE.md §4). */
type FormState = null | 'create' | TeamResponse;

const EMPTY_FIELDS = { name: '', description: '' };

/**
 * Màn quản lý Tổ — ưu tiên layout web/tablet (route nhóm `(web)`, CLAUDE.md §5). Đây là resource đơn
 * giản nhất trong admin-catalog (chỉ name/description, không DELETE) nên dùng làm mẫu đầu tiên cho các
 * resource còn lại (Employees/LatexTypes/RateConfigs/AllowanceConfigs) — cùng pattern: list + form
 * inline (không dùng Modal — gluestack-ui chưa có component Modal ổn định ở bản alpha đang dùng, xem
 * docs/frontend-grilling-plan.md §5).
 */
export function TeamsScreen() {
  const { data: teams, isLoading, isError, error } = useTeamsQuery();
  const createMutation = useCreateTeamMutation();
  const updateMutation = useUpdateTeamMutation();
  const { showToast } = useAppToast();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
  }

  function openEdit(team: TeamResponse) {
    setFormState(team);
    setFields({ name: team.name, description: team.description ?? '' });
  }

  function closeForm() {
    setFormState(null);
    setFields(EMPTY_FIELDS);
  }

  async function handleSave() {
    const body = { name: fields.name.trim(), description: fields.description.trim() || null };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync(body);
        showToast({ title: 'Đã tạo Tổ mới', variant: 'success' });
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
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
          <AppHeading size="xl">Quản lý Tổ</AppHeading>
          {formState === null ? <AppButton onPress={openCreate}>Thêm Tổ mới</AppButton> : null}
        </HStack>

        {formState !== null ? (
          <AppCard>
            <VStack space="sm">
              <AppText className="font-semibold">
                {formState === 'create' ? 'Tổ mới' : `Sửa: ${formState.name}`}
              </AppText>
              <AppInput
                label="Tên Tổ"
                value={fields.name}
                onChangeText={(name) => setFields((f) => ({ ...f, name }))}
                placeholder="VD: Tổ 1"
              />
              <AppInput
                label="Mô tả"
                value={fields.description}
                onChangeText={(description) => setFields((f) => ({ ...f, description }))}
                placeholder="Không bắt buộc"
              />
              <HStack space="sm">
                <AppButton onPress={handleSave} isLoading={isSaving} isDisabled={!fields.name.trim()}>
                  Lưu
                </AppButton>
                <AppButton variant="outline" onPress={closeForm} isDisabled={isSaving}>
                  Hủy
                </AppButton>
              </HStack>
            </VStack>
          </AppCard>
        ) : null}

        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState message="Không tải được danh sách Tổ." detail={getErrorMessage(error)} /> : null}
        {!isLoading && teams?.length === 0 ? <EmptyState message="Chưa có Tổ nào." /> : null}

        <VStack space="xs">
          {teams?.map((team) => (
            <AppCard key={team.id}>
              <HStack className="items-center justify-between">
                <VStack className="flex-1">
                  <AppText className="font-semibold">{team.name}</AppText>
                  {team.description ? (
                    <AppText size="sm" className="text-muted-foreground">
                      {team.description}
                    </AppText>
                  ) : null}
                </VStack>
                <AppButton variant="outline" size="sm" onPress={() => openEdit(team)}>
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
