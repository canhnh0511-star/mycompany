import * as ImagePicker from 'expo-image-picker';
import { Modal, Pressable as RNPressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';

/**
 * Màn 12 "Ảnh đại diện" (artboard "12 · Ảnh đại diện") — action sheet overlay của màn 11, KHÔNG dùng
 * crop editor phức tạp (đúng ghi chú designer). Chụp ảnh dùng `ImagePicker.launchCameraAsync` (không
 * phải `CameraView` liên tục như CaptureScreen — avatar chỉ cần 1 ảnh, không phải luồng chụp phiếu lặp
 * lại nhiều lần).
 */
export function AvatarActionSheet({
  visible,
  onClose,
  onPicked,
  onRemove,
  hasCurrentAvatar,
}: {
  visible: boolean;
  onClose: () => void;
  onPicked: (uri: string) => void;
  onRemove: () => void;
  hasCurrentAvatar: boolean;
}) {
  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onClose();
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    onClose();
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
    }
  }

  async function handlePickLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    onClose();
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <RNPressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <RNPressable onPress={() => {}}>
          <Box className="rounded-t-xl bg-card p-5 pb-8">
            <VStack space="md">
              <AppHeading size="md">Ảnh đại diện</AppHeading>
              <SheetAction label="Chụp ảnh" onPress={handleTakePhoto} />
              <SheetAction label="Chọn từ thư viện" onPress={handlePickLibrary} />
              {hasCurrentAvatar ? (
                <SheetAction
                  label="Xóa ảnh hiện tại"
                  destructive
                  onPress={() => {
                    onClose();
                    onRemove();
                  }}
                />
              ) : null}
              <Pressable onPress={onClose}>
                <Box className="items-center py-2">
                  <AppText className="text-muted-foreground">Hủy</AppText>
                </Box>
              </Pressable>
            </VStack>
          </Box>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

function SheetAction({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <Box className={`rounded-lg border px-4 py-3 ${destructive ? 'border-destructive' : 'border-border'}`}>
        <AppText className={destructive ? 'text-destructive' : 'text-foreground'}>{label}</AppText>
      </Box>
    </Pressable>
  );
}
