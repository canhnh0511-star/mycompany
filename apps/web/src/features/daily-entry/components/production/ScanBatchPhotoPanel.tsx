import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import ZoomOutOutlinedIcon from '@mui/icons-material/ZoomOutOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { LoadingButton } from '../../../../components/common/LoadingButton';
import { SectionPanel } from '../../../../components/common/SectionPanel';
import { StatusBadge, type StatusTone } from '../../../../components/common/StatusBadge';
import { blue, neutral } from '../../../../theme/colors';
import { useRemoveScanImage, useRetryScanImage } from '../../hooks/useScanBatch';
import { parseOcrColumnTotals } from '../../utils/ocrParsing';
import { useLatexTypes } from '../../../../hooks/useLookups';
import { ScanBatchAlertList } from './ScanBatchAlertList';
import type { ImageStatus, ScanBatch } from '../../model/scanBatch.types';

const IMAGE_STATUS_LABEL: Record<ImageStatus, string> = {
  UPLOADING: 'Đang tải lên…',
  PROCESSING: 'Đang đọc OCR…',
  ACTIVE: 'Đã đọc xong',
  FAILED: 'Lỗi',
  PENDING_MOVE: 'Chờ chuyển phiên khác',
  MOVED: 'Đã chuyển',
  REPLACED: 'Đã thay bằng ảnh mới',
};
const IMAGE_STATUS_TONE: Record<ImageStatus, StatusTone> = {
  UPLOADING: 'info',
  PROCESSING: 'info',
  ACTIVE: 'success',
  FAILED: 'error',
  PENDING_MOVE: 'warning',
  MOVED: 'neutral',
  REPLACED: 'neutral',
};

/**
 * "Ảnh phiếu hằng ngày" — pager + zoom + thumbnail nhiều trang + "Thông tin ảnh/OCR" + "Cảnh báo
 * cần xác nhận", TẤT CẢ gộp chung 1 card (mockup đã duyệt — không tách "Cảnh báo" thành card riêng).
 * Thuần presentational — nhận `batch` từ `DailyEntryPage` (nơi giữ state upload/lookup), tự quản lý
 * mỗi state hiển thị cục bộ (trang đang xem, zoom).
 */
export function ScanBatchPhotoPanel({
  batch,
  loadingBatch,
  blocked,
  onRetryBatch,
  onCancelBatch,
}: {
  batch: ScanBatch | undefined;
  loadingBatch: boolean;
  blocked: boolean;
  onRetryBatch: () => void;
  onCancelBatch: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);
  const [confirmRemoveImageId, setConfirmRemoveImageId] = useState<string | null>(null);
  const { data: latexTypes } = useLatexTypes();
  const retryImageMutation = useRetryScanImage();
  const removeImageMutation = useRemoveScanImage();

  if (loadingBatch) {
    return (
      <SectionPanel title="Ảnh phiếu hằng ngày" noContentPadding>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', p: 2.5 }}>Đang tải phiên chụp…</Typography>
      </SectionPanel>
    );
  }
  if (!batch || batch.images.length === 0) {
    return (
      <SectionPanel title="Ảnh phiếu hằng ngày" noContentPadding>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', p: 2.5 }}>
          Chưa có ảnh nào — bấm "Tải ảnh phiếu" ở trên để bắt đầu.
        </Typography>
      </SectionPanel>
    );
  }

  const image = batch.images[Math.min(activeIndex, batch.images.length - 1)];
  const columnTotals = parseOcrColumnTotals(image.ocrColumnTotals);
  // Ảnh ACTIVE đã tạo draft record (chưa qua bước "Duyệt" — CLAUDE.md §5, ADR-0006) vẫn xóa được để
  // Admin chụp/tải lại khi phát hiện đọc sai — backend (ScanBatchService.removeImage) đã hỗ trợ sẵn,
  // tự hủy hết draft gắn với ảnh trước khi loại ảnh. Batch đã APPROVED/CANCELLED thì khóa hẳn, không
  // xóa được nữa (record đã confirmed không được đụng vào qua đường này).
  const canDeleteActiveImage =
    image.status === 'ACTIVE' && batch.status !== 'APPROVED' && batch.status !== 'CANCELLED';
  const confirmingImage = confirmRemoveImageId ? batch.images.find((img) => img.id === confirmRemoveImageId) : undefined;

  return (
    <SectionPanel title="Ảnh phiếu hằng ngày" noContentPadding>
      {blocked && (
        <Alert
          severity={batch.status === 'APPROVED' ? 'info' : 'warning'}
          sx={{ m: 2, mb: 0 }}
          action={
            batch.status === 'FAILED' ? (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={onRetryBatch}>Thử lại</Button>
                <Button size="small" color="error" onClick={onCancelBatch}>Hủy phiên này</Button>
              </Stack>
            ) : undefined
          }
        >
          {batch.status === 'APPROVED'
            ? 'Tổ này, ngày này đã có phiên chụp được duyệt — không thể tải thêm ảnh mới.'
            : 'Tổ này, ngày này có phiên chụp trước đó bị lỗi — thử lại hoặc hủy để bắt đầu phiên mới.'}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button size="small" disabled={activeIndex === 0} onClick={() => setActiveIndex((i) => i - 1)} sx={{ minWidth: 32, px: 0.5 }}>
            <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} />
          </Button>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>
            {activeIndex + 1} / {batch.images.length}
          </Typography>
          <Button size="small" disabled={activeIndex === batch.images.length - 1} onClick={() => setActiveIndex((i) => i + 1)} sx={{ minWidth: 32, px: 0.5 }}>
            <ChevronRightOutlinedIcon sx={{ fontSize: 18 }} />
          </Button>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            disabled={zoomPct <= 60}
            onClick={() => setZoomPct((z) => Math.max(60, z - 20))}
            sx={{ minWidth: 32, px: 0.5 }}
          >
            <ZoomOutOutlinedIcon sx={{ fontSize: 18 }} />
          </Button>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', minWidth: 38, textAlign: 'center' }}>
            {zoomPct}%
          </Typography>
          <Button
            size="small"
            disabled={zoomPct >= 200}
            onClick={() => setZoomPct((z) => Math.min(200, z + 20))}
            sx={{ minWidth: 32, px: 0.5 }}
          >
            <ZoomInOutlinedIcon sx={{ fontSize: 18 }} />
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ mx: 2, mb: 1.5, borderRadius: '10px', overflow: 'auto', border: `1px solid ${neutral[200]}`, bgcolor: neutral[50], maxHeight: 460 }}>
        {image.photoUrl && (
          <Box
            component="img"
            src={image.photoUrl}
            alt=""
            sx={{ width: `${zoomPct}%`, height: 'auto', display: 'block', mx: 'auto' }}
          />
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ px: 2, alignItems: 'center' }}>
        <StatusBadge label={IMAGE_STATUS_LABEL[image.status]} tone={IMAGE_STATUS_TONE[image.status]} />
        {image.ocrRowCount != null && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Đọc được {image.ocrRowCount} dòng</Typography>
        )}
        {(image.status === 'FAILED' || canDeleteActiveImage) && (
          <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
            {image.status === 'FAILED' && (
              <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => retryImageMutation.mutate(image.id)}>Thử lại</Button>
            )}
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              // Ảnh FAILED chưa từng tạo dữ liệu gì — xóa thẳng không cần xác nhận (khớp hành vi cũ).
              // Ảnh ACTIVE đã có draft record thật — luôn hỏi lại trước vì đây là hành động hủy dữ liệu.
              onClick={() =>
                image.status === 'FAILED' ? removeImageMutation.mutate(image.id) : setConfirmRemoveImageId(image.id)
              }
            >
              Xóa ảnh
            </Button>
          </Stack>
        )}
      </Stack>
      {image.errorMessage && (
        <Typography sx={{ fontSize: 12, color: 'error.main', px: 2, mt: 0.5 }}>{image.errorMessage}</Typography>
      )}

      {/* Trang 1/2 (rail hẹp, cố định) + Thông tin ảnh/OCR nằm CHUNG 1 hàng — khớp mockup đã duyệt,
          không xếp chồng dọc thành 2 khối full-width riêng biệt. Luôn hiện rail thumbnail (kể cả chỉ
          1 ảnh) để người dùng thấy rõ đang xem đúng trang nào — ẩn hẳn khi chỉ 1 ảnh khiến bảng thiếu
          hẳn khối "trang", nhìn như thiếu chức năng (phát hiện qua phản hồi live test). */}
      <Stack direction="row" spacing={1.5} sx={{ mx: 2, mb: 2, alignItems: 'flex-start' }}>
        <Stack direction="row" spacing={1} sx={{ width: 168, flexShrink: 0, flexWrap: 'wrap' }}>
            {batch.images.map((thumb, index) => (
              <Box
                key={thumb.id}
                onClick={() => setActiveIndex(index)}
                sx={{
                  flexShrink: 0, width: 56, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                  border: index === activeIndex ? '2px solid' : '1px solid', borderColor: index === activeIndex ? 'success.main' : neutral[200],
                }}
              >
                {thumb.photoUrl && (
                  <Box component="img" src={thumb.photoUrl} alt="" sx={{ width: 56, height: 56, objectFit: 'cover', display: 'block' }} />
                )}
                <Typography sx={{ fontSize: 10, fontWeight: 600, textAlign: 'center', py: 0.25, color: index === activeIndex ? 'success.dark' : 'text.secondary' }}>
                  Trang {index + 1}
                </Typography>
              </Box>
            ))}
        </Stack>

        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, p: 1.5, borderRadius: '10px', bgcolor: blue[50], border: `1px solid ${neutral[200]}` }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'info.dark' }}>Thông tin ảnh / OCR</Typography>
          <InfoRow label="Ngày OCR đọc được" value={image.ocrDetectedDate ?? '—'} />
          <InfoRow
            label="Tổng trên ảnh (kg)"
            value={
              Object.keys(columnTotals).length === 0
                ? '—'
                : (latexTypes ?? [])
                    .filter((t) => columnTotals[t.code] != null)
                    .map((t) => columnTotals[t.code].toLocaleString('vi-VN'))
                    .join(' · ')
            }
          />
          <InfoRow label="Số dòng OCR đọc" value={image.ocrRowCount != null ? String(image.ocrRowCount) : '—'} />
          <InfoRow label="Số trang" value={`${batch.images.length} trang`} />
        </Stack>
      </Stack>

      <ScanBatchAlertList batch={batch} />

      {/* Xác nhận xóa ảnh ACTIVE — hành động hủy dữ liệu (dù chỉ là draft), không cho bấm nhầm 1 phát
          là mất luôn số liệu đã đọc được, kể cả khi Admin có thể tải ảnh khác lên làm lại. */}
      <Dialog open={confirmingImage != null} onClose={() => setConfirmRemoveImageId(null)}>
        <DialogTitle>Xóa ảnh này?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ảnh này đã đọc được{' '}
            {confirmingImage?.ocrRowCount != null ? `${confirmingImage.ocrRowCount} dòng` : 'dữ liệu'} nhưng CHƯA được
            xác nhận (còn ở trạng thái nháp). Xóa ảnh sẽ hủy toàn bộ dữ liệu tạo ra từ ảnh này — bạn có thể tải ảnh
            khác lên để nhập lại.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemoveImageId(null)}>Hủy</Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={removeImageMutation.isPending}
            onClick={() => {
              if (!confirmRemoveImageId) return;
              removeImageMutation.mutate(confirmRemoveImageId, { onSuccess: () => setConfirmRemoveImageId(null) });
            }}
          >
            Xóa ảnh
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </SectionPanel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}
