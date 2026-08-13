import { useState } from 'react';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

export interface AppSelectOption<T extends string> {
  label: string;
  value: T;
}

export interface AppSelectProps<T extends string> {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: AppSelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

/**
 * Select tối giản tự viết (KHÔNG dùng `@/components/ui/select` của gluestack-ui — bản alpha đang dùng
 * chưa ổn định, đã xóa khỏi scaffold, xem docs/frontend-grilling-plan.md §5). Field bấm để mở/đóng danh
 * sách lựa chọn NGAY BÊN DƯỚI (inline, không Modal/overlay — cùng lý do). Đủ dùng cho danh sách ngắn
 * (Tổ/Nhân viên/Loại mủ) ở admin-catalog và form nhập tay nhanh.
 */
export function AppSelect<T extends string>({
  label,
  placeholder = 'Chọn...',
  value,
  options,
  onChange,
  error,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <VStack space="xs">
      {label ? (
        <AppText size="sm" className="text-foreground">
          {label}
        </AppText>
      ) : null}
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Box
          className={`border rounded-md px-3 py-2.5 flex-row items-center justify-between ${
            error ? 'border-destructive' : 'border-border'
          }`}
        >
          <AppText className={selected ? 'text-foreground' : 'text-muted-foreground'}>
            {selected?.label ?? placeholder}
          </AppText>
          <AppText className="text-muted-foreground">{open ? '▴' : '▾'}</AppText>
        </Box>
      </Pressable>
      {error ? (
        <AppText size="xs" className="text-destructive">
          {error}
        </AppText>
      ) : null}
      {open ? (
        <Box className="border border-border rounded-md overflow-hidden">
          {options.length === 0 ? (
            <Box className="px-3 py-2.5">
              <AppText size="sm" className="text-muted-foreground">
                Không có lựa chọn nào.
              </AppText>
            </Box>
          ) : null}
          {options.map((option, i) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <Box
                className={`px-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''} ${
                  option.value === value ? 'bg-primary/10' : ''
                }`}
              >
                <AppText className={option.value === value ? 'text-primary font-medium' : undefined}>
                  {option.label}
                </AppText>
              </Box>
            </Pressable>
          ))}
        </Box>
      ) : null}
    </VStack>
  );
}
