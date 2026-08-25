import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppAvatar } from '@/components/AppAvatar';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { SkeletonDetail } from '@/components/Skeleton';
import { useAppToast } from '@/components/useAppToast';
import { useMeQuery } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { ocrApi, uploadPhotoToSupabase } from '@/features/ocr-capture/api';
import { AvatarActionSheet } from './AvatarActionSheet';
import { useUpdateProfileMutation } from './useProfile';
import type { UploadContentType } from '@/types/api';

// Cùng regex phoneSchema ở app/(auth)/login.tsx — SĐT dùng để đăng nhập (AuthController thử email rồi
// phone) nên phải khớp đúng format backend `UpdateProfileRequest.phone` chấp nhận (@Pattern).
const editProfileSchema = z.object({
  fullName: z.string().min(1, 'Bắt buộc nhập họ tên'),
  phone: z
    .string()
    .min(1, 'Bắt buộc nhập số điện thoại')
    .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ — cần 10 số'),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

function guessContentType(uri: string): UploadContentType {
  // Trùng logic useOcrQueue.ts (không tách shared util cho 1 dòng — CLAUDE.md §9 ưu tiên đơn giản).
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

/** Màn 11 "Chỉnh sửa hồ sơ" (artboard "11 · Chỉnh sửa hồ sơ"). Email/Vai trò read-only theo design —
 * đổi email không nằm trong phạm vi màn này (chưa có yêu cầu/API đổi email tự phục vụ). */
export function EditProfileScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showToast } = useAppToast();
  const query = useMeQuery(isAuthenticated);
  const updateMutation = useUpdateProfileMutation();
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // avatarUrl hiện tại đang chỉnh (objectPath thô nếu vừa đổi, hoặc field cũ từ /users/me) — tách khỏi
  // form react-hook-form vì không phải input text, cập nhật ngay lập tức khi upload xong (không đợi bấm
  // "Lưu thay đổi" — đúng UX màn 12 "Đã cập nhật hồ sơ" hiện toast ngay).
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', phone: '' },
  });

  useEffect(() => {
    if (query.data) {
      reset({ fullName: query.data.fullName, phone: query.data.phone ?? '' });
      setAvatarPath(query.data.avatarUrl);
    }
  }, [query.data, reset]);

  async function handleAvatarPicked(uri: string) {
    setAvatarUploading(true);
    setAvatarPreviewUri(uri);
    try {
      const contentType = guessContentType(uri);
      const { photoPath, uploadUrl } = await ocrApi.getUploadUrl(contentType);
      await uploadPhotoToSupabase(uploadUrl, contentType, uri);
      // Lưu avatar NGAY (không đợi bấm "Lưu thay đổi" chung của form) — đúng snackbar "Đã cập nhật hồ
      // sơ" ngay sau khi chọn ảnh ở màn 12, độc lập với việc đang sửa dở tên/SĐT hay chưa.
      if (query.data) {
        await updateMutation.mutateAsync({
          fullName: query.data.fullName,
          avatarUrl: photoPath,
          position: query.data.position,
          phone: query.data.phone,
        });
      }
      setAvatarPath(photoPath);
      showToast({ title: 'Đã cập nhật hồ sơ', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Không cập nhật được ảnh đại diện', description: getErrorMessage(err), variant: 'error' });
      setAvatarPreviewUri(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    if (!query.data) return;
    try {
      await updateMutation.mutateAsync({
        fullName: query.data.fullName,
        avatarUrl: null,
        position: query.data.position,
        phone: query.data.phone,
      });
      setAvatarPath(null);
      setAvatarPreviewUri(null);
      showToast({ title: 'Đã cập nhật hồ sơ', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Không xóa được ảnh đại diện', description: getErrorMessage(err), variant: 'error' });
    }
  }

  async function onSubmit(values: EditProfileFormValues) {
    if (!query.data) return;
    try {
      await updateMutation.mutateAsync({
        fullName: values.fullName,
        avatarUrl: avatarPath,
        position: query.data.position,
        phone: values.phone,
      });
      showToast({ title: 'Đã cập nhật hồ sơ', variant: 'success' });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
    } catch (err) {
      showToast({ title: 'Lưu thay đổi thất bại', description: getErrorMessage(err), variant: 'error' });
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
        <AppHeading size="xl">Chỉnh sửa hồ sơ</AppHeading>

        {query.isLoading ? <SkeletonDetail lines={4} /> : null}
        {query.isError ? (
          <ErrorState message="Không thể tải thông tin hồ sơ." detail={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : null}

        {query.data ? (
          <VStack space="md">
            <Box className="items-center">
              <Pressable onPress={() => setAvatarSheetOpen(true)} disabled={avatarUploading}>
                <Box className="items-center">
                  <AppAvatar
                    fullName={query.data.fullName}
                    photoUrl={avatarPreviewUri ?? avatarPath ?? query.data.avatarUrl}
                    size={88}
                  />
                  <AppText size="sm" className="mt-2 text-primary">
                    {avatarUploading ? 'Đang tải ảnh lên...' : 'Đổi ảnh đại diện'}
                  </AppText>
                </Box>
              </Pressable>
            </Box>

            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <AppInput
                  label="Họ và tên"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.fullName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <AppInput
                  label="Số điện thoại"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                  error={errors.phone?.message}
                />
              )}
            />

            <AppInput label="Email" value={query.data.email} editable={false} className="opacity-60" />

            <Box className="rounded-xl border border-border bg-card px-4 py-3">
              <AppText size="sm" className="text-muted-foreground">
                Vai trò
              </AppText>
              <AppText className="mt-1">{query.data.role === 'ADMIN' ? 'Quản trị viên' : 'Tổ trưởng'}</AppText>
              <AppText size="xs" className="mt-1 text-muted-foreground">
                Do quản trị hệ thống cấp
              </AppText>
            </Box>

            <AppButton
              isLoading={updateMutation.isPending}
              isDisabled={!isDirty || !isValid}
              onPress={handleSubmit(onSubmit)}
            >
              Lưu thay đổi
            </AppButton>
            <AppText size="xs" className="text-center text-muted-foreground">
              Nút Lưu chỉ bật khi thông tin hợp lệ và có thay đổi.
            </AppText>
          </VStack>
        ) : null}
      </VStack>

      <AvatarActionSheet
        visible={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        onPicked={handleAvatarPicked}
        onRemove={handleAvatarRemove}
        hasCurrentAvatar={!!(avatarPreviewUri ?? avatarPath)}
      />
    </ScrollView>
  );
}
