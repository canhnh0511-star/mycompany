/**
 * Logo mark tạm thời cho sidebar (spec §2 — "Logo / Branding"): dự án chưa có
 * asset thương hiệu chính thức, nên tạo 1 SVG local tối giản thay vì dùng
 * icon generic (park/tree) hay logo tải từ internet — cây cao su cách điệu +
 * đường cắt + giọt mủ, nét trắng (white stroke), nền trong suốt.
 *
 * Khi dự án có logo chính thức, thay thế component này bằng asset thật.
 */
export function RubberTreeLogo({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Tán lá */}
      <circle cx="12" cy="9" r="6" stroke={color} strokeWidth="1.6" />
      {/* Thân cây */}
      <path d="M12 14.5V20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Đường cạo mủ hình chữ V trên thân */}
      <path d="M10.3 16.4 12 17.6l1.7-1.2" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Giọt mủ */}
      <circle cx="12" cy="19.2" r="0.9" fill={color} />
    </svg>
  );
}
