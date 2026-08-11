import { useEffect, useState } from 'react';
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
import { biometrics } from '@/lib/auth/biometrics';
import { credentialStorage } from '@/lib/auth/credentialStorage';

const loginSchema = z.object({
  email: z.string().min(1, 'Bắt buộc nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Đăng nhập — chỉ Admin (ADR-0001, release 1). Không có "quên mật khẩu"/"đăng ký": tài khoản admin
 * được seed sẵn qua migration (ADR-0004). Đổi mật khẩu làm ở tab Hồ sơ sau khi đăng nhập.
 *
 * Đăng nhập nhanh (thêm sau v1, theo phản hồi email khó nhớ): field Email tự điền lại email lần đăng
 * nhập gần nhất (mọi platform, `credentialStorage.lastEmail`). Trên native, nếu thiết bị có Face
 * ID/vân tay VÀ đã từng đăng nhập thành công ít nhất 1 lần, hiện thêm nút xác thực sinh trắc học để bỏ
 * qua hẳn việc gõ email/mật khẩu (`useAuth().loginWithBiometrics`, xem `features/auth/store.ts`).
 */
export default function LoginScreen() {
  const { login, loginWithBiometrics } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    credentialStorage.getLastEmail().then((email) => {
      if (email) setValue('email', email);
    });
    Promise.all([biometrics.isAvailable(), credentialStorage.hasSavedCredentials()]).then(
      ([hardwareReady, hasSaved]) => setCanUseBiometric(hardwareReady && hasSaved),
    );
  }, [setValue]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không đăng nhập được, thử lại sau.');
    }
  }

  async function handleBiometricLogin() {
    setFormError(null);
    setBiometricLoading(true);
    try {
      await loginWithBiometrics();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBiometricLoading(false);
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

          {canUseBiometric ? (
            <VStack space="sm">
              <AppButton onPress={handleBiometricLogin} isLoading={biometricLoading}>
                Đăng nhập bằng Face ID / vân tay
              </AppButton>
              <AppText size="xs" className="text-muted-foreground text-center">
                hoặc đăng nhập bằng email/mật khẩu bên dưới
              </AppText>
            </VStack>
          ) : null}

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

          <AppButton
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            variant={canUseBiometric ? 'outline' : 'default'}
          >
            Đăng nhập
          </AppButton>
        </VStack>
      </View>
    </KeyboardAvoidingView>
  );
}
