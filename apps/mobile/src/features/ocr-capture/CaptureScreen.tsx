import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable as RNPressable, ScrollView, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { todayIsoDate } from '@/features/reports/dateRange';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import type { OcrTargetType } from '@/types/api';
import { useOcrSessionStore } from './store';
import { useOcrQueue, type QueueItem } from './useOcrQueue';

const DOCUMENT_TYPE_OPTIONS: { value: OcrTargetType; title: string; description: string }[] = [
  { value: 'PRODUCTION_RECORD', title: 'Sổ ghi mủ', description: 'Sản lượng theo từng công nhân · mủ nước có DRC' },
  { value: 'LATEX_SALE', title: 'Sổ bán mủ', description: 'Bán theo tổ · người mua, người ký bán' },
];

function todayLabel(): string {
  return `${todayIsoDate().split('-').reverse().join('/')} · Hôm nay`;
}

/**
 * Tab "Chụp ảnh" — chia 2 bước theo đúng Claude Design (màn 02 "Chọn loại phiếu" tách khỏi màn 03
 * "Camera", KHÔNG gộp chung 1 màn như bản trước — xem docs/module-1-1-frontend-redesign-progress.md).
 * Vẫn cùng 1 route `/capture` (không thêm route mới) — chỉ đổi bằng step state cục bộ, giữ nguyên toàn
 * bộ logic nghiệp vụ (`useOcrQueue`/ADR-0011, chụp liên tục tự động upload+OCR từng ảnh — Phase 7 CHƯA
 * đổi sang mô hình "kiểm ảnh trước khi gửi", còn chờ Product Owner quyết định).
 *
 * "Ngày" ở bước chọn loại phiếu CHỈ hiển thị (không có nút "Đổi" như Claude Design) — vì
 * `OcrCaptureRequest` (services/api dto) không có field `recordDate`: ngày ghi nhận do AI tự đọc từ ảnh
 * phiếu giấy, không phải Admin chọn trước ở client. Thêm 1 date-picker giả ở đây sẽ đánh lừa người dùng
 * là họ đang chỉnh được ngày trong khi thực tế backend bỏ qua — vi phạm CLAUDE.md "UI cần data gì chưa
 * có API → ghi rõ, không tự thêm field không có tác dụng".
 */
export function CaptureScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'camera'>('select');
  const [targetType, setTargetType] = useState<OcrTargetType>('PRODUCTION_RECORD');
  const [changingTeam, setChangingTeam] = useState(false);
  const [dismissedBannerFor, setDismissedBannerFor] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const { data: teams } = useTeamsLookupQuery();
  const activeTeamId = useOcrSessionStore((s) => s.activeTeamId);
  const activeTeamName = useOcrSessionStore((s) => s.activeTeamName);
  const setActiveTeam = useOcrSessionStore((s) => s.setActiveTeam);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { items, enqueue } = useOcrQueue();

  const teamOptions = (teams ?? []).map((t) => ({ label: t.name, value: t.id }));
  const selectedType = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === targetType)!;
  const latestError = items.find((i) => i.status === 'error' && i.id !== dismissedBannerFor);
  const doneCount = items.filter((i) => i.status === 'done').length;

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

  if (step === 'select') {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        <VStack space="lg">
          <AppHeading size="2xl">Chụp phiếu</AppHeading>

          <VStack space="sm">
            <AppText size="xs" className="text-muted-foreground">
              Loại phiếu
            </AppText>
            <VStack space="sm">
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <Pressable key={opt.value} onPress={() => setTargetType(opt.value)}>
                  <AppCard className={targetType === opt.value ? 'bg-primary/10 border-primary' : undefined}>
                    <HStack className="items-start justify-between" space="sm">
                      <VStack className="flex-1">
                        <AppText className={`font-semibold ${targetType === opt.value ? 'text-primary' : ''}`}>
                          {opt.title}
                        </AppText>
                        <AppText size="sm" className="text-muted-foreground mt-1">
                          {opt.description}
                        </AppText>
                      </VStack>
                      {targetType === opt.value ? <AppText className="text-primary font-semibold">✓</AppText> : null}
                    </HStack>
                  </AppCard>
                </Pressable>
              ))}
            </VStack>
          </VStack>

          <VStack space="sm">
            <AppText size="xs" className="text-muted-foreground">
              Áp dụng cho cả buổi chụp
            </AppText>
            <AppCard className="p-0 overflow-hidden">
              <HStack className="items-center justify-between p-4">
                <VStack>
                  <AppText size="xs" className="text-muted-foreground">
                    Ngày
                  </AppText>
                  <AppText className="font-medium mt-0.5">{todayLabel()}</AppText>
                </VStack>
              </HStack>
              <HStack className="items-center justify-between p-4 border-t border-border">
                <VStack className="flex-1">
                  <AppText size="xs" className="text-muted-foreground">
                    Tổ
                  </AppText>
                  <AppText className="font-medium mt-0.5">{activeTeamName ?? 'Chưa chọn Tổ'}</AppText>
                  {changingTeam ? (
                    <Box className="mt-2">
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
                    </Box>
                  ) : null}
                </VStack>
                <AppButton size="sm" variant="outline" onPress={() => setChangingTeam((v) => !v)}>
                  Đổi
                </AppButton>
              </HStack>
            </AppCard>
            <AppText size="sm" className="text-muted-foreground">
              Mọi ảnh chụp trong lần này dùng chung ngày và tổ ở trên — không phải chọn lại cho từng ảnh.
            </AppText>
          </VStack>

          <AppButton size="lg" onPress={() => setStep('camera')}>
            Mở camera
          </AppButton>
        </VStack>
      </ScrollView>
    );
  }

  return (
    <VStack className="flex-1" style={{ backgroundColor: '#131516' }}>
      <HStack className="items-center justify-between px-4 pt-3 pb-2">
        <Box className="rounded-full px-3.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
          <AppText size="sm" className="font-medium" style={{ color: '#F4F5F5' }}>
            {`${selectedType.title}${activeTeamName ? ` · ${activeTeamName}` : ''}`}
          </AppText>
        </Box>
        <RNPressable onPress={() => setStep('select')} hitSlop={8}>
          <AppText size="lg" style={{ color: '#C9CDCF' }}>
            ✕
          </AppText>
        </RNPressable>
      </HStack>

      {latestError ? (
        <Box className="mx-4 mb-2 border border-destructive rounded-md p-3 bg-destructive/10">
          <HStack className="items-start justify-between" space="sm">
            <AppText size="sm" style={{ color: '#F4F5F5' }} className="flex-1">
              ⚠ {items.filter((i) => i.status === 'error').length} ảnh lỗi/không khớp loại phiếu đã chọn —{' '}
              {latestError.error}
            </AppText>
            <RNPressable onPress={() => setDismissedBannerFor(latestError.id)}>
              <AppText size="sm" style={{ color: '#F4F5F5' }}>
                ✕
              </AppText>
            </RNPressable>
          </HStack>
        </Box>
      ) : null}

      <Box className="flex-1 mx-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#000' }}>
        {permission?.granted ? (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            <CornerBrackets />
          </>
        ) : (
          <VStack className="flex-1 items-center justify-center p-4" space="sm">
            <AppText className="text-white text-center">Cần quyền truy cập camera để chụp phiếu giấy.</AppText>
            <AppButton onPress={requestPermission}>Cấp quyền</AppButton>
          </VStack>
        )}
      </Box>

      <VStack space="md" className="p-4">
        {items.length > 0 ? (
          <HStack className="items-center justify-between">
            <AppText className="font-semibold" style={{ color: '#F4F5F5' }}>
              {`Đã chụp ${items.length} ảnh`}
            </AppText>
            <RNPressable onPress={() => setShowQueue((v) => !v)}>
              <AppText size="sm" style={{ color: '#9FD3C4' }}>
                {showQueue ? 'Ẩn' : 'Xem lại'}
              </AppText>
            </RNPressable>
          </HStack>
        ) : null}

        <HStack className="items-center justify-between">
          <AppButton variant="outline" size="sm" onPress={handlePickLibrary}>
            Thư viện
          </AppButton>
          <RNPressable
            onPress={handleShutter}
            disabled={!permission?.granted}
            style={[styles.shutter, !permission?.granted && { opacity: 0.4 }]}
            accessibilityLabel="Chụp ảnh"
          />
          <AppButton
            size="sm"
            isDisabled={items.length === 0}
            onPress={() => router.push('/(tabs)')}
          >
            {`Hoàn tất${items.length > 0 ? ` · ${doneCount}/${items.length}` : ''}`}
          </AppButton>
        </HStack>

        {items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space="sm">
              {items.map((item) => (
                <ThumbnailTile key={item.id} item={item} onOpenReview={() => router.push(`/ocr-review/${item.response?.ocrCallLogId}`)} />
              ))}
            </HStack>
          </ScrollView>
        ) : null}

        {showQueue && items.length > 0 ? (
          <VStack space="xs">
            {items.map((item) => (
              <HStack key={`row-${item.id}`} className="items-center justify-between rounded-md p-2" style={{ backgroundColor: 'rgba(255,255,255,.06)' }}>
                <AppText size="sm" numberOfLines={1} className="flex-1" style={{ color: '#F4F5F5' }}>
                  {item.fileName}
                </AppText>
                <AppText size="xs" style={{ color: queueStatusColor(item.status) }}>
                  {queueStatusLabel(item.status)}
                </AppText>
              </HStack>
            ))}
          </VStack>
        ) : null}
      </VStack>
    </VStack>
  );
}

/** 4 góc bo khung ngắm — thuần visual, khớp Claude Design màn 03 ("đặt trọn phiếu giấy trong khung"). */
function CornerBrackets() {
  const common = { position: 'absolute' as const, width: 28, height: 28, borderColor: '#F4F5F5' };
  return (
    <>
      <Box style={[common, { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 }]} />
      <Box style={[common, { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 }]} />
      <Box style={[common, { bottom: 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 }]} />
      <Box style={[common, { bottom: 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 }]} />
    </>
  );
}

function queueStatusLabel(status: QueueItem['status']): string {
  switch (status) {
    case 'uploading':
      return 'Đang tải lên…';
    case 'processing':
      return 'Đang đọc…';
    case 'done':
      return 'Xong';
    case 'error':
      return 'Lỗi';
  }
}

function queueStatusColor(status: QueueItem['status']): string {
  switch (status) {
    case 'done':
      return '#9FD3C4';
    case 'error':
      return '#E7B3AC';
    default:
      return '#C9CDCF';
  }
}

/** Thumbnail ảnh thật (khớp dải ảnh vừa chụp ở Claude Design màn 03) — thay cho danh sách text trước
 * đây. Ảnh mờ dần khi đang xử lý, viền màu theo trạng thái; bấm vào ảnh đã xong để mở lại màn review. */
function ThumbnailTile({ item, onOpenReview }: { item: QueueItem; onOpenReview: () => void }) {
  const borderColor =
    item.status === 'done' ? '#9FD3C4' : item.status === 'error' ? '#E7B3AC' : 'rgba(244,245,245,.25)';
  const content = (
    <Box
      className="rounded-md overflow-hidden"
      style={{ width: 56, height: 72, borderWidth: item.status === 'uploading' ? 1 : 2, borderColor }}
    >
      <Image
        source={{ uri: item.uri }}
        style={{ width: '100%', height: '100%', opacity: item.status === 'done' ? 1 : 0.55 }}
        contentFit="cover"
      />
      {item.status === 'error' ? (
        <Box className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(22,25,27,.55)' }}>
          <AppText size="xs" style={{ color: '#F4F5F5' }}>
            ⚠
          </AppText>
        </Box>
      ) : null}
    </Box>
  );
  return item.status === 'done' ? <RNPressable onPress={onOpenReview}>{content}</RNPressable> : content;
}

const styles = StyleSheet.create({
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(244,245,245,.28)',
  },
});
