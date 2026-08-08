import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api/client';

const loginSchema = z.object({
  email: z.string().min(1, 'Bắt buộc nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Đăng nhập — chỉ Admin (ADR-0001, release 1). Không có "quên mật khẩu"/"đăng ký": tài khoản admin
 * được seed sẵn qua migration (ADR-0004). Đổi mật khẩu làm ở tab Hồ sơ sau khi đăng nhập.
 */
export default function LoginScreen() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không đăng nhập được, thử lại sau.');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 items-center justify-center p-6">
        <VStack space="lg" className="w-full max-w-sm">
          <VStack space="xs">
            <AppHeading size="2xl">Đăng nhập</AppHeading>
            <AppText className="text-muted-foreground">
              Quản lý sản lượng / chi phí trại cao su
            </AppText>
          </VStack>

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <AppInput
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <AppInput
                label="Mật khẩu"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />

          {formError ? (
            <AppText size="sm" className="text-destructive">
              {formError}
            </AppText>
          ) : null}

          <AppButton onPress={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Đăng nhập
          </AppButton>
        </VStack>
      </View>
    </KeyboardAvoidingView>
  );
}
