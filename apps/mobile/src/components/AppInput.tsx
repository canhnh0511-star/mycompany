import type { ComponentProps } from 'react';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

type InputFieldProps = ComponentProps<typeof InputField>;

export interface AppInputProps extends InputFieldProps {
  label?: string;
  /** Lỗi hiển thị NGAY dưới field — dùng cho lỗi validate client (zod) lẫn lỗi map theo `index` từ
   * BatchResult backend (ADR-0013), không dùng alert chung. */
  error?: string;
}

/** Xem ghi chú ở AppText.tsx (ADR-0015). Gộp label + field + error thành 1 field hoàn chỉnh — form
 * nào cũng cần cả 3 phần này nên không có lý do bắt từng nơi gọi tự ráp lại compound Input/InputField. */
export function AppInput({ label, error, ...fieldProps }: AppInputProps) {
  return (
    <VStack space="xs">
      {label ? (
        <AppText size="sm" className="text-foreground">
          {label}
        </AppText>
      ) : null}
      <Input isInvalid={!!error}>
        <InputField {...fieldProps} />
      </Input>
      {error ? (
        <AppText size="xs" className="text-destructive">
          {error}
        </AppText>
      ) : null}
    </VStack>
  );
}
