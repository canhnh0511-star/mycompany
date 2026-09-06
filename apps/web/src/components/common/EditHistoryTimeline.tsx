import { Box, Stack, Typography } from '@mui/material';
import { diffEditHistoryFields } from '../../api/editHistory.api';
import { useEditHistory } from '../../hooks/useEditHistory';
import { neutral, text } from '../../theme/colors';
import { formatDateWithWeekday } from '../../utils/format';
import { LoadingSkeleton } from '../feedback/LoadingSkeleton';
import { WidgetEmptyState } from '../feedback/WidgetEmptyState';
import { WidgetErrorState } from '../feedback/WidgetErrorState';

/**
 * "Lịch sử chỉnh sửa" dùng chung (CLAUDE.md §1 — yêu cầu lõi Module 1, build lần đầu ở Phase 3 Danh
 * sách phiếu, tái dùng nguyên xi ở Bán mủ Phase 4) — đọc `edit_history` (polymorphic tableName+
 * recordId, chỉ ghi các lần SỬA sau khi record đã tồn tại, CLAUDE.md §4), hiện dạng timeline: thời
 * gian/người sửa + field nào thực sự đổi (so `oldData`/`newData` đã parse).
 */
export function EditHistoryTimeline({ tableName, recordId }: { tableName: string; recordId: string }) {
  const { data: entries, isLoading, isError, refetch } = useEditHistory(tableName, recordId);

  if (isLoading) return <LoadingSkeleton rows={2} rowHeight={48} />;
  if (isError) return <WidgetErrorState message="Không tải được lịch sử chỉnh sửa." onRetry={() => refetch()} />;
  if (!entries || entries.length === 0) {
    return <WidgetEmptyState title="Chưa có lần sửa nào" description="Bản ghi chưa bị chỉnh sửa kể từ khi tạo." />;
  }

  // Mới nhất lên trước — dễ thấy thay đổi gần đây nhất ngay khi mở panel.
  const sorted = [...entries].sort((a, b) => b.editedAt.localeCompare(a.editedAt));

  return (
    <Stack spacing={0}>
      {sorted.map((entry, index) => {
        const diffs = diffEditHistoryFields(entry.oldData, entry.newData);
        return (
          <Box key={entry.id} sx={{ py: 1.25, borderTop: index === 0 ? 'none' : `1px solid ${neutral[200]}` }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{entry.editedByName}</Typography>
              <Typography sx={{ fontSize: 11.5, color: text.secondary }}>{formatDateWithWeekday(entry.editedAt)}</Typography>
            </Stack>
            {diffs.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: text.secondary, mt: 0.25 }}>Không phát hiện thay đổi nội dung.</Typography>
            ) : (
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                {diffs.map((d) => (
                  <Typography key={d.field} sx={{ fontSize: 12, color: text.secondary }}>
                    <strong>{d.field}</strong>: {d.from} → {d.to}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
