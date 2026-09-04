import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Icon nhỏ dùng riêng cho Home (breakdown loại mủ + 4 card tổng quan) — gom 1 chỗ vì dùng ở 3 file
 * (HomeHeader/ProductionSummaryCard/HomeScreen). Cùng cách vẽ tay bằng `react-native-svg` (đã có sẵn
 * dependency) như icon tab bar (`app/(tabs)/_layout.tsx`) — không thêm icon-library ngoài.
 *
 * Màu MẶC ĐỊNH đồng nhất (`DEFAULT_ICON_COLOR`, xám trung tính) thay vì mỗi loại mủ 1 màu như ảnh tham
 * chiếu — đúng chỉ đạo "icon chỉ là visual support, không dùng icon quá nhiều màu, giữ overall UI
 * restrained" (ưu tiên bản viết tay hơn ảnh khi 2 bên lệch nhau).
 */
export const DEFAULT_ICON_COLOR = '#7A8681';

type IconProps = { color?: string; size?: number };

export function DropletIcon({ color = DEFAULT_ICON_COLOR, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c4 5 6.5 8.3 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 11.3 8 8 12 3z" />
    </Svg>
  );
}

export function CupIcon({ color = DEFAULT_ICON_COLOR, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 10h14l-1.3 8.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5 10z" />
      <Path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" />
    </Svg>
  );
}

export function StripIcon({ color = DEFAULT_ICON_COLOR, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={9} r={4.2} />
      <Circle cx={15} cy={15} r={4.2} />
    </Svg>
  );
}

export function SnowflakeIcon({ color = DEFAULT_ICON_COLOR, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
    </Svg>
  );
}

export function PeopleIcon({ color = DEFAULT_ICON_COLOR, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3} />
      <Path d="M3 19c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" />
      <Path d="M16 8.2a2.6 2.6 0 1 1 0 5.1" />
      <Path d="M15.5 14.6c2.6.3 4.5 1.9 4.5 4.4" />
    </Svg>
  );
}

export function TagIcon({ color = DEFAULT_ICON_COLOR, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11.5 4h6.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-.3.7l-8.2 8.2a1 1 0 0 1-1.4 0l-6.7-6.7a1 1 0 0 1 0-1.4l8.2-8.2a1 1 0 0 1 .9-.1z" />
      <Circle cx={15.2} cy={8.8} r={1.3} />
    </Svg>
  );
}

export function DocumentIcon({ color = DEFAULT_ICON_COLOR, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 4h7L18 8.5V20H6.5z" />
      <Path d="M13.5 4v4.5H18" />
      <Path d="M9.5 13h5" />
      <Path d="M9.5 16.5h5" />
    </Svg>
  );
}

export function ClipboardCheckIcon({ color = DEFAULT_ICON_COLOR, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 4.5h6a1 1 0 0 1 1 1V6H8v-.5a1 1 0 0 1 1-1z" />
      <Path d="M6.5 6H17a1.2 1.2 0 0 1 1.2 1.2V19a1.2 1.2 0 0 1-1.2 1.2H6.5A1.2 1.2 0 0 1 5.3 19V7.2A1.2 1.2 0 0 1 6.5 6z" />
      <Path d="M9 13l2 2 4-4.2" />
    </Svg>
  );
}

export function CameraIcon({ color = '#fff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.5 8.5h3l1.5-2h6l1.5 2h3v10h-15z" />
      <Circle cx={12} cy={13} r={3} />
    </Svg>
  );
}

/** code (`water`/`cup`/`strip`/`coagulated`) → icon component tương ứng. */
export const LATEX_TYPE_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  water: DropletIcon,
  cup: CupIcon,
  strip: StripIcon,
  coagulated: SnowflakeIcon,
};
