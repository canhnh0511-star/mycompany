import { useState } from 'react';
import { Modal, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppText } from '@/components/AppText';

export interface AppDateInputProps {
  label?: string;
  /** ISO yyyy-mm-dd, chuỗi rỗng nếu chưa chọn. */
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
}

function parseIso(iso: string): Date {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function displayLabel(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Ô chọn ngày — thay `AppInput` gõ tay "yyyy-mm-dd" (dễ gõ sai định dạng, không validate được).
 * Luôn chỉ-đọc (không có TextInput nào) — bấm mở picker thay vì gõ, tránh luôn lớp crash NativeCSS/
 * InputField đã gặp ở BatchReviewScreen (xem ghi chú ở đó, 2026-08-23) vì component này không cần
 * bàn phím. iOS dùng `display="spinner"` (cuộn từng cột ngày/tháng/năm, đúng UX gốc iOS) bọc trong
 * modal có nút Xong/Hủy — picker kiểu spinner không tự đóng, phải xác nhận. Android dùng
 * `display="default"` (dialog hệ điều hành tự đóng khi chọn xong), không cần modal bọc thêm. */
export function AppDateInput({ label, value, onChangeText, placeholder, error }: AppDateInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIso(value));

  function handleOpen() {
    setDraft(parseIso(value));
    setOpen(true);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setOpen(false);
    if (event.type === 'set' && selected) {
      onChangeText(toIso(selected));
    }
  }

  const field = (
    <HStack space="xs" className="items-center">
      <Pressable onPress={handleOpen} className="flex-1">
        <Box className="border border-border rounded-md px-3 min-h-9 justify-center">
          <AppText size="sm" className={value ? undefined : 'text-muted-foreground'}>
            {value ? displayLabel(value) : (placeholder ?? 'Chọn ngày')}
          </AppText>
        </Box>
      </Pressable>
      {/* Vài field cho phép bỏ trống có ý nghĩa riêng (vd "Đến (bỏ trống = vô hạn)" ở
          Allowance/RateConfigs) — picker tự nó không có cách quay lại rỗng sau khi đã chọn 1 ngày. */}
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <AppText size="sm" className="text-muted-foreground px-1">
            ✕
          </AppText>
        </Pressable>
      ) : null}
    </HStack>
  );

  return (
    <VStack space="xs">
      {label ? (
        <AppText size="sm" className="text-foreground">
          {label}
        </AppText>
      ) : null}
      {field}
      {error ? (
        <AppText size="xs" className="text-destructive">
          {error}
        </AppText>
      ) : null}

      {Platform.OS === 'android' ? (
        open ? <DateTimePicker value={draft} mode="date" display="default" onChange={handleAndroidChange} /> : null
      ) : (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <Box className="bg-background border-t border-border">
            <HStack className="items-center justify-between px-4 py-3 border-b border-border">
              <Pressable onPress={() => setOpen(false)}>
                <AppText size="sm" className="text-muted-foreground">
                  Hủy
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChangeText(toIso(draft));
                  setOpen(false);
                }}
              >
                <AppText size="sm" className="text-primary font-semibold">
                  Xong
                </AppText>
              </Pressable>
            </HStack>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(_, selected) => selected && setDraft(selected)}
            />
          </Box>
        </Modal>
      )}
    </VStack>
  );
}
