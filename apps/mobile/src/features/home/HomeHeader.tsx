import { Image, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { CameraIcon } from './HomeIcons';

const HEADER_HEIGHT = 176;
const GRADIENT_TOP_RIGHT = '#EDF6EF';
const GRADIENT_LEFT = '#F5FAF6';
const GRADIENT_BOTTOM = '#FFFFFF';
const CTA_GREEN = '#1F5A45';
// Ảnh chiếm 35-45% bề ngang header (yêu cầu §4) — 40% ở giữa khoảng đó.
const IMAGE_WIDTH_RATIO = 0.4;

/**
 * Header Home — SỬA LẦN 2 (2026-08-25, sau góp ý "background quá abstract, không nhận ra cây cao
 * su/chén mủ"): thay hẳn minh họa SVG line-art bằng ẢNH THẬT crop từ chính artboard reference
 * (`images/home_screen.jjpg.jpg` — ảnh mockup do user cung cấp, ĐÃ có sẵn cảnh cạo mủ+chén hứng thật
 * trong header của nó) → lưu `assets/images/rubber-header.png` (yêu cầu §28-29: không base64/URL ngoài,
 * đặt trong assets/images/). Không tự tải ảnh rời từ internet — đây là asset trích xuất từ chính tài
 * liệu thiết kế user đưa, được yêu cầu tường minh dùng làm ảnh thật ("Nếu sử dụng làm asset thật: crop
 * sạch...").
 *
 * Layer order đúng yêu cầu §29: nền gradient (dưới cùng) → ảnh → gradient/fade overlay (đè lên ảnh,
 * fade trắng từ trái + fade trắng ở đáy) → text/CTA (trên cùng).
 *
 * KHÔNG còn bọc trong `View` bo góc lớn + `overflow:hidden` như bản trước (tạo cảm giác "floating
 * card" — đúng góp ý §5 "header phải hòa vào body, không được trông như 1 card riêng"). Bỏ hẳn
 * borderRadius ở container ngoài; ScrollView cha vẫn giữ `p-4` (không full-bleed sát mép — xem lý do ở
 * bản trước, chưa đổi lần này vì không nằm trong 5 phần được yêu cầu sửa).
 */
export function HomeHeader({ dateLabel, onCapture }: { dateLabel: string; onCapture: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - 32;
  const imageWidth = contentWidth * IMAGE_WIDTH_RATIO;
  // Vị trí điểm nối gradient↔ảnh, tính theo tỉ lệ trên contentWidth — dùng làm tâm cho dải fade "bắc
  // cầu" ở layer 3a bên dưới.
  const seamFraction = 1 - IMAGE_WIDTH_RATIO;

  return (
    <View style={{ height: HEADER_HEIGHT, overflow: 'hidden' }}>
      {/* 1. Nền gradient — góc trên-phải/trái xanh rất nhạt, đáy trắng (đúng 3 điểm dừng §5). */}
      <Svg width={contentWidth} height={HEADER_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="homeHeaderBase" x1="0" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={GRADIENT_LEFT} stopOpacity={1} />
            <Stop offset="0.55" stopColor={GRADIENT_TOP_RIGHT} stopOpacity={1} />
            <Stop offset="1" stopColor={GRADIENT_BOTTOM} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={contentWidth} height={HEADER_HEIGHT} fill="url(#homeHeaderBase)" />
      </Svg>

      {/* 2. Ảnh thật — bên phải, 40% bề ngang, cover hết chiều cao header. */}
      <Image
        source={require('../../../assets/images/rubber-header.png')}
        resizeMode="cover"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: imageWidth,
          height: HEADER_HEIGHT,
          opacity: 0.85,
        }}
      />

      {/* 3a. Fade "bắc cầu" qua đúng đường nối gradient↔ảnh — BUG tìm thấy khi test trên emulator: fade
          cũ chỉ phủ trong phạm vi ảnh (bắt đầu ngay tại mép ảnh), khiến điểm nối giữa màu gradient (nền)
          và trắng-gần-đặc (đầu overlay) tạo 1 đường biên cứng nhìn thấy rõ — không phải "chưa đủ mờ" mà
          là 2 vùng màu khác nhau chạm thẳng nhau. Sửa: overlay này rộng bằng CẢ header (contentWidth,
          không phải imageWidth), dải mờ đặt LỆCH TÂM đúng ngay điểm nối (imageStartFraction) — trong
          suốt trước điểm nối (không đụng gradient), phồng lên trắng đục NGAY TẠI điểm nối (che seam),
          rồi tan dần vào giữa ảnh — liền mạch cả 2 phía thay vì 2 mảng tự fade riêng rẽ không khớp nhau. */}
      <Svg width={contentWidth} height={HEADER_HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="homeHeaderSeamBridge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset={Math.max(seamFraction - 0.25, 0)} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={seamFraction + 0.03} stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset={Math.min(seamFraction + 0.4, 1)} stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={contentWidth} height={HEADER_HEIGHT} fill="url(#homeHeaderSeamBridge)" />
      </Svg>

      {/* 3b. Fade trắng dọc ở đáy ảnh — hòa xuống "Tình hình hôm nay" bên dưới. */}
      <Svg
        width={imageWidth}
        height={HEADER_HEIGHT}
        style={{ position: 'absolute', right: 0, top: 0 }}
      >
        <Defs>
          <LinearGradient id="homeHeaderImageBottomFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={imageWidth} height={HEADER_HEIGHT} fill="url(#homeHeaderImageBottomFade)" />
      </Svg>

      {/* 4. Text/CTA — trên cùng. */}
      <VStack space="md" style={{ padding: 16 }}>
        <VStack space="xs">
          <AppHeading size="2xl">Hôm nay</AppHeading>
          <AppText className="text-muted-foreground">{dateLabel}</AppText>
        </VStack>

        {/* CTA — dựng thủ công bằng Pressable (AppButtonProps.children chỉ nhận string, không ghép được
            icon+chữ) — height 52/radius 11 trong khoảng §7 yêu cầu (50-54px/10-12px), không shadow mạnh. */}
        <Pressable
          onPress={onCapture}
          style={{
            height: 52,
            borderRadius: 11,
            backgroundColor: CTA_GREEN,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <CameraIcon size={19} />
          <AppText className="font-semibold text-white">Ghi nhận hôm nay</AppText>
        </Pressable>
      </VStack>
    </View>
  );
}
