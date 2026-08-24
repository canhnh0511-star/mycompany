import { useEffect } from 'react';
import { BackHandler, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Xem ảnh phiếu toàn màn hình + phóng to (pinch/double-tap) + kéo khi đã zoom. Dùng cho ảnh gốc trên
 * BatchReviewScreen (Admin cần soi số liệu viết tay so với kết quả OCR) — thumbnail 72x92 quá nhỏ để
 * đọc chữ mờ, phát hiện thiếu tính năng này khi test thật trên iPhone (2026-08-22).
 *
 * Chỉ dùng react-native-gesture-handler + react-native-reanimated (đã có sẵn trong package.json cho
 * toast, CLAUDE.md §1/§9 — không thêm dependency mới cho việc có thể làm được bằng thứ đã có).
 *
 * KHÔNG dùng `Modal` của react-native — Modal tạo 1 native root RIÊNG, tách khỏi cây view chính, nên
 * phải bọc thêm 1 GestureHandlerRootView MỚI mỗi lần mở, và việc khởi tạo lại native gesture manager
 * đó có độ trễ thật (bấm lần đầu không ăn, phải đợi rồi bấm lại mới tắt được — phát hiện khi test thật
 * trên iPhone 2026-08-23). Thay bằng 1 lớp phủ toàn màn hình tuyệt đối NGAY TRONG cây view chính — dùng
 * chung GestureHandlerRootView đã khởi tạo sẵn ở app root (_layout.tsx), không có độ trễ khởi tạo lại,
 * và tận dụng được safe-area-context sẵn có cho nút Đóng (tránh bị tai thỏ/status bar che — cũng phát
 * hiện khi test thật). Tự xử lý phím Back Android (Modal.onRequestClose không còn áp dụng được nữa).
 */
export function ZoomableImageModal({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Phím Back vật lý Android — thay cho Modal.onRequestClose cũ, chỉ đăng ký khi đang mở.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        reset();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= MIN_SCALE) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > MIN_SCALE) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  // Race double-tap với pan (1 trong 2 thắng, không cùng lúc), rồi cho chạy đồng thời với pinch —
  // pinch + pan cùng lúc là thao tác zoom tự nhiên (2 ngón kéo + phóng cùng lúc).
  const composedGesture = Gesture.Simultaneous(pinchGesture, Gesture.Exclusive(doubleTapGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible || !uri) {
    return null;
  }

  return (
    // Dùng View THUẦN của react-native, KHÔNG dùng `Box` (@/components/ui/box) — Box luôn tự gắn
    // className qua NativeWind's `boxStyle()`/`tva()` dù không truyền `className` nào ở call site (xem
    // components/ui/box/styles.tsx), và react-native-css/cssInterop can thiệp vào cách `style` được áp
    // dụng cho MỌI View đã "cssInterop"-hoá — khiến `position: 'absolute'` + width/height tường minh ở
    // đây bị vô hiệu, Box render lẫn trong luồng cuộn bình thường của trang (kẹt trong chiều cao
    // ScrollView ngang chứa ảnh thumbnail) thay vì overlay toàn màn hình — phát hiện khi chạy thật trên
    // Android Emulator (2026-08-24), ảnh xem lại chỉ hiện 1 dải nhỏ giữa trang thay vì che kín màn hình.
    // View thuần không đi qua NativeWind nên không dính lỗi này (đúng pattern đã dùng cho TextInput ở
    // BatchReviewScreen.tsx cùng nguyên nhân).
    <View
      style={{
        position: 'absolute',
        // Bù insets.top — root layout bọc mọi route bằng SafeAreaView edges={['top']} (_layout.tsx),
        // nên "top: 0" ở đây thực ra là "ngay dưới status bar" của parent, không phải đỉnh màn hình
        // thật. Kéo lên -insets.top rồi cộng lại vào height để đáy vẫn giữ nguyên vị trí cũ — cùng kỹ
        // thuật đã dùng cho header Login (phát hiện khi test thật trên iPhone, 2026-08-23).
        top: -insets.top,
        left: 0,
        width,
        height: height + insets.top,
        backgroundColor: 'rgba(0,0,0,0.92)',
        zIndex: 999,
        elevation: 999,
      }}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
        </Animated.View>
      </GestureDetector>
      {/* Pressable GỐC của react-native, KHÔNG dùng bản của react-native-gesture-handler — nút này đè
          lên đúng vùng mà GestureDetector (pinch/pan/double-tap) đang phủ toàn màn hình phía dưới; 2
          Pressable/gesture cùng thuộc RNGH tranh chấp touch ở native level (RNGH "cướp" trước), khiến
          bấm ✕ không có phản ứng dù logic onClose đúng (Back cứng Android vẫn tắt được bình thường —
          xác nhận qua BackHandler, không phải lỗi state) — phát hiện khi chạy thật trên Android Emulator
          (2026-08-24). Pressable core RN đi qua responder chain khác, không bị RNGH cướp touch. */}
      <Pressable
        onPress={handleClose}
        hitSlop={12}
        style={{
          position: 'absolute',
          top: insets.top + 12,
          right: 16,
          padding: 8,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <AppText className="text-white" size="lg">
          ✕
        </AppText>
      </Pressable>
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, alignSelf: 'center' }}>
        <AppText size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Chạm 2 lần hoặc chụm ngón tay để phóng to
        </AppText>
      </View>
    </View>
  );
}
