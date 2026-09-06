import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DecimalField } from '../../../components/common/DecimalField';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { ApiError } from '../../../api/client';
import { neutral } from '../../../theme/colors';
import { useLatexTypes } from '../../../hooks/useLookups';
import {
  useCreateLatexSalesBatch,
  useLatexSalesByTeamAndDate,
  useUpdateLatexSale,
} from '../hooks/useLatexSales';
import type { LatexSaleFull } from '../api/latexSales.api';
import type { SaleItemDraft, SaleRowDraft, SaleRowStatus } from '../model/latexSaleEntry.types';
import type { LatexTypeOption } from '../../../api/lookups.api';

const STATUS_LABEL: Record<SaleRowStatus, string> = { idle: 'Chưa lưu', pending: 'Đang lưu…', saved: 'Đã lưu', error: 'Lỗi' };
const STATUS_TONE: Record<SaleRowStatus, 'neutral' | 'info' | 'success' | 'error'> = {
  idle: 'neutral',
  pending: 'info',
  saved: 'success',
  error: 'error',
};

function emptyItems(latexTypes: LatexTypeOption[]): SaleItemDraft[] {
  return latexTypes.map((t) => ({ latexTypeId: t.id, kg: '', drcPercent: '' }));
}

function fromServer(sale: LatexSaleFull, latexTypes: LatexTypeOption[]): SaleRowDraft {
  const items = latexTypes.map((t) => {
    const existing = sale.items.find((i) => i.latexTypeId === t.id);
    return { latexTypeId: t.id, kg: existing ? String(existing.kg) : '', drcPercent: existing?.drcPercent != null ? String(existing.drcPercent) : '' };
  });
  return {
    draftKey: sale.id,
    id: sale.id,
    buyerName: sale.buyerName ?? '',
    sellerSignedBy: sale.sellerSignedBy ?? '',
    notes: sale.notes ?? '',
    items,
    status: 'saved',
  };
}

/**
 * Danh sách thẻ "phiếu bán mủ" cho 1 Tổ + 1 ngày — KHÔNG phải bảng roster cố định (xem
 * `model/latexSaleEntry.types.ts`). OCR (ảnh bên phải, `ScanBatchPhotoPanel`) tự thêm thẻ mới khi
 * đọc xong 1 ảnh; người dùng có thể "+ Thêm phiếu" để nhập tay, hoặc sửa trực tiếp thẻ do OCR tạo.
 */
export function LatexSaleEntryPanel({ teamId, recordDate }: { teamId: string; recordDate: string }) {
  const { data: latexTypes, isLoading: loadingTypes } = useLatexTypes();
  const { data: sales, isLoading: loadingSales, isError, refetch } = useLatexSalesByTeamAndDate(teamId, recordDate);
  const batchMutation = useCreateLatexSalesBatch();
  const updateMutation = useUpdateLatexSale();

  const [rows, setRows] = useState<SaleRowDraft[]>([]);
  const dirtyKeys = useRef<Set<string>>(new Set());
  const rosterKey = `${teamId}|${recordDate}`;
  const prevKey = useRef(rosterKey);

  useEffect(() => {
    if (!latexTypes || !sales) return;
    const keyChanged = prevKey.current !== rosterKey;
    if (keyChanged) {
      dirtyKeys.current = new Set();
      prevKey.current = rosterKey;
    }
    setRows((prev) => {
      const prevByKey = new Map(prev.map((r) => [r.draftKey, r]));
      const serverRows = sales.content.map((sale) => {
        if (!keyChanged && dirtyKeys.current.has(sale.id)) return prevByKey.get(sale.id) ?? fromServer(sale, latexTypes);
        return fromServer(sale, latexTypes);
      });
      // Giữ lại các thẻ nhập tay CHƯA lưu (id=null, không có ở server) — không bị mất khi refetch.
      const unsavedNew = keyChanged ? [] : prev.filter((r) => r.id === null);
      return [...serverRows, ...unsavedNew];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexTypes, sales, rosterKey]);

  function addRow() {
    if (!latexTypes) return;
    const draftKey = crypto.randomUUID();
    setRows((prev) => [
      ...prev,
      { draftKey, id: null, buyerName: '', sellerSignedBy: '', notes: '', items: emptyItems(latexTypes), status: 'idle' },
    ]);
  }

  function removeRow(draftKey: string) {
    setRows((prev) => prev.filter((r) => r.draftKey !== draftKey));
    dirtyKeys.current.delete(draftKey);
  }

  function updateRow(draftKey: string, patch: Partial<SaleRowDraft>) {
    dirtyKeys.current.add(draftKey);
    setRows((prev) => prev.map((r) => (r.draftKey === draftKey ? { ...r, ...patch } : r)));
  }

  function updateItem(draftKey: string, itemIndex: number, patch: Partial<SaleItemDraft>) {
    dirtyKeys.current.add(draftKey);
    setRows((prev) =>
      prev.map((r) =>
        r.draftKey === draftKey ? { ...r, items: r.items.map((it, i) => (i === itemIndex ? { ...it, ...patch } : it)) } : r,
      ),
    );
  }

  async function handleSaveAll() {
    if (!latexTypes) return;
    const dirtyRows = rows.filter((r) => dirtyKeys.current.has(r.draftKey) || r.id === null);
    const toSave = dirtyRows.filter((r) => r.items.some((i) => i.kg) || r.buyerName.trim() || r.sellerSignedBy.trim());
    if (toSave.length === 0) return;

    setRows((prev) => prev.map((r) => (toSave.some((s) => s.draftKey === r.draftKey) ? { ...r, status: 'pending', error: undefined } : r)));

    const buildBody = (row: SaleRowDraft) => ({
      recordDate,
      teamId,
      buyerName: row.buyerName.trim() || null,
      sellerSignedBy: row.sellerSignedBy.trim() || null,
      notes: row.notes.trim() || null,
      items: latexTypes
        .map((type, i) => {
          const raw = row.items[i];
          const kg = Number(raw?.kg);
          if (!raw?.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcPercent = type.code === 'water' && raw.drcPercent ? Number(raw.drcPercent) : null;
          return { latexTypeId: type.id, kg, drcPercent };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    });

    const creates = toSave.filter((r) => r.id === null);
    const updates = toSave.filter((r) => r.id !== null);

    const [createOutcome, updateOutcomes] = await Promise.all([
      creates.length > 0
        ? batchMutation.mutateAsync(creates.map(buildBody)).then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason: unknown) => ({ status: 'rejected' as const, reason }),
          )
        : null,
      Promise.allSettled(updates.map((r) => updateMutation.mutateAsync({ id: r.id as string, body: buildBody(r) }))),
    ]);

    setRows((prev) =>
      prev.map((row) => {
        const createIndex = creates.findIndex((c) => c.draftKey === row.draftKey);
        if (createIndex !== -1) {
          const item = createOutcome && createOutcome.status === 'fulfilled' ? createOutcome.value.results[createIndex] : null;
          if (!item) return { ...row, status: 'error', error: 'Lưu thất bại' };
          dirtyKeys.current.delete(row.draftKey);
          return item.success ? { ...row, status: 'saved', error: undefined } : { ...row, status: 'error', error: item.error ?? 'Lỗi không xác định' };
        }
        const updateIndex = updates.findIndex((u) => u.draftKey === row.draftKey);
        if (updateIndex !== -1) {
          const outcome = updateOutcomes[updateIndex];
          dirtyKeys.current.delete(row.draftKey);
          if (outcome.status === 'fulfilled') return { ...row, status: 'saved', error: undefined };
          return { ...row, status: 'error', error: outcome.reason instanceof ApiError ? outcome.reason.message : 'Lỗi không xác định' };
        }
        return row;
      }),
    );
  }

  const isLoading = loadingTypes || loadingSales;
  const dirtyCount = rows.filter((r) => (dirtyKeys.current.has(r.draftKey) || r.id === null) && (r.items.some((i) => i.kg) || r.buyerName.trim())).length;

  if (isLoading) return <LoadingSkeleton rows={3} rowHeight={100} />;
  if (isError) return <WidgetErrorState message="Không tải được danh sách phiếu bán mủ." onRetry={() => refetch()} />;
  if (!latexTypes) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack spacing={2} sx={{ p: 2.5, flex: 1 }}>
        {rows.length === 0 && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Chưa có phiếu bán mủ nào cho Tổ/ngày này. Tải ảnh phiếu hoặc bấm "Thêm phiếu" để nhập tay.
          </Typography>
        )}
        {rows.map((row) => (
          <Box key={row.draftKey} sx={{ border: `1px solid ${neutral[200]}`, borderRadius: '10px', p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <StatusBadge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />
              <IconButton size="small" aria-label="Xóa phiếu" onClick={() => removeRow(row.draftKey)}>
                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
              <TextField
                label="Người mua"
                size="small"
                fullWidth
                value={row.buyerName}
                onChange={(event) => updateRow(row.draftKey, { buyerName: event.target.value })}
              />
              <TextField
                label="Người ký bán"
                size="small"
                fullWidth
                value={row.sellerSignedBy}
                onChange={(event) => updateRow(row.draftKey, { sellerSignedBy: event.target.value })}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
              {latexTypes.map((type, itemIndex) => (
                <DecimalField
                  key={type.id}
                  label={`${type.label} (kg)`}
                  size="small"
                  value={row.items[itemIndex]?.kg ?? ''}
                  onValueChange={(kg) => updateItem(row.draftKey, itemIndex, { kg })}
                  sx={{ width: 140 }}
                />
              ))}
            </Stack>
            <TextField
              label="Ghi chú"
              size="small"
              fullWidth
              value={row.notes}
              onChange={(event) => updateRow(row.draftKey, { notes: event.target.value })}
            />
            {row.status === 'error' && row.error && (
              <Typography sx={{ fontSize: 12, color: 'error.main', mt: 1 }}>{row.error}</Typography>
            )}
          </Box>
        ))}

        <LoadingButton variant="outlined" startIcon={<AddOutlinedIcon />} onClick={addRow} sx={{ alignSelf: 'flex-start' }}>
          Thêm phiếu
        </LoadingButton>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2.5, py: 2, mt: 'auto', borderTop: `1px solid ${neutral[200]}` }}>
        <LoadingButton
          variant="contained"
          color="success"
          loading={batchMutation.isPending || updateMutation.isPending}
          disabled={dirtyCount === 0}
          onClick={handleSaveAll}
        >
          {`Lưu tất cả (${dirtyCount} phiếu)`}
        </LoadingButton>
      </Box>
    </Box>
  );
}
