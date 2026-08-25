import { useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { CameraIcon } from './HomeIcons';

const HEADER_HEIGHT = 176;
// Hex --primary (global.css, rgb "31 90 69") pha loãng cho gradient nền — KHÔNG dùng token trực tiếp vì
// SVG cần giá trị màu cụ thể (không nhận className/CSS var), cùng cách đã làm ở tab bar (_layout.tsx).
const GRADIENT_FROM = '#E7F1EB';
const GRADIENT_TO = '#FFFFFF';
const ILLUSTRATION_COLOR = '#1F5A45';

/**
 * Minh họa "thân cây cao su đang cạo mủ + chén hứng mủ" — line-art đơn giản vẽ tay bằng
 * `react-native-svg` (KHÔNG dùng ảnh chụp thật — repo không có asset ảnh nông trường, không tự tải ảnh
 * ngoài internet vào sản phẩm vì không rõ nguồn gốc/bản quyền, đã xác nhận hướng này với user 2026-08-25
 * thay cho `ImageBackground` theo đúng yêu cầu gốc). Opacity thấp, đặt lệch phải, không đè lên vùng chữ.
 */
function RubberTreeIllustration({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 176" style={{ position: 'absolute', right: 0, top: 0 }}>
      {/* Thân cây nghiêng nhẹ + 2 vết cạo hình xương cá */}
      <Path
        d="M118 0 L100 176"
        stroke={ILLUSTRATION_COLOR}
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.12}
      />
      <Path
        d="M96 60 Q108 66 118 60 M92 84 Q106 92 120 84"
        stroke={ILLUSTRATION_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.22}
      />
      {/* Rãnh cạo dẫn xuống chén */}
      <Path d="M112 90 Q108 108 104 118" stroke={ILLUSTRATION_COLOR} strokeWidth={2} fill="none" opacity={0.22} />
      {/* Giọt mủ */}
      <Path
        d="M103 118 c-3 4 -3 8 0 11 c3 -3 3 -7 0 -11z"
        fill={ILLUSTRATION_COLOR}
        opacity={0.28}
      />
      {/* Chén hứng mủ */}
      <Path
        d="M84 132 h38 l-4 22 a6 6 0 0 1 -6 5 H94 a6 6 0 0 1 -6 -5 z"
        stroke={ILLUSTRATION_COLOR}
        strokeWidth={2.2}
        fill="none"
        opacity={0.26}
      />
      <Path d="M88 132 q15 8 30 0" stroke={ILLUSTRATION_COLOR} strokeWidth={2} fill="none" opacity={0.26} />
      {/* Vài chiếc lá phía trên gợi hàng cây */}
      <Path
        d="M40 20 q10 -14 24 -6 q-4 16 -20 16 q-8 -2 -4 -10z M20 40 q10 -12 22 -6 q-2 15 -18 14 q-8 -1 -4 -8z"
        fill={ILLUSTRATION_COLOR}
        opacity={0.1}
      />
    </Svg>
  );
}

/**
 * Header Home — nền gradient xanh lá rất nhạt → trắng + minh họa cây cao su/chén mủ mờ phía phải, tiêu
 * đề "Hôm nay"/ngày, CTA chính "Ghi nhận hôm nay". Đặt TRONG cùng padding 16px của ScrollView (không
 * full-bleed sát mép màn hình như ảnh tham chiếu) — giữ nguyên cấu trúc `p-4` hiện có của HomeScreen
 * thay vì tái cấu trúc lại toàn bộ padding model chỉ để làm 1 banner tràn viền, đúng ưu tiên "giữ gần
 * layout/hierarchy hiện có" hơn khớp pixel-perfect ảnh tham chiếu.
 *
 * CTA dựng thủ công bằng Pressable (không dùng `AppButton`) vì `AppButtonProps.children` chỉ nhận
 * `string` (không ghép được icon+chữ) — không mở rộng `AppButton` dùng chung cho 1 chỗ dùng duy nhất,
 * cùng lý do `login.tsx` từng dựng riêng field mật khẩu thay vì sửa `AppInput`. Vẫn giữ visual solid
 * primary/rounded/min-height khớp `AppButton size="lg"` để đồng bộ style nút CTA toàn app.
 */
export function HomeHeader({ dateLabel, onCapture }: { dateLabel: string; onCapture: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  // ScrollView cha có p-4 (16px mỗi bên) — trừ ra để minh họa/gradient khớp đúng bề ngang card thật.
  const contentWidth = windowWidth - 32;

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden' }}>
      <Svg width={contentWidth} height={HEADER_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="homeHeaderGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GRADIENT_FROM} stopOpacity={1} />
            <Stop offset="0.85" stopColor={GRADIENT_TO} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={contentWidth} height={HEADER_HEIGHT} fill="url(#homeHeaderGradient)" />
      </Svg>
      <RubberTreeIllustration width={160} height={HEADER_HEIGHT} />

      <VStack space="md" style={{ padding: 16 }}>
        <VStack space="xs">
          <AppHeading size="2xl">Hôm nay</AppHeading>
          <AppText className="text-muted-foreground">{dateLabel}</AppText>
        </VStack>

        <Pressable
          onPress={onCapture}
          style={{
            minHeight: 54,
            borderRadius: 10,
            backgroundColor: '#1F5A45',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <CameraIcon />
          <AppText className="font-semibold text-white">Ghi nhận hôm nay</AppText>
        </Pressable>
      </VStack>
    </View>
  );
}
