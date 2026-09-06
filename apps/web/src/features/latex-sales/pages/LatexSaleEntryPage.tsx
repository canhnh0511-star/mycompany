import { useRef, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { neutral } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import { toIsoDate } from '../../../utils/format';
import { useTeams } from '../../../hooks/useLookups';
import { LatexSaleEntryPanel } from '../components/LatexSaleEntryPanel';
import { useInvalidateLatexSales } from '../hooks/useLatexSales';
import { ScanBatchPhotoPanel } from '../../daily-entry/components/production/ScanBatchPhotoPanel';
import {
  useCancelScanBatch,
  useCaptureScanImage,
  useRetryScanBatch,
  useScanBatch,
  useScanBatchLookup,
} from '../../daily-entry/hooks/useScanBatch';

/**
 * Nhập liệu Bán mủ — tái dùng NGUYÊN VẸN hạ tầng OCR (`daily-entry/hooks/useScanBatch.ts`,
 * `ScanBatchPhotoPanel`) với `documentType: 'LATEX_SALE'` (đã có sẵn ở backend, chưa từng dùng tới) —
 * chỉ khác `DailyEntryPage` ở cột trái: KHÔNG có roster cố định (`LatexSaleEntryPanel` — danh sách
 * thẻ, xem model/latexSaleEntry.types.ts).
 */
export function LatexSaleEntryPage() {
  const [recordDate, setRecordDate] = useState(toIsoDate(new Date()));
  const [teamId, setTeamId] = useState('');
  const { data: teams } = useTeams();

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
  const { data: lookup } = useScanBatchLookup('LATEX_SALE', teamId, recordDate, lookupEnabled);
  const activeBatchId = capturedBatchId ?? lookup?.batchId ?? null;
  const { data: batch, isLoading: loadingBatch } = useScanBatch(activeBatchId);

  const captureMutation = useCaptureScanImage();
  const retryBatchMutation = useRetryScanBatch();
  const cancelBatchMutation = useCancelScanBatch();
  const invalidateLatexSales = useInvalidateLatexSales();

  const blocked = !!lookup?.blocked && batch?.status !== 'FAILED';

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !teamId) return;
    setUploadError(null);
    for (const file of Array.from(fileList)) {
      try {
        const result = await captureMutation.mutateAsync({ documentType: 'LATEX_SALE', workDate: recordDate, teamId, file });
        setCapturedBatchId(result.id);
        invalidateLatexSales();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Tải ảnh lên thất bại, thử lại giúp tôi.');
        break;
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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
          <TextField select size="small" value={teamId} onChange={(event) => setTeamId(event.target.value)} sx={{ minWidth: 220 }}>
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
      <Stack spacing={2.5}>
        {controlCard}
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontSize: 13.5, border: `1px dashed ${neutral[200]}`, borderRadius: '12px' }}>
          Chọn Tổ và Ngày để bắt đầu nhập phiếu bán mủ.
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2.5, alignItems: 'stretch' }}>
        <Stack spacing={2.5}>
          {controlCard}
          {uploadError && <Typography sx={{ fontSize: 13, color: 'error.main' }}>{uploadError}</Typography>}
          <SectionPanel title="Phiếu bán mủ" noContentPadding sx={{ flex: 1 }}>
            <LatexSaleEntryPanel teamId={teamId} recordDate={recordDate} />
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
    </Stack>
  );
}
