import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Biểu tượng thương hiệu — dựa theo mockup Claude Design (`Nông trường cao su - Mobile.dc.html`,
 * artboard "01 · Splash"/"02 · Đăng nhập"): 1 nét lá cao su cách điệu + giọt mủ. Dùng chung cho màn
 * Loading (app/index.tsx) và Đăng nhập — tránh lặp SVG path ở 2 nơi.
 */
export function BrandMark({ size = 56, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M14 10 H32 A22 22 0 0 1 32 54 H14 Z" fill={color} />
      <Path d="M17 45 Q31 39 47 21" stroke="#1F5A45" strokeWidth={5} strokeLinecap="round" />
      <Circle cx={8} cy={52} r={4.5} fill={color} />
    </Svg>
  );
}
