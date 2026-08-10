import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Pressable as RNPressable, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import type { OcrTargetType } from '@/types/api';
import { useOcrSessionStore } from './store';
import { useOcrQueue, type QueueItemStatus } from './useOcrQueue';

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  uploading: 'Đang tải lên…',
  processing: 'Đang đọc…',
  done: 'Xong',
  error: 'Lỗi',
};

/**
 * Tab "Chụp ảnh" (mặc định khi mở app, CLAUDE.md §5) — chọn loại phiếu TRƯỚC, chụp liên tục hoặc chọn
 * nhiều ảnh thư viện, hàng đợi xử lý trong bộ nhớ (ADR-0011). Bỏ auto-crop/sharpen thật sự ở v1 (chỉ
 * crop thủ công qua expo-image-manipulator nếu Admin muốn — CHƯA build ở bước này, đo nhu cầu sau khi
 * có dữ liệu OCR thật).
 */
export function CaptureScreen() {
  const router = useRouter();
  const [targetType, setTargetType] = useState<OcrTargetType>('PRODUCTION_RECORD');
  const [changingTeam, setChangingTeam] = useState(false);
  const [dismissedBannerFor, setDismissedBannerFor] = useState<string | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const activeTeamId = useOcrSessionStore((s) => s.activeTeamId);
  const activeTeamName = useOcrSessionStore((s) => s.activeTeamName);
  const setActiveTeam = useOcrSessionStore((s) => s.setActiveTeam);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { items, enqueue } = useOcrQueue();

  const teamOptions = (teams ?? []).map((t) => ({ label: t.name, value: t.id }));
  const latestError = items.find((i) => i.status === 'error' && i.id !== dismissedBannerFor);

  async function handleShutter() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      enqueue(photo.uri, photo.uri.split('/').pop() ?? 'capture.jpg', targetType, activeTeamId);
    }
  }

  async function handlePickLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => {
      enqueue(asset.uri, asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg', targetType, activeTeamId);
    });
  }

  return (
    <VStack className="flex-1 bg-background">
      <VStack space="sm" className="p-4 pb-2">
        <HStack className="items-center justify-between">
          <HStack space="xs">
            <AppButton
              size="sm"
              variant={targetType === 'PRODUCTION_RECORD' ? 'default' : 'outline'}
              onPress={() => setTargetType('PRODUCTION_RECORD')}
            >
              Sổ ghi mủ
            </AppButton>
            <AppButton
              size="sm"
              variant={targetType === 'LATEX_SALE' ? 'default' : 'outline'}
              onPress={() => setTargetType('LATEX_SALE')}
            >
              Sổ bán mủ
            </AppButton>
          </HStack>
        </HStack>

        <HStack className="items-center justify-between">
          <HStack space="xs" className="items-center">
            <Box className="rounded-full bg-accent px-2 py-1">
              <AppText size="xs">{activeTeamName ?? 'Chưa chọn Tổ'}</AppText>
            </Box>
            {activeTeamName ? (
              <AppText size="xs" className="text-muted-foreground">
                đang làm việc
              </AppText>
            ) : null}
          </HStack>
          <AppButton size="sm" variant="outline" onPress={() => setChangingTeam((v) => !v)}>
            Đổi Tổ
          </AppButton>
        </HStack>

        {changingTeam ? (
          <AppSelect
            placeholder="Chọn Tổ đang làm việc"
            value={activeTeamId}
            options={teamOptions}
            onChange={(id) => {
              const name = teams?.find((t) => t.id === id)?.name ?? null;
              setActiveTeam(id, name);
              setChangingTeam(false);
            }}
          />
        ) : null}

        {latestError ? (
          <Box className="border border-destructive rounded-md p-3 bg-destructive/10">
            <HStack className="items-start justify-between" space="sm">
              <AppText size="sm" className="flex-1">
                ⚠ {items.filter((i) => i.status === 'error').length} ảnh lỗi/không khớp loại phiếu đã chọn —{' '}
                {latestError.error}
              </AppText>
              <RNPressable onPress={() => setDismissedBannerFor(latestError.id)}>
                <AppText size="sm">✕</AppText>
              </RNPressable>
            </HStack>
          </Box>
        ) : null}
      </VStack>

      <Box className="mx-4 rounded-2xl overflow-hidden bg-black" style={styles.viewfinder}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <VStack className="flex-1 items-center justify-center p-4" space="sm">
            <AppText className="text-white text-center">Cần quyền truy cập camera để chụp phiếu giấy.</AppText>
            <AppButton onPress={requestPermission}>Cấp quyền</AppButton>
          </VStack>
        )}
      </Box>

      <HStack className="items-center justify-center p-4" space="lg">
        <AppButton variant="outline" onPress={handlePickLibrary}>
          ▤ Thư viện
        </AppButton>
        <RNPressable
          onPress={handleShutter}
          disabled={!permission?.granted}
          style={[styles.shutter, !permission?.granted && { opacity: 0.4 }]}
          accessibilityLabel="Chụp ảnh"
        />
      </HStack>

      {items.length > 0 ? (
        <VStack space="xs" className="px-4 pb-4">
          <AppText size="xs" className="text-muted-foreground">
            {`Ảnh vừa xử lý (${items.length})`}
          </AppText>
          {items.map((item) => (
            <HStack key={item.id} className="items-center justify-between border border-border rounded-md p-2">
              <AppText size="sm" numberOfLines={1} className="flex-1">
                {item.fileName}
              </AppText>
              <HStack space="xs" className="items-center">
                {item.status === 'done' && item.response ? (
                  <AppButton
                    size="sm"
                    variant="outline"
                    onPress={() => router.push(`/ocr-review/${item.response!.ocrCallLogId}`)}
                  >
                    Xem lại
                  </AppButton>
                ) : null}
                <Box
                  className={`rounded-full px-2 py-0.5 ${
                    item.status === 'done' ? 'bg-accent' : item.status === 'error' ? 'bg-destructive' : 'bg-muted'
                  }`}
                >
                  <AppText size="xs" className={item.status === 'error' ? 'text-white' : undefined}>
                    {STATUS_LABEL[item.status]}
                  </AppText>
                </Box>
              </HStack>
            </HStack>
          ))}
        </VStack>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  viewfinder: {
    height: 320,
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: '#00000022',
  },
});
