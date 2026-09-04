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

export const amber = {
  50: '#FFF6E5',
  600: '#B7791F',
  700: '#92600F',
} as const;

export const red = {
  50: '#FDECEC',
  600: '#C0392B',
  700: '#A5322A',
} as const;

export const blue = {
  50: '#E9F1FC',
  600: '#2563AC',
  700: '#1D4E88',
} as const;

export const purple = {
  50: '#F1EEFE',
  600: '#7C5CFC',
  700: '#6743E8',
} as const;

/** Tone dùng cho KpiCard icon / các chấm màu không thuộc MUI semantic palette. */
export const tones = {
  green: { main: green[600], bg: green[50] },
  blue: { main: blue[600], bg: blue[50] },
  amber: { main: amber[600], bg: amber[50] },
  purple: { main: purple[600], bg: purple[50] },
} as const;

export type Tone = keyof typeof tones;
