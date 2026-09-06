import { useRef, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { neutral } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import { toIsoDate } from '../../../utils/format';
import { useTeams } from '../../../hooks/useLookups';
import { ProductionRosterTable } from '../components/production/ProductionRosterTable';
import { ScanBatchPhotoPanel } from '../components/production/ScanBatchPhotoPanel';
import { useInvalidateRoster } from '../hooks/useProductionRecords';
import {
  useCancelScanBatch,
  useCaptureScanImage,
  useRetryScanBatch,
  useScanBatch,
  useScanBatchLookup,
} from '../hooks/useScanBatch';

/**
 * "Phiếu" — Nhập phiếu hàng ngày (CLAUDE.md §1/§5). Thiết kế cuối đã duyệt (mockup): 1 bảng CỐ ĐỊNH
 * theo roster công nhân của Tổ đã chọn, nhập tay và tải ảnh OCR cùng đổ vào bảng đó — KHÔNG còn 2
 * tab tách biệt như Đợt 1a/1b cũ. Trang này giữ toàn bộ state chọn Tổ/Ngày + orchestration upload
 * ảnh (đơn giản hơn để 1 nơi quản lý, vì cả bảng roster lẫn panel ảnh đều phụ thuộc Tổ/Ngày này).
 */
export function DailyEntryPage() {
  const [searchParams] = useSearchParams();
  const [recordDate, setRecordDate] = useState(searchParams.get('date') ?? toIsoDate(new Date()));
  const [teamId, setTeamId] = useState('');
  const { data: teams } = useTeams();

  // Batch Admin tự tạo trong phiên này (sau khi capture ảnh đầu tiên) — ưu tiên hơn batch cũ tìm
  // được qua lookup. Reset khi đổi Tổ/Ngày (derive trong lúc render — xem PayrollService pattern
  // tương tự, tránh 1 useEffect chỉ để setState theo props đổi).
  const [capturedBatchId, setCapturedBatchId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(`${teamId}|${recordDate}`);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentKey = `${teamId}|${recordDate}`;
  if (currentKey !== resetKey) {
    setResetKey(currentKey);
    setCapturedBatchId(null);
  }

  const lookupEnabled = !!teamId && !capturedBatchId;
  const { data: lookup } = useScanBatchLookup('PRODUCTION_RECORD', teamId, recordDate, lookupEnabled);
  const activeBatchId = capturedBatchId ?? lookup?.batchId ?? null;
  const { data: batch, isLoading: loadingBatch } = useScanBatch(activeBatchId);

  const captureMutation = useCaptureScanImage();
  const retryBatchMutation = useRetryScanBatch();
  const cancelBatchMutation = useCancelScanBatch();
  const invalidateRoster = useInvalidateRoster();

  const blocked = !!lookup?.blocked && batch?.status !== 'FAILED';

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !teamId) return;
    setUploadError(null);
    for (const file of Array.from(fileList)) {
      try {
        const result = await captureMutation.mutateAsync({ documentType: 'PRODUCTION_RECORD', workDate: recordDate, teamId, file });
        setCapturedBatchId(result.id);
        // OCR tạo production_records MỚI thẳng trong DB (ADR-0006) qua route capture-image riêng,
        // KHÔNG qua useCreateProductionRecordsBatch — phải tự invalidate roster ở đây, nếu không bảng
        // chỉ hiện đúng dữ liệu OCR ở lần MỞ TRANG SAU, không phải ngay khi vừa xử lý xong ảnh (bug
        // phát hiện khi làm Bán mủ, Phase 4, cùng kiến trúc).
        invalidateRoster();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Tải ảnh lên thất bại, thử lại giúp tôi.');
        break;
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Stack spacing={2.5}>
      {/* KHÔNG tự vẽ tiêu đề trang ở đây — MainLayout/TopBar đã hiện "Nhập phiếu hàng ngày" theo
          route (routeMeta.getPageTitle), vẽ thêm 1 lần nữa ở đây tạo ra 2 dòng tiêu đề trùng nhau
          (phát hiện qua live test). Các trang ready khác (Bảng lương...) cũng không tự vẽ title. */}
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: -1.5 }}>
        Nhập dữ liệu từ ảnh phiếu bằng OCR, kiểm tra và hoàn tất
      </Typography>

      {(() => {
        const controlCard = (
          <Paper variant="outlined" sx={{ borderRadius: `${uiTokens.radius.panel}px`, boxShadow: uiTokens.shadow.panel }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-end' }, p: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Ngày *</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={recordDate}
                  onChange={(event) => event.target.value && setRecordDate(event.target.value)}
                  sx={{ minWidth: 170 }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Tổ *</Typography>
                <TextField
                  select
                  size="small"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">Chọn Tổ…</MenuItem>
                  {(teams ?? []).map((team) => (
                    <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 0.5 }}>
                <Button
                  component="label"
                  variant="contained"
                  color="success"
                  startIcon={<CloudUploadOutlinedIcon />}
                  disabled={!teamId || blocked || captureMutation.isPending}
                >
                  {captureMutation.isPending ? 'Đang xử lý ảnh…' : 'Tải ảnh phiếu'}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
                </Button>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>JPG, PNG — có thể chọn nhiều ảnh</Typography>
              </Box>
            </Stack>
          </Paper>
        );

        if (!teamId) {
          return (
            <>
              {controlCard}
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontSize: 13.5, border: `1px dashed ${neutral[200]}`, borderRadius: '12px' }}>
                Chọn Tổ và Ngày để tải danh sách công nhân. Sau khi tải ảnh, dữ liệu OCR sẽ tự điền trực tiếp vào bảng.
              </Box>
            </>
          );
        }

        // Cột trái = control-card + banner + bảng xếp CHỒNG (mockup đã duyệt: control-card chỉ rộng
        // bằng cột trái, không full-width); grid alignItems 'stretch' để cột phải (ảnh) cao bằng
        // toàn bộ cột trái, không dừng ngang hàng table như trước (đúng phản hồi "bên trái bên phải
        // chưa = height với nhau").
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5, alignItems: 'stretch' }}>
            <Stack spacing={2.5}>
              {controlCard}
              {uploadError && <Typography sx={{ fontSize: 13, color: 'error.main' }}>{uploadError}</Typography>}
              <SectionPanel title="Danh sách công nhân" noContentPadding sx={{ flex: 1 }}>
                <ProductionRosterTable teamId={teamId} recordDate={recordDate} />
              </SectionPanel>
            </Stack>

            <ScanBatchPhotoPanel
              batch={batch}
              loadingBatch={loadingBatch}
              blocked={blocked}
              onRetryBatch={() => activeBatchId && retryBatchMutation.mutate(activeBatchId)}
              onCancelBatch={() => activeBatchId && cancelBatchMutation.mutate(activeBatchId)}
            />
          </Box>
        );
      })()}
    </Stack>
  );
}
