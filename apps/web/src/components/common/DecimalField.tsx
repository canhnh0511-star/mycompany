import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

/**
 * "12,5" hoặc "12.5.3" -> "12.5" — cho phép ĐÚNG 1 dấu chấm thập phân, chuẩn hóa dấu phẩy kiểu Việt
 * Nam thành dấu chấm, bỏ mọi ký tự không phải chữ số/dấu chấm. Không dùng `Number()`/định dạng lại
 * ngay khi gõ (khác `MoneyField`) — kg/DRC% cần gõ dở dang được (vd "12." trước khi gõ tiếp "5"),
 * định dạng lại giữa chừng sẽ nhảy con trỏ/xóa dấu chấm người dùng vừa gõ.
 */
function sanitizeDecimal(raw: string): string {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized;
  return normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
}

interface DecimalFieldProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'slotProps'> {
  /** Giá trị RAW dạng chuỗi (vd "12.5"), rỗng nghĩa là chưa nhập. KHÔNG định dạng nghìn — số lượng
   * kg/% không cần dấu phân cách hàng nghìn như tiền. */
  value: string;
  onValueChange: (raw: string) => void;
  /** Đơn vị hiện ở cuối field (vd "kg", "%"). */
  unit?: string;
}

/**
 * Input số thập phân dùng chung cho khối lượng (kg)/DRC% — thay cho `<TextField type="number">` trần,
 * cùng lý do đã fix ở `MoneyField`: input HTML `type="number"` bản địa có thể lặng lẽ hỏng giá trị tùy
 * locale trình duyệt (vd chấp nhận dấu phẩy làm phân cách thập phân ở 1 số locale nhưng không phải
 * tất cả). Ở đây tự sanitize ký tự thay vì dựa vào parser số bản địa, đảm bảo hành vi nhất quán mọi
 * trình duyệt/locale.
 */
export function DecimalField({ value, onValueChange, unit, ...rest }: DecimalFieldProps) {
  return (
    <TextField
      {...rest}
      value={value}
      onChange={(event) => onValueChange(sanitizeDecimal(event.target.value))}
      slotProps={{
        htmlInput: { inputMode: 'decimal' },
        input: unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined,
      }}
    />
  );
}
