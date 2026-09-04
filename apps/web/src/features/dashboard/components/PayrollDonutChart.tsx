import { Box, Typography } from '@mui/material';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const SIZE = 132;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Donut nhẹ tự vẽ bằng SVG (spec §38: "không bundle chart library lớn chỉ vì
 * một donut nhỏ"). Số chính ở center theo spec §24.
 */
export function PayrollDonutChart({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const visibleSlices = slices.filter((slice) => slice.value > 0);

  // Offset tích lũy của từng lát — tính trước bằng reduce (không reassign
  // biến trong lúc render) để lát sau tiếp nối đúng vị trí lát trước.
  const offsets = visibleSlices.reduce<number[]>((acc, slice) => {
    const previous = acc.at(-1) ?? 0;
    const dash = (slice.value / total) * CIRCUMFERENCE;
    return [...acc, previous + dash];
  }, []);

  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#EEF1EE" strokeWidth={STROKE} />
        {visibleSlices.map((slice, index) => {
          const dash = (slice.value / total) * CIRCUMFERENCE;
          const dashArray = `${dash} ${CIRCUMFERENCE - dash}`;
          const dashOffset = -(offsets[index] - dash);
          return (
            <circle
              key={slice.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 1,
        }}
      >
        <Typography sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{centerValue}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{centerLabel}</Typography>
      </Box>
    </Box>
  );
}
