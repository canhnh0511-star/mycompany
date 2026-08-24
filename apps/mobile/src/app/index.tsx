import { View } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';

/**
 * Màn hình trung chuyển duy nhất — AuthGate (_layout.tsx) điều hướng đi ngay khi hydrate xong. Trên
 * native gần như không thấy (native splash screen còn che tới lúc đó); trên web (không có native
 * splash) đây là thứ hiện ra trong lúc chờ, nên không thể để trống.
 *
 * Giao diện theo mockup Claude Design (artboard "01 · Splash", `Nông trường cao su - Mobile.dc.html`)
 * — nền xanh thương hiệu (`bg-primary`, khớp `--primary` global.css, sửa lại 2026-08-23 cho đúng hex
 * #1F5A45 của chính artboard này thay vì hex lấy lệch trước đó), logo + tên app + tagline giữa màn
 * hình — text NGUYÊN VĂN mockup, không tự thay tên thương hiệu khác.
 *
 * LƯU Ý: màn splash NATIVE thật (trước khi JS load, cấu hình ở app.json plugin expo-splash-screen +
 * assets/images/splash-icon.png) mới là thứ Admin thấy đầu tiên trên thiết bị thật — đã đồng bộ theo
 * đúng artboard này (nền #1F5A45 + logo trắng), nhưng chỉ có hiệu lực sau khi build native lại (EAS/
 * prebuild), KHÔNG áp dụng khi chạy qua Expo Go (Expo Go dùng splash riêng của chính nó).
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <VStack space="lg" className="items-center px-8">
        <BrandMark size={76} />
        <VStack space="xs" className="items-center">
          <AppHeading size="2xl" className="text-primary-foreground text-center">
            David Dũng
          </AppHeading>
          <AppText className="text-primary-foreground/80 text-center">
            Số liệu nông trường, rõ từng ngày
          </AppText>
        </VStack>
        <Spinner className="mt-2 text-white" />
      </VStack>
    </View>
  );
}
