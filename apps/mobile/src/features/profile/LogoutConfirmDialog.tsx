import { Modal, Pressable as RNPressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';

/**
 * Màn 16 "Xác nhận đăng xuất" (artboard "16 · Xác nhận đăng xuất") — modal overlay trên màn 10, KHÔNG
 * phải route riêng. Dùng RN `Modal` core trực tiếp (cùng pattern `ZoomableImageModal.tsx`) — chưa có
 * component Modal/ActionSheet dùng chung trong `components/ui` (ADR-0015 mới wrap Button/Input/Toast).
 */
export function LogoutConfirmDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <RNPressable
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
      >
        {/* Chặn bấm xuyên qua nền tối tới nội dung card bên trong (không đóng modal khi bấm vào card) */}
        <RNPressable onPress={() => {}}>
          <Box className="rounded-xl bg-card p-5">
            <VStack space="sm">
              <AppHeading size="lg">Đăng xuất khỏi tài khoản?</AppHeading>
              <AppText className="text-muted-foreground">
                Anh/chị sẽ cần đăng nhập lại để tiếp tục dùng ứng dụng. Phiếu đã chụp nhưng chưa gửi vẫn
                được giữ trên máy.
              </AppText>
              <HStack space="sm" className="mt-2">
                <AppButton variant="outline" className="flex-1" onPress={onCancel}>
                  Hủy
                </AppButton>
                <AppButton variant="destructive" className="flex-1" onPress={onConfirm}>
                  Đăng xuất
                </AppButton>
              </HStack>
            </VStack>
          </Box>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}
