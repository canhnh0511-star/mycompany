import { Stack, TextField } from '@mui/material';

/**
 * 2 ô ngày hiệu lực dùng chung cho cả 4 form config — `effectiveTo` bỏ trống nghĩa là đang hiệu
 * lực vô thời hạn (CLAUDE.md §4: "NULL là vô cực"), KHÔNG phải giá trị bắt buộc.
 */
export function EffectiveDateFields({
  effectiveFrom,
  onEffectiveFromChange,
  effectiveTo,
  onEffectiveToChange,
}: {
  effectiveFrom: string;
  onEffectiveFromChange: (value: string) => void;
  effectiveTo: string;
  onEffectiveToChange: (value: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1.5}>
      <TextField
        label="Hiệu lực từ"
        type="date"
        size="small"
        fullWidth
        value={effectiveFrom}
        onChange={(event) => onEffectiveFromChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Đến (bỏ trống = vô hạn)"
        type="date"
        size="small"
        fullWidth
        value={effectiveTo}
        onChange={(event) => onEffectiveToChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
}
