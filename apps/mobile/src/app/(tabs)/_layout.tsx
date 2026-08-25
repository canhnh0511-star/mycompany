import { Tabs, usePathname, useRouter } from 'expo-router';
import { useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Pressable } from '@/components/ui/pressable';
import { AppText } from '@/components/AppText';
import { useSettingsStore } from '@/features/settings/store';

/**
 * Thanh tab dưới — "Vòm cong" (option 3b, Turn 3 "Thanh điều hướng dưới — 3 hướng cải tiến",
 * `Nông trường cao su - Mobile.dc.html`, đọc qua `claude_design` MCP 2026-08-25). User chọn 3b sau khi
 * xem cả 3 hướng (3a "Thanh nổi", 3b "Vòm cong", 3c "Pill trượt") — cũng là hướng designer tự đề xuất
 * ("giữ được cảm giác bo cong và nút giữa nổi như app ngân hàng, nhưng mọi tab vẫn có nhãn chữ — quan
 * trọng khi người dùng chính là quản lý làm việc ngoài nắng"). Khớp đúng `images/footer_design.png`.
 *
 * SỬA LẠI 2026-08-25 (2): bản đầu (2 khối `Box` phẳng xếp chồng — thanh chính bo góc trên + 1 khối
 * "vòm" bo tròn top riêng đặt đè lên) tạo cảm giác 2 lớp xếp tầng chứ KHÔNG PHẢI 1 đường cong liền mạch
 * — nhìn giống FAB đặt trên kệ hơn là được "ôm" vào thanh, đúng góp ý user sau khi lên app thật. Đổi
 * sang vẽ TOÀN BỘ hình dạng thanh (viền ngoài + notch lõm ở giữa) bằng 1 path SVG DUY NHẤT
 * (`react-native-svg`, ĐÃ có sẵn dependency — không thêm gì mới) — 2 đường cong Bezier bậc 3 đối xứng
 * tại notch, tiếp tuyến ngang ở 2 đầu nên nối mượt vào đoạn thẳng, không góc gãy. Nút Chụp giảm độ nổi
 * từ ~36px xuống 12px (nằm gọn trong notch, chỉ nhô nhẹ) — xem hằng số `BUTTON_PROTRUSION` bên dưới.
 *
 * Tên tab thứ 3 GIỮ "Sản lượng" (không revert về "Tra cứu" như chữ trong mockup Turn 3) — xác nhận với
 * user 2026-08-25: mockup Turn 3 có vẻ chưa cập nhật tab bar theo tên mới dù ghi chú cuối turn đã dùng
 * đúng "Sản lượng"; tên "Sản lượng" là quyết định có chủ đích ở Phase 5 (dashboard Official Production
 * thay hẳn LookupScreen cũ), không phải lỗi cần sửa lại.
 *
 * Icon — port thẳng path SVG từ chính mockup qua `react-native-svg`, KHÔNG dùng thư viện icon ngoài.
 *
 * Thanh tự vẽ (`tabBar` prop, KHÔNG dùng default renderer) — cần chèn nút "Chụp" to hơn, không phải
 * 1 tab/route thật, chỉ điều hướng `router.push('/(tabs)/capture')`. Điều hướng bằng `router.push(path)`
 * (không dùng `navigation.navigate(name)` — đã từng lỗi "action NAVIGATE ... was not handled" với route
 * trong thư mục con). Trạng thái "đang chọn" đọc từ `usePathname()`. `capture`/`quick-entry` vẫn là
 * route thật — chỉ ẩn khỏi tabBar mặc định, không xóa. Business flow/navigation logic/route KHÔNG đổi —
 * lần sửa này chỉ đổi presentation/layout của thanh tab.
 */

// Màu icon lấy ĐÚNG hex từ mockup (không map qua token gần đúng) — giữ độ chính xác pixel, cùng nguyên
// tắc đã áp dụng cho BrandMark/login.tsx (vd "#1F5A45 của chính artboard này thay vì hex lấy lệch").
const ICON_ACTIVE = '#1F5A45'; // = --primary (global.css)
const ICON_INACTIVE = '#7A8681';

// Màu nền/viền thanh tab đọc theo theme thật (features/settings/store.ts) — SVG fill cần giá trị màu cụ
// thể, không nhận className/token Tailwind như Box, nên lấy trực tiếp từ global.css (:root/--dark).
const BAR_FILL = { light: 'rgb(255,255,255)', dark: 'rgb(10,10,10)' };
const BAR_BORDER = { light: 'rgb(229,229,229)', dark: 'rgb(46,46,46)' };

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
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
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
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Icon color={color} active={active} />
      <AppText size="xs" className={active ? 'font-semibold' : 'font-medium'} style={{ color }}>
        {label}
      </AppText>
      {/* Gạch chỉ dưới nhãn khi active — KHÔNG dùng khối nền/rounded rect lớn phía sau tab (giữ tối
          giản theo yêu cầu). Luôn render (kể cả lúc ẩn) để nhãn không nhảy vị trí khi đổi active. */}
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: active ? ICON_ACTIVE : 'transparent' }} />
    </Pressable>
  );
}

// ---- Thông số hình học thanh tab (đơn vị dp, RN) ----
// Chiều cao phần thanh trắng thấy được — trong khoảng 72–80px yêu cầu.
const BAR_HEIGHT = 76;
// Bán kính bo góc trên của thanh.
const BAR_CORNER_RADIUS = 24;
// Nút Chụp — đường kính trong khoảng 56–62px yêu cầu.
const BUTTON_SIZE = 60;
const BUTTON_RADIUS = BUTTON_SIZE / 2;
// Độ nổi của nút phía TRÊN mép thanh — trong khoảng 10–16px yêu cầu (trước đây ~36px, đúng góp ý cần sửa).
const BUTTON_PROTRUSION = 12;
// Khoảng hở giữa mép nút và mép notch — trong khoảng 6–10px yêu cầu.
const NOTCH_GAP = 8;
const NOTCH_WIDTH = BUTTON_SIZE + NOTCH_GAP * 2;
// Độ sâu notch (đo từ mép trên thanh xuống) — đủ để "ôm" quá nửa dưới nút, không phải hình chữ V.
const NOTCH_DEPTH = 34;
// Bề ngang đoạn cong chuyển tiếp giữa đoạn thẳng và notch — càng lớn càng mượt, càng nhỏ càng "gãy".
const NOTCH_CURVE_IN = 22;

// Khoảng cách nút → nhãn "Chụp phiếu" — trong khoảng 4–6px yêu cầu.
const LABEL_GAP = 6;
const LABEL_HEIGHT = 14;

// Tổng chiều cao vùng chiếm chỗ thật (để react-navigation tự đo qua onLayout và chừa đúng khoảng cho
// content bên trên — bản trước đây nút CÓ THỂ tràn ra ngoài `BAR_HEIGHT` khai báo, sửa luôn ở đây).
const TOTAL_HEIGHT = BAR_HEIGHT + BUTTON_PROTRUSION;

/**
 * 1 path SVG duy nhất cho toàn bộ viền thanh tab — bo góc trên 2 bên + notch lõm mềm ở giữa (2 đường
 * cong Bezier bậc 3 đối xứng, tiếp tuyến NGANG ở cả 4 điểm nối nên liền mạch vào đoạn thẳng/đáy notch,
 * không có góc gãy — đúng yêu cầu "concave notch/cradle" mềm mại thay vì hình chữ V).
 */
function buildTabBarPath(width: number): string {
  const cx = width / 2;
  const notchLeft = cx - NOTCH_WIDTH / 2;
  const notchRight = cx + NOTCH_WIDTH / 2;
  const curveInStart = notchLeft - NOTCH_CURVE_IN;
  const curveInEnd = notchRight + NOTCH_CURVE_IN;
  const r = BAR_CORNER_RADIUS;
  return [
    `M0,${r}`,
    `Q0,0 ${r},0`,
    `L${curveInStart},0`,
    `C${notchLeft},0 ${notchLeft},${NOTCH_DEPTH} ${cx},${NOTCH_DEPTH}`,
    `C${notchRight},${NOTCH_DEPTH} ${notchRight},0 ${curveInEnd},0`,
    `L${width - r},0`,
    `Q${width},0 ${width},${r}`,
    `L${width},${BAR_HEIGHT}`,
    `L0,${BAR_HEIGHT}`,
    'Z',
  ].join(' ');
}

function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const themeSetting = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark = themeSetting === 'dark' || (themeSetting === 'system' && systemScheme === 'dark');
  const barFill = isDark ? BAR_FILL.dark : BAR_FILL.light;
  const barBorder = isDark ? BAR_BORDER.dark : BAR_BORDER.light;

  const isHome = pathname === '/';
  const isPhieu = pathname.startsWith('/phieu');
  const isLookup = pathname.startsWith('/lookup');
  const isProfile = pathname.startsWith('/profile');

  // Nút nằm giữa notch: đáy nút cách đáy thanh (BUTTON_SIZE - protrusion đo từ đỉnh thanh) — tính ra
  // "bottom" tuyệt đối trong hệ toạ độ TOTAL_HEIGHT (đỉnh thanh = BAR_HEIGHT, đỉnh nút phải chạm đúng
  // TOTAL_HEIGHT = BAR_HEIGHT + BUTTON_PROTRUSION, không tràn ra ngoài vùng đã chừa chỗ).
  const buttonBottom = TOTAL_HEIGHT - BUTTON_SIZE;

  return (
    <View style={{ height: TOTAL_HEIGHT + insets.bottom }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom, height: TOTAL_HEIGHT }}>
        {/* Shadow rất nhẹ — chỉ đủ tách thanh khỏi content phía trên, không dùng shadow mạnh. Bọc View
            riêng cho shadow vì Svg (bo theo path, không phải hình chữ nhật) không tự có shadow đẹp. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: BAR_HEIGHT,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Svg width={width} height={BAR_HEIGHT}>
            <Path d={buildTabBarPath(width)} fill={barFill} stroke={barBorder} strokeWidth={1} />
          </Svg>
        </View>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 10, height: 44, flexDirection: 'row', paddingHorizontal: 6 }}>
          <TabBarItem Icon={HomeIcon} label="Hôm nay" active={isHome} onPress={() => router.push('/(tabs)')} />
          <TabBarItem Icon={DocumentIcon} label="Phiếu" active={isPhieu} onPress={() => router.push('/(tabs)/phieu')} />
          <View style={{ width: NOTCH_WIDTH }} />
          <TabBarItem Icon={SearchIcon} label="Sản lượng" active={isLookup} onPress={() => router.push('/(tabs)/lookup')} />
          <TabBarItem Icon={PersonIcon} label="Hồ sơ" active={isProfile} onPress={() => router.push('/(tabs)/profile')} />
        </View>

        {/* Nút "Chụp phiếu" — nằm trong notch, chỉ nhô nhẹ BUTTON_PROTRUSION phía trên mép thanh (KHÔNG
            phải tab/route thật, xem javadoc đầu file). Viền mảnh cùng màu nền thanh tạo cảm giác "cắt
            gọn" vào notch; shadow nhẹ, không glow/gradient. */}
        <Pressable
          onPress={() => router.push('/(tabs)/capture')}
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -BUTTON_RADIUS,
            bottom: buttonBottom,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: BUTTON_RADIUS,
            backgroundColor: ICON_ACTIVE,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: barFill,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <CameraIcon />
        </Pressable>
        <AppText
          size="xs"
          className="font-semibold"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: buttonBottom - LABEL_GAP - LABEL_HEIGHT,
            textAlign: 'center',
            color: ICON_ACTIVE,
          }}
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
