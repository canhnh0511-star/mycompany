import { Box, Stack, Typography } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ScaleOutlinedIcon from '@mui/icons-material/ScaleOutlined';
import { LoadingButton } from '../../../../components/common/LoadingButton';
import { neutral, red } from '../../../../theme/colors';
import { useLatexTypes } from '../../../../hooks/useLookups';
import {
  useRecheckScanBatchTotal,
  useResolveScanBatchConflict,
  useResolveScanImageDate,
} from '../../hooks/useScanBatch';
import type { ScanBatch } from '../../model/scanBatch.types';

/** `conflict.detail` là JSON thô từ backend (vd `{"latexTypeCode":"water","ocrTotal":95,
 * "systemTotal":92.9}` cho TOTAL_MISMATCH) — parse ra câu chữ dễ đọc thay vì hiện thẳng JSON. */
function describeTotalMismatch(detail: string | null, latexTypeLabel: (code: string) => string): string {
  if (!detail) return 'Tổng trên ảnh không khớp dữ liệu hiện tại.';
  try {
    const parsed = JSON.parse(detail) as { latexTypeCode?: string; ocrTotal?: number; systemTotal?: number };
    if (parsed.latexTypeCode == null || parsed.ocrTotal == null || parsed.systemTotal == null) {
      return 'Tổng trên ảnh không khớp dữ liệu hiện tại.';
    }
    const diff = parsed.ocrTotal - parsed.systemTotal;
    const sign = diff > 0 ? '+' : '';
    return `${latexTypeLabel(parsed.latexTypeCode)} lệch: phiếu ghi ${parsed.ocrTotal.toLocaleString('vi-VN')} kg, hệ thống đang có ${parsed.systemTotal.toLocaleString('vi-VN')} kg (${sign}${diff.toLocaleString('vi-VN')} kg).`;
  } catch {
    return 'Tổng trên ảnh không khớp dữ liệu hiện tại.';
  }
}

/**
 * "Cảnh báo cần xác nhận" — gộp 3 loại conflict (lệch ngày/trùng danh sách nhân viên/lệch tổng)
 * thành 1 danh sách inline (mockup đã duyệt), KHÔNG dùng popup chặn như bản trước. Mỗi loại tự chứa
 * action giải quyết của nó, dùng lại nguyên hook đã có từ trước — không cần hook/action mới.
 */
export function ScanBatchAlertList({ batch }: { batch: ScanBatch }) {
  const resolveDateMutation = useResolveScanImageDate();
  const resolveConflictMutation = useResolveScanBatchConflict();
  const recheckTotalMutation = useRecheckScanBatchTotal();
  const { data: latexTypes } = useLatexTypes();
  const latexTypeLabel = (code: string) => latexTypes?.find((t) => t.code === code)?.label ?? code;

  const dateMismatchImages = batch.images.filter(
    (img) => img.dateVerificationStatus === 'MISMATCH' && img.dateResolution === 'UNRESOLVED',
  );
  const duplicateConflicts = batch.conflicts.filter((c) => c.status === 'OPEN' && c.conflictType === 'DUPLICATE_IMAGE');
  const totalMismatchConflicts = batch.conflicts.filter((c) => c.status === 'OPEN' && c.conflictType === 'TOTAL_MISMATCH');

  const totalCount = dateMismatchImages.length + duplicateConflicts.length + totalMismatchConflicts.length;
  if (totalCount === 0) return null;

  const blockingCount = dateMismatchImages.length + duplicateConflicts.length;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5, borderTop: `1px solid ${neutral[200]}` }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Cảnh báo cần xác nhận</Typography>
        {blockingCount > 0 && (
          <Box
            sx={{
              fontSize: 11, fontWeight: 700, color: red[700], bgcolor: red[50],
              px: 1, borderRadius: 999, lineHeight: 1.8,
            }}
          >
            {blockingCount} chặn lưu
          </Box>
        )}
      </Stack>

      <Stack sx={{ '& > div': { borderTop: `1px solid ${neutral[200]}` } }}>
        {dateMismatchImages.map((image) => (
          <Stack key={image.id} spacing={1} sx={{ p: 1.75 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 16, color: red[600], mt: 0.25 }} />
              <Typography sx={{ fontSize: 12.5 }}>
                Ảnh ghi ngày <b>{image.ocrDetectedDate}</b>, khác ngày đang chọn (<b>{batch.workDate}</b>).
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pl: 3 }}>
              <LoadingButton
                size="small"
                variant="outlined"
                loading={resolveDateMutation.isPending}
                onClick={() => resolveDateMutation.mutate({ imageId: image.id, resolution: 'KEEP_SESSION_DATE' })}
              >
                Giữ {batch.workDate}
              </LoadingButton>
              <LoadingButton
                size="small"
                variant="contained"
                color="success"
                loading={resolveDateMutation.isPending}
                onClick={() => resolveDateMutation.mutate({ imageId: image.id, resolution: 'CHANGE_DATE' })}
              >
                Đổi sang {image.ocrDetectedDate}
              </LoadingButton>
            </Stack>
          </Stack>
        ))}

        {duplicateConflicts.map((conflict) => (
          <Stack key={conflict.id} spacing={1} sx={{ p: 1.75 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <GroupsOutlinedIcon sx={{ fontSize: 16, color: red[600], mt: 0.25 }} />
              <Typography sx={{ fontSize: 12.5 }}>
                Danh sách công nhân của 1 ảnh trùng với ảnh đã tải trước đó trong phiên này.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pl: 3 }}>
              <LoadingButton
                size="small"
                variant="outlined"
                loading={resolveConflictMutation.isPending}
                onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, action: 'DISCARD' })}
              >
                Đúng là trùng — bỏ ảnh
              </LoadingButton>
              <LoadingButton
                size="small"
                variant="contained"
                color="success"
                loading={resolveConflictMutation.isPending}
                onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, action: 'OVERRIDE' })}
              >
                Không trùng — tiếp tục điền
              </LoadingButton>
            </Stack>
          </Stack>
        ))}

        {totalMismatchConflicts.map((conflict) => (
          <Stack key={conflict.id} spacing={1} sx={{ p: 1.75 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <ScaleOutlinedIcon sx={{ fontSize: 16, color: 'warning.main', mt: 0.25 }} />
              <Typography sx={{ fontSize: 12.5 }}>{describeTotalMismatch(conflict.detail, latexTypeLabel)}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ pl: 3 }}>
              <LoadingButton
                size="small"
                variant="outlined"
                loading={resolveConflictMutation.isPending}
                onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, action: 'OVERRIDE' })}
              >
                Chấp nhận lệch
              </LoadingButton>
              <LoadingButton
                size="small"
                variant="contained"
                color="success"
                loading={recheckTotalMutation.isPending}
                onClick={() => recheckTotalMutation.mutate(conflict.id)}
              >
                Đã sửa, kiểm tra lại
              </LoadingButton>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
