import { useEffect, useRef, useState } from 'react';
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
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { todayIsoDate } from '@/features/reports/dateRange';
import { useTeamsLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import type { OcrTargetType } from '@/types/api';
import { scanBatchApi } from './api';
import { useOcrSessionStore } from './store';
import { useOcrQueue, type QueueItem } from './useOcrQueue';

const DOCUMENT_TYPE_OPTIONS: { value: OcrTargetType; title: string; description: string }[] = [
  { value: 'PRODUCTION_RECORD', title: 'Sổ ghi mủ', description: 'Sản lượng theo từng công nhân · mủ nước có DRC' },
  { value: 'LATEX_SALE', title: 'Sổ bán mủ', description: 'Bán theo tổ · người mua, người ký bán' },
];

function dateLabel(iso: string): string {
  const isToday = iso === todayIsoDate();
  return `${iso.split('-').reverse().join('/')}${isToday ? ' · Hôm nay' : ''}`;
}

/** Nhãn banner khi `/scan-batches/lookup` báo key (documentType+teamId+workDate) đang bị chặn — Spec 1
 * mục 1: FAILED cần "Thử lại"/"Hủy phiên" (mở màn Batch Review để xử lý), APPROVED thì ngày này đã chốt
 * số liệu, không mở camera tiếp cho đúng key đó nữa (đổi ngày/Tổ khác nếu cần chụp bổ sung thật). */
function blockedReasonLabel(status: string | null): string {
  if (status === 'FAILED') {
    return 'Phiên quét trước cho Tổ/ngày/loại phiếu này đang LỖI — mở lại để "Thử lại" hoặc "Hủy phiên" trước khi chụp tiếp.';
  }
  if (status === 'APPROVED') {
    return 'Tổ/ngày/loại phiếu này đã được xác nhận (APPROVED) — không thể chụp thêm vào đúng ngày này.';
  }
  return 'Không thể chụp tiếp cho Tổ/ngày/loại phiếu này lúc này.';
}

/**
 * Tab "Chụp ảnh" — chia 2 bước theo đúng Claude Design (màn 02 "Chọn loại phiếu" tách khỏi màn 03
 * "Camera", KHÔNG gộp chung 1 màn — xem docs/module-1-1-frontend-redesign-progress.md). Vẫn cùng 1
 * route `/capture` (không thêm route mới) — chỉ đổi bằng step state cục bộ.
 *
 * 0021-scan-batch-model (Spec 1): `sessionWorkDate` giờ là input THẬT của Admin (RULE 1 — nguồn ngày
 * làm việc chính, KHÔNG suy từ OCR nữa) và Tổ BẮT BUỘC chọn cho CẢ 2 loại phiếu (khác bản trước —
 * PRODUCTION_RECORD từng không bắt buộc) vì cả 2 đều là 1 phần của LogicalBatchKey. Trước khi mở camera,
 * gọi `GET /scan-batches/lookup` để biết ngay có batch FAILED/APPROVED đang giữ đúng key này không —
 * chặn tại chỗ thay vì để Admin chụp xong mới nhận lỗi 409 giữa chừng.
 */
export function CaptureScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'camera'>('select');
  const [targetType, setTargetType] = useState<OcrTargetType>('PRODUCTION_RECORD');
  const [changingTeam, setChangingTeam] = useState(false);
  const [dismissedBannerFor, setDismissedBannerFor] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [checkingLookup, setCheckingLookup] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState<string | null>(null);

  const { data: teams } = useTeamsLookupQuery();
  const activeTeamId = useOcrSessionStore((s) => s.activeTeamId);
  const activeTeamName = useOcrSessionStore((s) => s.activeTeamName);
  const setActiveTeam = useOcrSessionStore((s) => s.setActiveTeam);
  const sessionWorkDate = useOcrSessionStore((s) => s.sessionWorkDate);
  const setSessionWorkDate = useOcrSessionStore((s) => s.setSessionWorkDate);

  // Mặc định hôm nay khi phiên chưa từng chọn ngày (lần đầu mở tab) — không ghi đè nếu Admin đã chọn
  // trong 1 phiên trước đó rồi điều hướng qua lại.
  useEffect(() => {
    if (!sessionWorkDate) {
      setSessionWorkDate(todayIsoDate());
    }
  }, [sessionWorkDate, setSessionWorkDate]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { items, enqueue, batchId } = useOcrQueue();

  const teamOptions = (teams ?? []).map((t) => ({ label: t.name, value: t.id }));
  const selectedType = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === targetType)!;
  const latestError = items.find((i) => i.status === 'error' && i.id !== dismissedBannerFor);
  const doneCount = items.filter((i) => i.status === 'done').length;
  const canOpenCamera = Boolean(activeTeamId && sessionWorkDate);

  async function handleShutter() {
    if (!cameraRef.current || !activeTeamId || !sessionWorkDate) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      enqueue(photo.uri, photo.uri.split('/').pop() ?? 'capture.jpg', targetType, activeTeamId, sessionWorkDate);
    }
  }

  async function handlePickLibrary() {
    if (!activeTeamId || !sessionWorkDate) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => {
      enqueue(
        asset.uri,
        asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg',
        targetType,
        activeTeamId,
        sessionWorkDate,
      );
    });
  }

  async function handleOpenCamera() {
    if (!activeTeamId || !sessionWorkDate) return;
    setCheckingLookup(true);
    setBlockedStatus(null);
    try {
      const result = await scanBatchApi.lookup(targetType, activeTeamId, sessionWorkDate);
      if (result.blocked) {
        setBlockedStatus(result.status);
        return;
      }
      setStep('camera');
    } catch (err) {
      // Lookup lỗi kỹ thuật (mất mạng...) — không chặn cứng, để Admin tự thử chụp (capture sẽ báo lỗi
      // rõ ràng nếu thật sự có conflict, CLAUDE.md §9 chấp nhận rủi ro mất mạng thực địa).
      setStep('camera');
    } finally {
      setCheckingLookup(false);
    }
  }

  function handleFinish() {
    if (batchId) {
      router.push(`/scan-batch-review/${batchId}`);
    } else {
      router.push('/(tabs)');
    }
  }

  function openBatchReview(item: QueueItem) {
    if (item.batchId) {
      router.push(`/scan-batch-review/${item.batchId}`);
    }
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
              <Box className="p-4">
                <AppInput
                  label="Ngày"
                  value={sessionWorkDate ?? ''}
                  onChangeText={setSessionWorkDate}
                  placeholder="yyyy-mm-dd"
                />
                {sessionWorkDate ? (
                  <AppText size="xs" className="text-muted-foreground mt-1">
                    {dateLabel(sessionWorkDate)}
                  </AppText>
                ) : null}
              </Box>
              <HStack className="items-center justify-between p-4 border-t border-border">
                <VStack className="flex-1">
                  <AppText size="xs" className="text-muted-foreground">
                    Tổ (bắt buộc)
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

          {blockedStatus ? (
            <Box className="border border-destructive rounded-md p-3 bg-destructive/10">
              <AppText size="sm">{blockedReasonLabel(blockedStatus)}</AppText>
            </Box>
          ) : null}

          <AppButton size="lg" onPress={handleOpenCamera} isDisabled={!canOpenCamera} isLoading={checkingLookup}>
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
            {`${selectedType.title}${activeTeamName ? ` · ${activeTeamName}` : ''}${sessionWorkDate ? ` · ${sessionWorkDate}` : ''}`}
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
          <AppButton size="sm" isDisabled={items.length === 0} onPress={handleFinish}>
            {`Hoàn tất${items.length > 0 ? ` · ${doneCount}/${items.length}` : ''}`}
          </AppButton>
        </HStack>

        {items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space="sm">
              {items.map((item) => (
                <ThumbnailTile key={item.id} item={item} onOpenReview={() => openBatchReview(item)} />
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
 * đây. Ảnh mờ dần khi đang xử lý, viền màu theo trạng thái; bấm vào ảnh đã xong để mở màn Batch Review
 * (0021-scan-batch-model — thay cho mở lại đúng response OCR của riêng ảnh này như bản cũ). */
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
  return item.batchId ? <RNPressable onPress={onOpenReview}>{content}</RNPressable> : content;
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
