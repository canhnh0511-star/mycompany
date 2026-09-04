/**
 * Logo mark tạm thời cho sidebar (spec §2 — "Logo / Branding"): dự án chưa có
 * asset thương hiệu chính thức. Không có công cụ generate ảnh trong phiên
 * làm việc này, nên vẽ tay 1 SVG local — không dùng icon generic (MUI
 * park/tree) hay logo tải từ internet.
 *
 * Hình: lá cao su thật ngoài đời là lá KÉP 3 LÁ CHÉT (trifoliate) — đặc điểm
 * nhận diện của cây Hevea brasiliensis, không phải tán lá tròn chung chung —
 * nên vẽ 3 lá chét toả từ 1 điểm, phía dưới là thân cây + đường cạo hình chữ
 * V + giọt mủ. Nét trắng (white stroke), nền trong suốt.
 *
 * Khi dự án có logo chính thức (thiết kế tay hoặc thuê ngoài), thay thế
 * component này bằng asset thật.
 */
export function RubberTreeLogo({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) {
  const leaf = 'M12 3.2c1.7 1.9 1.7 5 0 6.8-1.7-1.8-1.7-4.9 0-6.8z';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* 3 lá chét (trifoliate) toả từ 1 điểm — đặc trưng lá cây cao su */}
      <g stroke={color} strokeWidth="1.4" strokeLinejoin="round">
        <path d={leaf} transform="rotate(-38 12 10)" />
        <path d={leaf} />
        <path d={leaf} transform="rotate(38 12 10)" />
      </g>
      {/* Thân cây */}
      <path d="M12 10V19.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Đường cạo mủ hình chữ V trên thân */}
      <path d="M10.3 14.6 12 15.9l1.7-1.3" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Giọt mủ */}
      <circle cx="12" cy="18.3" r="0.9" fill={color} />
    </svg>
  );
}
