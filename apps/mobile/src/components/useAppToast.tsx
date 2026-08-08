import { useToast } from '@/components/ui/toast';
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';

export type AppToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ShowToastOptions {
  title: string;
  description?: string;
  variant?: AppToastVariant;
  /** Toast dùng cho banner lỗi/type_mismatch không chặn ở màn Chụp ảnh (ADR-0011) mặc định
   * `duration: null` (không tự đóng) khi variant error — Admin bấm "Xem chi tiết" hoặc tự đóng. */
  duration?: number | null;
}

/** Xem ghi chú ở AppText.tsx (ADR-0015). Bọc `useToast()` của gluestack thành 1 lệnh gọi
 * `showToast({ title, variant })` thay vì bắt mỗi nơi tự viết `render: ({id}) => <Toast>...` lặp lại. */
export function useAppToast() {
  const toast = useToast();

  function showToast({ title, description, variant = 'info', duration }: ShowToastOptions) {
    return toast.show({
      placement: 'top',
      duration: duration ?? (variant === 'error' ? null : 4000),
      render: ({ id }) => (
        <Toast nativeID={`toast-${id}`} action={variant} variant="solid">
          <ToastTitle>{title}</ToastTitle>
          {description ? <ToastDescription>{description}</ToastDescription> : null}
        </Toast>
      ),
    });
  }

  return { showToast, close: toast.close, closeAll: toast.closeAll };
}
