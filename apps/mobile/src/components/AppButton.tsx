import type { ComponentProps } from 'react';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';

type ButtonProps = ComponentProps<typeof Button>;

export interface AppButtonProps extends Omit<ButtonProps, 'children'> {
  children: string;
  /** Disable + hiện spinner cùng lúc — dùng cho mutation batch/OCR/confirm đang chạy. */
  isLoading?: boolean;
}

/** Xem ghi chú ở AppText.tsx (ADR-0015). Gộp label + spinner làm 1 API đơn giản thay vì lộ hết
 * compound Button/ButtonText/ButtonSpinner ra từng nơi gọi. */
export function AppButton({ children, isLoading, isDisabled, ...props }: AppButtonProps) {
  return (
    <Button isDisabled={isDisabled || isLoading} {...props}>
      {isLoading ? <ButtonSpinner /> : null}
      <ButtonText>{children}</ButtonText>
    </Button>
  );
}
