import { View } from 'react-native';
import { Spinner } from '@/components/ui/spinner';

/**
 * Màn hình trung chuyển duy nhất — AuthGate (_layout.tsx) điều hướng đi ngay khi hydrate xong. Trên
 * native gần như không thấy (native splash screen còn che tới lúc đó); trên web (không có native
 * splash) đây là thứ hiện ra trong lúc chờ, nên không thể để trống.
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Spinner />
    </View>
  );
}
