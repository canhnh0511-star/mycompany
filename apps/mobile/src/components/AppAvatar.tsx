import { Image } from 'expo-image';
import { Box } from '@/components/ui/box';
import { AppText } from '@/components/AppText';

/** "Lê Văn Hải" → "LH" (chữ đầu từ đầu + chữ đầu từ cuối) — đúng mẫu artboard "10 · Hồ sơ". Không lấy
 * quá 2 ký tự dù tên có nhiều từ đệm ở giữa. */
function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/**
 * Avatar tròn dùng chung cho toàn bộ 8 màn Hồ sơ (docs/plans/0022-profile-8-screens-plan.md) — ảnh thật
 * nếu có `photoUrl` (đã là signed URL từ backend, xem UserController#toResponse), fallback 2 chữ cái đầu
 * tên trên nền `bg-primary` (đúng mockup, KHÔNG dùng ảnh placeholder chung chung).
 */
export function AppAvatar({
  fullName,
  photoUrl,
  size = 80,
}: {
  fullName: string;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <Box
      className="bg-primary items-center justify-center rounded-full"
      style={{ width: size, height: size }}
    >
      <AppText style={{ fontSize: size * 0.36 }} className="font-semibold text-white">
        {initialsOf(fullName)}
      </AppText>
    </Box>
  );
}
