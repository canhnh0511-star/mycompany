import { useRef } from 'react';
import { Box, Button } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { formatDateWithWeekday, toIsoDate } from '../../utils/format';
import { neutral } from '../../theme/colors';

/**
 * Context ngày làm việc hiện tại — lưu ở query param `date` (spec §36: CTA
 * deep-link phải giữ context ngày, không tự reset về hôm nay).
 */
export function DateSelector() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const dateParam = searchParams.get('date') ?? toIsoDate(new Date());

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
        {formatDateWithWeekday(dateParam)}
      </Button>
      <input
        ref={inputRef}
        type="date"
        value={dateParam}
        onChange={(event) => {
          const value = event.target.value;
          if (!value) return;
          const next = new URLSearchParams(searchParams);
          next.set('date', value);
          setSearchParams(next, { replace: true });
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden
        tabIndex={-1}
      />
    </Box>
  );
}
