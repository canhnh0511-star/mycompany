/**
 * Design tokens — bảng màu.
 *
 * Không hard-code màu rải rác trong component (spec §30) — mọi component phải
 * đọc màu qua theme (`theme.palette...`) hoặc `tones` bên dưới cho các case
 * MUI palette mặc định không cover (icon tone của KPI card, tint nền badge...).
 */

export const green = {
  50: '#EAF5EE',
  100: '#D3EADB',
  600: '#1E7A4D',
  700: '#166B42',
  800: '#0F5C3B',
  900: '#0B3B2A',
  950: '#082A1E',
} as const;

export const neutral = {
  0: '#FFFFFF',
  50: '#F5F7F5',
  100: '#EEF1EE',
  200: '#E4E7E4',
  400: '#9CA3AF',
  500: '#6B7280',
  700: '#374151',
  900: '#111827',
} as const;

/**
 * amber/blue 600 — đối chiếu pixel trực tiếp trên ảnh reference (badge icon
 * KPI "Đã bán"/"Nhân công"): reference dùng vàng nghệ/xanh dương khá tươi
 * (~#F5A928, ~#4F8EDB), không phải tông trầm/xỉn như giá trị cũ — giá trị cũ
 * gây cảm giác u ám khi lặp lại ở badge/icon cảnh báo.
 */
export const amber = {
  50: '#FEF3D9',
  600: '#F5A928',
  700: '#B45309',
} as const;

export const red = {
  50: '#FDECEC',
  600: '#C0392B',
  700: '#A5322A',
} as const;

export const blue = {
  50: '#E9F1FC',
  600: '#4F8EDB',
  700: '#2A5C9E',
} as const;

export const purple = {
  50: '#F1EEFE',
  600: '#7C5CFC',
  700: '#6743E8',
} as const;

/**
 * Tone cho icon badge của KpiCard — đối chiếu pixel trên ảnh reference: nền
 * là màu ĐẶC (không phải tint nhạt), icon màu trắng. `bg` ở đây vì vậy là màu
 * nền đặc, `main` là màu icon (trắng) — giữ tên field cũ để không phải sửa
 * lại chỗ dùng, chỉ đổi Ý NGHĨA màu cho đúng reference.
 */
export const tones = {
  green: { bg: green[600], main: '#FFFFFF' },
  blue: { bg: blue[600], main: '#FFFFFF' },
  amber: { bg: amber[600], main: '#FFFFFF' },
  purple: { bg: purple[600], main: '#FFFFFF' },
} as const;

export type Tone = keyof typeof tones;

/**
 * 3 token màu TEXT chuẩn hóa toàn app (typography fix — đối chiếu
 * `typography-fix-mockup.html`) — thay cho các sắc xám lẻ tẻ (neutral[900]/
 * [500]/[400]) trước đây bị dùng lẫn lộn không nhất quán.
 */
export const text = {
  primary: '#14181C',
  secondary: '#565F68',
  muted: '#8A929B',
} as const;

/** Nền trang tổng thể — không phải pure white (spec §14). */
export const pageBackground = '#F7F9F8';

/**
 * Token màu riêng cho sidebar (spec §5) — không hard-code green[xxx] rải rác
 * trong Sidebar.tsx, đọc qua đây để đổi tone 1 chỗ khi cần.
 *
 * `background`: đo trung bình nhiều vùng trống sạch (không dính chữ/icon)
 * trên ảnh reference ra ~#164C31 — rõ ràng SÁNG hơn `green[900]` (#0B3B2A)
 * cũ đang dùng. green[900] quá tối so với reference, là 1 phần nguyên nhân
 * "màu sắc hơi tối" vì đây là mảng màu lớn nhất trên trang.
 */
export const sidebar = {
  background: '#164C31',
  activeBackground: green[50],
  activeText: green[800],
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
} as const;
