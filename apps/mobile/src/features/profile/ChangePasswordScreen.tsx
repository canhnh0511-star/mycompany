import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box } from '@/components/ui/box';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { getErrorMessage } from '@/components/ErrorState';
import { useAppToast } from '@/components/useAppToast';
import { useChangePasswordMutation } from './useProfile';

// ≥8 ký tự, có ít nhất 1 chữ và 1 số — đúng ghi chú artboard "13 · Đổi mật khẩu" ("Ít nhất 8 ký tự, có
// chữ và số"). Backend chỉ validate @Size(min=8) (ChangePasswordRequest.java) — ràng buộc "có chữ+số"
// là UX phía client, không lặp lại ở server (không phải rule bảo mật bắt buộc, chỉ gợi ý mật khẩu mạnh).
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Bắt buộc nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(8, 'Ít nhất 8 ký tự, có chữ và số')
      .regex(/[A-Za-z]/, 'Ít nhất 8 ký tự, có chữ và số')
      .regex(/[0-9]/, 'Ít nhất 8 ký tự, có chữ và số'),
    confirmPassword: z.string().min(1, 'Bắt buộc nhập lại mật khẩu mới'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/** Màn 13 "Đổi mật khẩu" (artboard "13 · Đổi mật khẩu"). Toggle hiện/ẩn RIÊNG từng field (đúng design —
 * không dùng chung 1 state ẩn/hiện cho cả 3 field). */
export function ChangePasswordScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const mutation = useChangePasswordMutation();
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await mutation.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      showToast({ title: 'Đã đổi mật khẩu', variant: 'success' });
      reset();
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
    } catch (err) {
      showToast({ title: 'Đổi mật khẩu thất bại', description: getErrorMessage(err, 'Mật khẩu hiện tại không đúng'), variant: 'error' });
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <AppText size="sm" className="text-primary">
            ‹ Hồ sơ
          </AppText>
        </Pressable>
        <AppHeading size="xl">Đổi mật khẩu</AppHeading>

        <PasswordField
          label="Mật khẩu hiện tại"
          control={control}
          name="currentPassword"
          visible={visible.current}
          onToggleVisible={() => setVisible((v) => ({ ...v, current: !v.current }))}
          error={errors.currentPassword?.message}
        />

        <VStack space="xs">
          <PasswordField
            label="Mật khẩu mới"
            control={control}
            name="newPassword"
            visible={visible.next}
            onToggleVisible={() => setVisible((v) => ({ ...v, next: !v.next }))}
            error={errors.newPassword?.message}
          />
          {!errors.newPassword ? (
            <AppText size="xs" className="text-muted-foreground">
              Ít nhất 8 ký tự, có chữ và số.
            </AppText>
          ) : null}
        </VStack>

        <PasswordField
          label="Nhập lại mật khẩu mới"
          control={control}
          name="confirmPassword"
          visible={visible.confirm}
          onToggleVisible={() => setVisible((v) => ({ ...v, confirm: !v.confirm }))}
          error={errors.confirmPassword?.message}
        />

        <Box className="rounded-lg bg-muted px-3 py-2">
          <AppText size="sm" className="text-muted-foreground">
            Sau khi đổi, các máy khác đang đăng nhập sẽ phải đăng nhập lại. Đăng nhập bằng Face ID/vân tay
            trên máy này vẫn giữ.
          </AppText>
        </Box>

        <AppButton isLoading={mutation.isPending} onPress={handleSubmit(onSubmit)}>
          Đổi mật khẩu
        </AppButton>
      </VStack>
    </ScrollView>
  );
}

function PasswordField({
  label,
  control,
  name,
  visible,
  onToggleVisible,
  error,
}: {
  label: string;
  control: ReturnType<typeof useForm<ChangePasswordFormValues>>['control'];
  name: keyof ChangePasswordFormValues;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string;
}) {
  return (
    <VStack space="xs">
      <AppText size="sm">{label}</AppText>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input isInvalid={!!error}>
            <InputField
              value={field.value}
              onChangeText={field.onChange}
              secureTextEntry={!visible}
              autoCapitalize="none"
            />
            <InputSlot className="pr-3">
              <Pressable onPress={onToggleVisible} hitSlop={8}>
                <AppText size="sm" className="font-medium text-primary">
                  {visible ? 'Ẩn' : 'Hiện'}
                </AppText>
              </Pressable>
            </InputSlot>
          </Input>
        )}
      />
      {error ? (
        <AppText size="xs" className="text-destructive">
          {error}
        </AppText>
      ) : null}
    </VStack>
  );
}
