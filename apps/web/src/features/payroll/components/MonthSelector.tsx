import { useRef } from 'react';
import { Box, Button } from '@mui/material';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { neutral } from '../../../theme/colors';
import { formatMonthLabel } from '../../../utils/format';

/**
 * Chọn tháng cho Bảng lương — cùng pattern overlay `<input type="month">` trong suốt như
 * `DateSelector` (top bar), khác kiểu input vì đây là filter theo THÁNG chứ không phải 1 ngày.
 */
export function MonthSelector({ value, onChange }: { value: string; onChange: (yearMonth: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Button
        onClick={handlePick}
        startIcon={<CalendarTodayRoundedIcon sx={{ fontSize: 16 }} />}
        endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />}
        sx={{
          color: 'text.primary',
          borderColor: neutral[200],
          bgcolor: 'background.paper',
          fontWeight: 500,
          fontSize: 13.5,
          minHeight: 38,
          '&:hover': { borderColor: neutral[400], bgcolor: 'background.paper' },
        }}
        variant="outlined"
      >
        {formatMonthLabel(value)}
      </Button>
      <input
        ref={inputRef}
        type="month"
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}
        aria-hidden
        tabIndex={-1}
      />
    </Box>
  );
}
