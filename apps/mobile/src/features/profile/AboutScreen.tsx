import { Linking, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';

/** Màn 15 "Thông tin ứng dụng" — thuần tĩnh, không gọi API (đúng audit plan: "KHÔNG cần API"). Phiên
 * bản/Build đọc từ `app.json` qua `expo-constants`, Thiết bị đọc từ `expo-device`. */
export function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  const deviceLabel = [Device.osName && `${Device.osName} ${Device.osVersion ?? ''}`.trim(), Device.modelName]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
          <AppText size="sm" className="text-primary">
            ‹ Hồ sơ
          </AppText>
        </Pressable>
        <AppHeading size="xl">Thông tin ứng dụng</AppHeading>

        <VStack space="sm" className="items-center py-4">
          <Box className="items-center justify-center rounded-2xl bg-primary p-4">
            <BrandMark size={40} />
          </Box>
          <AppHeading size="lg">David Dũng</AppHeading>
          <AppText className="text-muted-foreground">Quản lý nông trường cao su</AppText>
        </VStack>

        <Box className="rounded-xl border border-border bg-card">
          <InfoRow label="Phiên bản" value={version} />
          <RowDivider />
          <InfoRow label="Build" value={buildNumber ?? '—'} />
          <RowDivider />
          <InfoRow label="Thiết bị" value={deviceLabel || '—'} />
        </Box>

        <Box className="rounded-xl border border-border bg-card">
          {/* Chưa có nội dung Chính sách/Điều khoản thật (chưa nằm trong phạm vi Module 1) — mở link
              placeholder, KHÔNG chặn build vì thiếu nội dung pháp lý cuối cùng. */}
          <LinkRow label="Chính sách quyền riêng tư" onPress={() => Linking.openURL('https://example.com/privacy')} />
          <RowDivider />
          <LinkRow label="Điều khoản sử dụng" onPress={() => Linking.openURL('https://example.com/terms')} />
        </Box>

        {/* Số hỗ trợ lấy nguyên theo artboard mockup — TODO: thay bằng số hotline thật khi có, chưa có
            yêu cầu/nguồn chính thức nào khác trong spec. */}
        <AppText size="xs" className="text-center text-muted-foreground">
          © 2026 David Dũng · Hỗ trợ: 0911 222 333
        </AppText>
      </VStack>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box className="flex-row items-center justify-between px-4 py-3">
      <AppText size="sm" className="text-muted-foreground">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </Box>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Box className="flex-row items-center justify-between px-4 py-3">
        <AppText>{label}</AppText>
        <AppText className="text-muted-foreground">›</AppText>
      </Box>
    </Pressable>
  );
}

function RowDivider() {
  return <Box className="h-px bg-border" style={{ marginLeft: 16 }} />;
}
