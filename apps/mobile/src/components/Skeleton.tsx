import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { View, type ViewStyle } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { AppCard } from '@/components/AppCard';

/**
 * Shimmer loading — thay `LoadingState` (spinner+text) ở các màn hình có shape dữ liệu rõ ràng (danh
 * sách, card, form), cho cảm giác "sắp có nội dung gì" thay vì chỉ báo "đang chờ" chung chung
 * (yêu cầu người dùng "them shimmer loading cho cac man hinh", 2026-08-25).
 *
 * Dùng `react-native-reanimated` (đã có sẵn trong deps, không thêm dependency mới) — animate opacity
 * lặp vô hạn giữa 0.4 và 1, KHÔNG dùng gradient sweep (cần thêm `expo-linear-gradient`/mask, phức tạp
 * hơn mức cần thiết cho hiệu ứng "đang tải").
 */
export function Skeleton({
  width,
  height,
  radius = 6,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className="bg-muted"
      style={[{ width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}

/** 1 dòng text giả — width theo % để nhiều dòng cạnh nhau trông tự nhiên (không đều tăm tắp). */
export function SkeletonText({ width = '100%', height = 14 }: { width?: number | `${number}%`; height?: number }) {
  return <Skeleton width={width} height={height} radius={4} />;
}

/**
 * 1 dòng trong danh sách dạng AppCard (tiêu đề + phụ đề, có thể kèm badge/trailing) — khớp shape
 * dùng chung ở hầu hết màn danh mục (Tổ/Nhân viên/Loại mủ/Đơn giá/Phụ cấp/Batch/Log OCR...).
 */
function SkeletonListRow({ trailing = true }: { trailing?: boolean }) {
  return (
    <AppCard>
      <HStack className="items-center justify-between">
        <VStack space="xs" style={{ flex: 1 }}>
          <SkeletonText width="55%" height={16} />
          <SkeletonText width="35%" height={12} />
        </VStack>
        {trailing ? <Skeleton width={64} height={22} radius={999} /> : null}
      </HStack>
    </AppCard>
  );
}

/** N dòng skeleton dạng danh sách — thay `<LoadingState />` ở các màn liệt kê (list-shaped loading). */
export function SkeletonList({ rows = 4, trailing = true }: { rows?: number; trailing?: boolean }) {
  return (
    <VStack space="sm">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListRow key={i} trailing={trailing} />
      ))}
    </VStack>
  );
}

/** Khối form/detail — vài dòng label+value trong 1 card, dùng cho màn chi tiết/hồ sơ. */
export function SkeletonDetail({ lines = 5 }: { lines?: number }) {
  return (
    <AppCard>
      <VStack space="md">
        {Array.from({ length: lines }).map((_, i) => (
          <HStack key={i} className="items-center justify-between">
            <SkeletonText width="30%" height={12} />
            <SkeletonText width="40%" height={14} />
          </HStack>
        ))}
      </VStack>
    </AppCard>
  );
}

/** Placeholder biểu đồ cột — dùng cho khu vực chart trong lúc tải (Home "Sản lượng 7 ngày"). */
export function SkeletonChart({ bars = 7, height = 110 }: { bars?: number; height?: number }) {
  // Chiều cao cột random nhẹ (40-100%) để trông giống dữ liệu thật hơn là 1 dãy cột đều tăm tắp.
  const heights = Array.from({ length: bars }).map((_, i) => 40 + ((i * 17) % 60));
  return (
    <HStack className="items-end" style={{ height, gap: 6 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
          <Skeleton width="100%" height={(h / 100) * height} radius={4} />
        </View>
      ))}
    </HStack>
  );
}

/** Skeleton màn Hồ sơ — avatar tròn + tên/vai trò + 2 khối menu, khớp shape `ProfileScreen`. */
export function SkeletonProfile() {
  return (
    <VStack space="md">
      <Box className="items-center rounded-xl border border-border bg-card p-4">
        <Skeleton width={80} height={80} radius={40} />
        <Skeleton width={120} height={18} style={{ marginTop: 12 }} />
        <Skeleton width={90} height={13} style={{ marginTop: 8 }} />
      </Box>
      <VStack space="xs">
        <Skeleton width={70} height={12} />
        <AppCard>
          <VStack space="md">
            <SkeletonText width="70%" height={15} />
            <SkeletonText width="50%" height={15} />
          </VStack>
        </AppCard>
      </VStack>
    </VStack>
  );
}

/** Skeleton bản đồ Home — khớp shape: card sản lượng, grid 2×2 metric, chip Tổ ngang, khung chart. */
export function HomeSkeleton() {
  return (
    <VStack space="sm">
      <VStack space="xs">
        <Skeleton width="45%" height={20} />
      </VStack>
      <AppCard>
        <VStack space="md">
          <Skeleton width="50%" height={28} />
          <VStack space="sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <HStack key={i} className="items-center justify-between">
                <SkeletonText width="35%" height={13} />
                <SkeletonText width="20%" height={13} />
              </HStack>
            ))}
          </VStack>
        </VStack>
      </AppCard>

      <VStack space="sm">
        <HStack space="sm">
          <Box style={{ flex: 1 }}>
            <Skeleton width="100%" height={92} radius={16} />
          </Box>
          <Box style={{ flex: 1 }}>
            <Skeleton width="100%" height={92} radius={16} />
          </Box>
        </HStack>
        <HStack space="sm">
          <Box style={{ flex: 1 }}>
            <Skeleton width="100%" height={92} radius={16} />
          </Box>
          <Box style={{ flex: 1 }}>
            <Skeleton width="100%" height={92} radius={16} />
          </Box>
        </HStack>
      </VStack>

      <HStack space="sm">
        <Skeleton width={148} height={56} radius={12} />
        <Skeleton width={148} height={56} radius={12} />
        <Skeleton width={148} height={56} radius={12} />
      </HStack>

      <AppCard>
        <SkeletonChart />
      </AppCard>
    </VStack>
  );
}
