import { Box, Button, Drawer, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { EditHistoryTimeline } from '../../../components/common/EditHistoryTimeline';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { StatusBadge, type StatusTone } from '../../../components/common/StatusBadge';
import { neutral } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import { eyebrowSx } from '../../../theme/typography';
import { formatDateWithWeekday, formatNumber } from '../../../utils/format';
import { useLatexTypes } from '../../../hooks/useLookups';
import { LATEX_SALE_STATUS_LABEL, type LatexSaleFull } from '../api/latexSales.api';
import { useApproveLatexSale, useCancelLatexSale, useLatexSale } from '../hooks/useLatexSales';

const STATUS_TONE: Record<string, StatusTone> = { DRAFT: 'warning', APPROVED: 'success', CANCELLED: 'neutral' };

/** Cùng pattern `ProductionRecordDetailPanel`/`PayrollDetailPanel`. */
export function LatexSaleDetailPanel({
  saleId,
  onClose,
  variant = 'inline',
}: {
  saleId: string;
  onClose: () => void;
  variant?: 'inline' | 'drawer';
}) {
  const { data: sale, isLoading, isError, refetch } = useLatexSale(saleId);

  const body = (
    <>
      {isLoading && (
        <Box sx={{ p: 2.5 }}>
          <LoadingSkeleton rows={8} />
        </Box>
      )}
      {isError && (
        <Box sx={{ p: 2.5 }}>
          <WidgetErrorState message="Không tải được chi tiết phiếu." onRetry={() => refetch()} />
        </Box>
      )}
      {sale && <PanelContent key={sale.id} sale={sale} onClose={onClose} />}
    </>
  );

  if (variant === 'drawer') {
    return (
      <Drawer
        anchor="right"
        open
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 }, maxWidth: '100%', boxSizing: 'border-box' } }}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: `${uiTokens.radius.panel}px`, width: 380, flexShrink: 0, alignSelf: 'flex-start', boxShadow: uiTokens.shadow.panel }}
    >
      {body}
    </Paper>
  );
}

function PanelContent({ sale, onClose }: { sale: LatexSaleFull; onClose: () => void }) {
  const { data: latexTypes } = useLatexTypes();
  const approveMutation = useApproveLatexSale();
  const cancelMutation = useCancelLatexSale();

  function labelFor(code: string): string {
    return latexTypes?.find((t) => t.code === code)?.label ?? code;
  }

  return (
    <Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', p: 2.5, pb: 1.5 }}>
        <Box>
          <Typography variant="h3">{sale.teamName}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{formatDateWithWeekday(sale.recordDate)}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Đóng">
          <CloseOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>

      <Stack direction="row" sx={{ px: 2.5, pb: 2 }}>
        <StatusBadge label={LATEX_SALE_STATUS_LABEL[sale.status] ?? sale.status} tone={STATUS_TONE[sale.status] ?? 'neutral'} />
      </Stack>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ ...eyebrowSx, mb: 1 }}>Thông tin giao dịch</Typography>
        <Stack spacing={0.75}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13 }} color="text.secondary">Người mua</Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{sale.buyerName || '—'}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13 }} color="text.secondary">Người ký bán</Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{sale.sellerSignedBy || '—'}</Typography>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ ...eyebrowSx, mb: 1 }}>Khối lượng theo loại mủ</Typography>
        <Stack spacing={1}>
          {sale.items.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Không có dữ liệu.</Typography>
          ) : (
            sale.items.map((item) => (
              <Stack key={item.latexTypeId} direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13.5 }}>{labelFor(item.latexTypeCode)}</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(item.kg)} kg{item.drcPercent != null ? ` · DRC ${item.drcPercent}%` : ''}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      {sale.notes && (
        <Box sx={{ px: 2.5, pb: 2 }}>
          <Typography sx={{ ...eyebrowSx, mb: 1 }}>Ghi chú</Typography>
          <Typography sx={{ fontSize: 13 }}>{sale.notes}</Typography>
        </Box>
      )}

      {sale.status === 'DRAFT' && (
        <Stack direction="row" spacing={1.5} sx={{ px: 2.5, pb: 2.5 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={<CheckOutlinedIcon />}
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(sale.id)}
          >
            Duyệt phiếu
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<BlockOutlinedIcon />}
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate(sale.id)}
          >
            Hủy
          </Button>
        </Stack>
      )}

      <Box sx={{ px: 2.5, pb: 2.5, pt: sale.status === 'DRAFT' ? 0 : 1, borderTop: `1px solid ${neutral[200]}` }}>
        <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>Lịch sử chỉnh sửa</Typography>
        <EditHistoryTimeline tableName="latex_sales" recordId={sale.id} />
      </Box>
    </Stack>
  );
}
