import { Tabs, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { AppText } from '@/components/AppText';

/**
 * Thanh tab dưới — "Vòm cong" (option 3b, Turn 3 "Thanh điều hướng dưới — 3 hướng cải tiến",
 * `Nông trường cao su - Mobile.dc.html`, đọc qua `claude_design` MCP 2026-08-25). User chọn 3b sau khi
 * xem cả 3 hướng (3a "Thanh nổi", 3b "Vòm cong", 3c "Pill trượt") — cũng là hướng designer tự đề xuất
 * ("giữ được cảm giác bo cong và nút giữa nổi như app ngân hàng, nhưng mọi tab vẫn có nhãn chữ — quan
 * trọng khi người dùng chính là quản lý làm việc ngoài nắng"). Khớp đúng `images/footer_design.png` user
 * đã cung cấp trước đó.
 *
 * Tên tab thứ 3 GIỮ "Sản lượng" (không revert về "Tra cứu" như chữ trong mockup Turn 3) — xác nhận với
 * user 2026-08-25: mockup Turn 3 có vẻ chưa cập nhật tab bar theo tên mới dù ghi chú cuối turn đã dùng
 * đúng "Sản lượng"; tên "Sản lượng" là quyết định có chủ đích ở Phase 5 (dashboard Official Production
 * thay hẳn LookupScreen cũ), không phải lỗi cần sửa lại.
 *
 * Icon — port thẳng path SVG từ chính mockup (KHÔNG dùng thư viện icon ngoài, design đã cho sẵn path
 * stroke-based đơn giản) qua `react-native-svg` (đã có sẵn dependency, cùng cách BrandMark.tsx dùng).
 * Thay thế hẳn khối vuông placeholder trước đây (comment cũ trong file này ghi rõ đó là placeholder tạm
 * vì mockup gốc trước đó KHÔNG có icon thật — Turn 3 mới là turn có icon thật).
 *
 * Thanh tự vẽ (`tabBar` prop, KHÔNG dùng default renderer) — lý do kỹ thuật giữ nguyên như bản cũ: cần
 * chèn nút "Chụp" to hơn, không phải 1 tab/route thật, chỉ điều hướng `router.push('/(tabs)/capture')`.
 * Điều hướng bằng `router.push(path)` (không dùng `navigation.navigate(name)` — đã từng lỗi "action
 * NAVIGATE ... was not handled" với route trong thư mục con, xem lịch sử file này). Trạng thái "đang
 * chọn" đọc từ `usePathname()`.
 *
 * `capture`/`quick-entry` vẫn là route thật — chỉ ẩn khỏi tabBar mặc định, không xóa.
 */

// Màu icon lấy ĐÚNG hex từ mockup (không map qua token gần đúng) — giữ độ chính xác pixel, cùng nguyên
// tắc đã áp dụng cho BrandMark/login.tsx (vd "#1F5A45 của chính artboard này thay vì hex lấy lệch").
const ICON_ACTIVE = '#1F5A45'; // = --primary (global.css)
const ICON_INACTIVE = '#7A8681';

type IconProps = { color: string; active: boolean };

function HomeIcon({ color, active }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 11l8-6.5 8 6.5" />
      <Path d="M6.5 10v9h11v-9" />
    </Svg>
  );
}

function DocumentIcon({ color }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 4h7L18 8.5V20H6.5z" />
      <Path d="M13.5 4v4.5H18" />
      <Path d="M9.5 13h5" />
      <Path d="M9.5 16.5h5" />
    </Svg>
  );
}

function SearchIcon({ color }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M16 16l4 4" />
    </Svg>
  );
}

function PersonIcon({ color }: IconProps) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.5 8.5h3l1.5-2h6l1.5 2h3v10h-15z" />
      <Circle cx={12} cy={13} r={3} />
    </Svg>
  );
}

function TabBarItem({
  Icon,
  label,
  active,
  onPress,
}: {
  Icon: (props: IconProps) => React.JSX.Element;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? ICON_ACTIVE : ICON_INACTIVE;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      <Icon color={color} active={active} />
      <AppText size="xs" className={active ? 'font-semibold' : 'font-medium'} style={{ color }}>
        {label}
      </AppText>
      {/* Gạch chỉ dưới nhãn khi active — reserve chỗ kể cả lúc ẩn để nhãn không nhảy vị trí */}
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: active ? ICON_ACTIVE : 'transparent' }} />
    </Pressable>
  );
}

// Kích thước lấy nguyên từ mockup (390px-width artboard, RN dp ánh xạ 1:1 — cùng cách các màn khác
// trong app đã copy trực tiếp px từ Claude Design, vd login.tsx `style={{ height: 52, borderRadius: 10 }}`).
const BAR_HEIGHT = 104;
const ARCH_WIDTH = 92;

function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isPhieu = pathname.startsWith('/phieu');
  const isLookup = pathname.startsWith('/lookup');
  const isProfile = pathname.startsWith('/profile');

  return (
    <View style={{ height: BAR_HEIGHT + insets.bottom }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom, height: BAR_HEIGHT }}>
        {/* Thanh bo cong dính đáy */}
        <Box
          className="bg-background border-t border-border"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 82, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        />
        {/* Vòm cong nhỏ đỡ nút "Chụp" — đứng SAU thanh chính trong DOM nên vẽ đè lên, tạo cảm giác
            "khoét" mà không cần SVG cắt hình thật (đúng cách mockup dựng, xem Turn 3 option 3b). */}
        <Box
          className="bg-background border-t border-border"
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -ARCH_WIDTH / 2,
            bottom: 46,
            width: ARCH_WIDTH,
            height: 46,
            borderTopLeftRadius: ARCH_WIDTH / 2,
            borderTopRightRadius: ARCH_WIDTH / 2,
          }}
        />

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, height: 52, flexDirection: 'row', paddingHorizontal: 6 }}>
          <TabBarItem Icon={HomeIcon} label="Hôm nay" active={isHome} onPress={() => router.push('/(tabs)')} />
          <TabBarItem Icon={DocumentIcon} label="Phiếu" active={isPhieu} onPress={() => router.push('/(tabs)/phieu')} />
          <View style={{ width: ARCH_WIDTH }} />
          <TabBarItem Icon={SearchIcon} label="Sản lượng" active={isLookup} onPress={() => router.push('/(tabs)/lookup')} />
          <TabBarItem Icon={PersonIcon} label="Hồ sơ" active={isProfile} onPress={() => router.push('/(tabs)/profile')} />
        </View>

        {/* Nút "Chụp phiếu" nổi — KHÔNG phải tab/route thật (xem javadoc đầu file) */}
        <Pressable
          onPress={() => router.push('/(tabs)/capture')}
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -30,
            bottom: 58,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: ICON_ACTIVE,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: ICON_ACTIVE,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.34,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <CameraIcon />
        </Pressable>
        <AppText
          size="xs"
          className="font-semibold"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', color: ICON_ACTIVE }}
        >
          Chụp phiếu
        </AppText>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <CustomTabBar />}>
      <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
      <Tabs.Screen name="phieu" options={{ title: 'Phiếu' }} />
      <Tabs.Screen name="lookup" options={{ title: 'Sản lượng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="quick-entry" options={{ href: null }} />
    </Tabs>
  );
}
