import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

const numberFormatter = new Intl.NumberFormat('vi-VN');

/** "1.234.567" hoặc "1,234,567" -> "1234567" — giữ lại CHỈ chữ số. */
function toDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

interface MoneyFieldProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'slotProps'> {
  /** Giá trị RAW — chuỗi chỉ gồm chữ số (không dấu phân cách), rỗng nghĩa là chưa nhập. */
  value: string;
  onValueChange: (digitsOnly: string) => void;
  /** Đơn vị hiện ở cuối field (vd "đ/kg", "đ/tháng"). */
  unit?: string;
}

/**
 * Input số tiền dùng chung — thay cho `<TextField type="number">` trần. BUG đã xác nhận: input HTML
 * `type="number"` chỉ chấp nhận 1 dấu chấm thập phân — gõ "1.000.000" theo thói quen ghi số tiền
 * Việt Nam (dấu chấm ngăn cách hàng nghìn) bị trình duyệt ÂM THẦM cắt còn "1.000000" = 1, KHÔNG có
 * cảnh báo gì, nút Lưu vẫn bấm được bình thường — gây sai lệch giá/đơn giá nghiêm trọng mà người
 * dùng không hề biết cho tới khi thấy số liệu bất thường ở nơi khác. Xem báo cáo bug "Hạng kỹ thuật
 * không cập nhật giá = 0" — tái hiện được đúng cơ chế này.
 *
 * Cách sửa: hiển thị GIÁ TRỊ ĐÃ ĐỊNH DẠNG (dấu chấm ngăn cách hàng nghìn, giống formatCurrency toàn
 * app) trên 1 `<TextField>` thường (không phải `type="number"`), nhưng bóc HẾT ký tự không phải chữ
 * số mỗi lần gõ — gõ dấu chấm/phẩy/khoảng trắng kiểu gì cũng chỉ còn lại đúng chữ số, không thể tạo
 * ra giá trị sai lệch âm thầm.
 */
export function MoneyField({ value, onValueChange, unit, ...rest }: MoneyFieldProps) {
  const display = value ? numberFormatter.format(Number(value)) : '';
  return (
    <TextField
      {...rest}
      value={display}
      onChange={(event) => onValueChange(toDigitsOnly(event.target.value))}
      slotProps={{
        htmlInput: { inputMode: 'numeric' },
        input: unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined,
      }}
    />
  );
}
