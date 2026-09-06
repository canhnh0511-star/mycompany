import { useEffect, useRef, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { LoadingButton } from '../../../../components/common/LoadingButton';
import { DecimalField } from '../../../../components/common/DecimalField';
import { LoadingSkeleton } from '../../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../../components/feedback/WidgetEmptyState';
import { useEmployees, useLatexTypes } from '../../../../hooks/useLookups';
import { amber, borderStrong, neutral, red, tableHeader, tableRow, text } from '../../../../theme/colors';
import { ApiError } from '../../../../api/client';
import { useCreateProductionRecordsBatch, useProductionRecordsByTeamAndDate, useUpdateProductionRecord } from '../../hooks/useProductionRecords';
import { parseLowConfidenceFields } from '../../utils/ocrParsing';
import type { ProductionItemDraft, ProductionRowDraft } from '../../model/dailyEntry.types';
import type { CreateProductionRecordInput, ProductionRecordResult, UpdateProductionRecordInput } from '../../api/productionRecords.api';
import type { EmployeeOption } from '../../../../api/lookups.api';
import type { LatexTypeOption } from '../../../../api/lookups.api';

const cellSx = { verticalAlign: 'top', py: 1 } as const;
const numColSx = { minWidth: 88 } as const;

function isRowEmpty(items: ProductionItemDraft[], notes: string): boolean {
  return items.every((item) => !item.kg) && !notes.trim();
}

function buildRow(employee: EmployeeOption, latexTypes: LatexTypeOption[], record: ProductionRecordResult | undefined): ProductionRowDraft {
  const items: ProductionItemDraft[] = latexTypes.map((type) => {
    const existing = record?.items.find((i) => i.latexTypeId === type.id);
    return {
      latexTypeId: type.id,
      kg: existing ? String(existing.kg) : '',
      drcPercent: existing?.drcPercent != null ? String(existing.drcPercent) : '',
    };
  });
  const notes = record?.notes ?? '';
  const parsed = parseLowConfidenceFields(record?.lowConfidenceFields ?? null, latexTypes);
  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    recordId: record?.id ?? null,
    notes,
    items,
    isAbsent: isRowEmpty(items, notes),
    nameFlagged: parsed.nameFlagged,
    flaggedLatexTypeIds: parsed.flaggedLatexTypeIds,
    genericValueFlagged: parsed.genericValueFlagged,
    // Dòng đã có `recordId` nghĩa là ĐÃ tồn tại thật trong DB (tạo qua OCR hoặc lưu tay trước đó) —
    // phải hiện "Đã lưu" ngay từ đầu, không phải "Chưa lưu" (chỉ đúng cho dòng thật sự chưa có
    // record nào). Phát hiện qua live test: bảng roster load lại data cũ từ OCR vẫn hiện "Chưa lưu"
    // dù đã nằm sẵn trong DB, gây hiểu lầm Admin tưởng chưa lưu gì.
    rowStatus: record ? 'saved' : 'idle',
    rowIndex: record?.rowIndex ?? null,
  };
}

/** Sắp bảng khớp đúng thứ tự dòng trong ảnh gốc (rowIndex) thay vì thứ tự tạo nhân viên trong hệ
 * thống — dễ đối chiếu bằng mắt (phản hồi trực tiếp). Dòng chưa có rowIndex (chưa từng xuất hiện
 * trong ảnh nào — nhập tay thuần hoặc thật sự chưa có dữ liệu) xếp CUỐI, theo tên. */
function sortRowsLikePhoto(rows: ProductionRowDraft[]): ProductionRowDraft[] {
  return [...rows].sort((a, b) => {
    if (a.rowIndex != null && b.rowIndex != null) return a.rowIndex - b.rowIndex;
    if (a.rowIndex != null) return -1;
    if (b.rowIndex != null) return 1;
    return a.employeeName.localeCompare(b.employeeName, 'vi');
  });
}

/**
 * Bảng roster CỐ ĐỊNH theo Tổ đã chọn (mockup đã duyệt, thay thế `ProductionManualEntryTable` +
 * `ProductionDraftReviewTable` của Đợt 1a/1b cũ) — số dòng = số công nhân active của Tổ, KHÔNG
 * thêm/xóa dòng. Nhập tay và OCR cùng đổ vào 1 dòng theo `employeeId`: dòng chưa có `recordId` gộp
 * vào `POST batch` lúc "Lưu tất cả", dòng đã có `recordId` mà bị sửa thì `PATCH` riêng dòng đó —
 * ẩn hẳn khỏi UI sự khác biệt này, người dùng chỉ thấy 1 hành động "Lưu".
 *
 * Dữ liệu server (roster + record hiện có) chỉ merge vào 1 dòng khi dòng đó CHƯA bị người dùng gõ
 * tay (`dirtyEmployeeIds`) — để ảnh OCR mới xử lý xong tự điền vào đúng dòng còn "sạch" mà không ghi
 * đè dòng người dùng đang gõ dở ở chỗ khác (CLAUDE.md §5: "bảng kết quả CÓ THỂ CHỈNH SỬA — đọc trực
 * tiếp từ draft row", nhưng vẫn phải tôn trọng chỉnh sửa tại chỗ chưa lưu).
 */
export function ProductionRosterTable({
  teamId,
  recordDate,
  mismatchedLatexTypeCodes = [],
}: {
  teamId: string;
  recordDate: string;
  /** `latexTypeCode` của các cột đang có cảnh báo "Lệch tổng" (TOTAL_MISMATCH) đang OPEN — tô cả
   * CỘT (không phải 1 ô cụ thể, vì không biết chắc dòng nào sai — có thể do cộng tay sai ở giấy gốc
   * hoặc OCR đọc nhầm 1 dòng bất kỳ trong cột) để Admin biết đúng cột nào cần đối chiếu kỹ với ảnh
   * (phản hồi trực tiếp: "phát hiện lệch tổng nhưng không highlight ô nào gây lệch"). */
  mismatchedLatexTypeCodes?: string[];
}) {
  const { data: employees, isLoading: loadingEmployees } = useEmployees({ teamId, status: 'ACTIVE' });
  const { data: latexTypes, isLoading: loadingLatexTypes } = useLatexTypes();
  const { data: records, isLoading: loadingRecords, isError, refetch } = useProductionRecordsByTeamAndDate(teamId, recordDate);
  const batchMutation = useCreateProductionRecordsBatch();
  const updateMutation = useUpdateProductionRecord();

  const [rows, setRows] = useState<ProductionRowDraft[]>([]);
  const dirtyEmployeeIds = useRef<Set<string>>(new Set());
  const rosterKey = `${teamId}|${recordDate}`;
  const prevRosterKey = useRef(rosterKey);

  useEffect(() => {
    if (!employees || !latexTypes || !records) return;
    const rosterChanged = prevRosterKey.current !== rosterKey;
    if (rosterChanged) {
      dirtyEmployeeIds.current = new Set();
      prevRosterKey.current = rosterKey;
    }
    const recordByEmployee = new Map(records.content.map((r) => [r.employeeId, r]));
    setRows((prev) => {
      const prevByEmployee = new Map(prev.map((r) => [r.employeeId, r]));
      const built = employees.map((employee) => {
        if (!rosterChanged && dirtyEmployeeIds.current.has(employee.id)) {
          // Dòng người dùng đang gõ dở — giữ nguyên state cục bộ, không ghi đè bằng dữ liệu server.
          return prevByEmployee.get(employee.id) ?? buildRow(employee, latexTypes, recordByEmployee.get(employee.id));
        }
        return buildRow(employee, latexTypes, recordByEmployee.get(employee.id));
      });
      return sortRowsLikePhoto(built);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, latexTypes, records, rosterKey]);

  function updateItem(employeeId: string, itemIndex: number, patch: Partial<ProductionItemDraft>) {
    dirtyEmployeeIds.current.add(employeeId);
    setRows((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId
          ? { ...row, items: row.items.map((item, i) => (i === itemIndex ? { ...item, ...patch } : item)) }
          : row,
      ),
    );
  }

  async function handleSaveAll() {
    if (!latexTypes) return;

    const createInputs: { employeeId: string; body: CreateProductionRecordInput }[] = [];
    const updateInputs: { employeeId: string; id: string; body: UpdateProductionRecordInput }[] = [];

    for (const row of rows) {
      // Dòng đã có `recordId` (đã lưu từ trước, kể cả do OCR tạo) mà người dùng CHƯA đụng gì trong
      // phiên này thì bỏ qua — tránh PATCH lại y nguyên dữ liệu không đổi cho mọi dòng mỗi lần bấm
      // "Lưu tất cả" (phát hiện qua live test: dòng cũ vẫn bị gửi lại dù không sửa gì).
      if (row.recordId && !dirtyEmployeeIds.current.has(row.employeeId)) continue;

      const cleanItems = latexTypes
        .map((type, i) => {
          const raw = row.items[i];
          const kg = Number(raw?.kg);
          if (!raw?.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcRaw = raw.drcPercent;
          const drcPercent = type.code === 'water' && drcRaw ? Number(drcRaw) : null;
          return { latexTypeId: type.id, kg, drcPercent };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (cleanItems.length === 0) continue; // dòng trống — không tạo/sửa gì, bỏ qua hoàn toàn.

      const body = { recordDate, employeeId: row.employeeId, notes: row.notes.trim() || null, items: cleanItems };
      if (row.recordId) {
        updateInputs.push({ employeeId: row.employeeId, id: row.recordId, body });
      } else {
        createInputs.push({ employeeId: row.employeeId, body });
      }
    }

    if (createInputs.length === 0 && updateInputs.length === 0) return;

    setRows((prev) =>
      prev.map((row) =>
        createInputs.some((c) => c.employeeId === row.employeeId) || updateInputs.some((u) => u.employeeId === row.employeeId)
          ? { ...row, rowStatus: 'pending', rowError: undefined }
          : row,
      ),
    );

    // Tách riêng 2 nhóm promise (kiểu trả về khác nhau — batch trả `BatchResult`, update trả 1
    // `ProductionRecordResult`) thay vì gộp chung 1 mảng `Promise.allSettled` không đồng nhất kiểu.
    const [batchOutcome, updateOutcomes] = await Promise.all([
      createInputs.length > 0
        ? batchMutation.mutateAsync(createInputs.map((c) => c.body)).then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason: unknown) => ({ status: 'rejected' as const, reason }),
          )
        : null,
      Promise.allSettled(updateInputs.map((u) => updateMutation.mutateAsync({ id: u.id, body: u.body }))),
    ]);

    setRows((prev) =>
      prev.map((row) => {
        const createIndex = createInputs.findIndex((c) => c.employeeId === row.employeeId);
        if (createIndex !== -1) {
          dirtyEmployeeIds.current.delete(row.employeeId);
          if (!batchOutcome || batchOutcome.status === 'rejected') {
            const reason = batchOutcome?.reason;
            return { ...row, rowStatus: 'error', rowError: reason instanceof ApiError ? reason.message : 'Lưu thất bại' };
          }
          const item = batchOutcome.value.results[createIndex];
          if (!item) return { ...row, rowStatus: 'error', rowError: 'Lưu thất bại' };
          return item.success
            ? { ...row, rowStatus: 'saved', rowError: undefined }
            : { ...row, rowStatus: 'error', rowError: item.error ?? 'Lỗi không xác định' };
        }
        const updateIndex = updateInputs.findIndex((u) => u.employeeId === row.employeeId);
        if (updateIndex !== -1) {
          dirtyEmployeeIds.current.delete(row.employeeId);
          const outcome = updateOutcomes[updateIndex];
          if (outcome.status === 'fulfilled') return { ...row, rowStatus: 'saved', rowError: undefined };
          const reason = outcome.reason;
          return { ...row, rowStatus: 'error', rowError: reason instanceof ApiError ? reason.message : 'Lỗi không xác định' };
        }
        return row;
      }),
    );
  }

  const isLoading = loadingEmployees || loadingLatexTypes || loadingRecords;
  // Đếm đúng số dòng THỰC SỰ sẽ được gửi đi lúc bấm "Lưu tất cả" — dòng mới có dữ liệu (`recordId`
  // null), hoặc dòng cũ đã bị sửa trong phiên này (`dirtyEmployeeIds`); dòng cũ y nguyên không tính
  // (không PATCH lại vô ích — cùng sửa với `handleSaveAll`).
  const dirtyOrPendingCount = rows.filter(
    (r) => !isRowEmpty(r.items, r.notes) && (!r.recordId || dirtyEmployeeIds.current.has(r.employeeId)),
  ).length;

  if (isLoading) return <LoadingSkeleton rows={4} rowHeight={36} />;
  if (isError) return <WidgetErrorState message="Không tải được danh sách công nhân/sản lượng." onRetry={() => refetch()} />;
  if (!employees || employees.length === 0) {
    return <WidgetEmptyState title="Tổ này chưa có công nhân" description="Thêm công nhân cho Tổ trước khi nhập phiếu." />;
  }
  if (!latexTypes) return null;

  const totals = latexTypes.map((type) =>
    rows.reduce((sum, row) => {
      const item = row.items.find((i) => i.latexTypeId === type.id);
      const kg = Number(item?.kg);
      return sum + (Number.isNaN(kg) ? 0 : kg);
    }, 0),
  );

  const mismatchedCodes = new Set(mismatchedLatexTypeCodes);
  // OCR giờ tự đối chiếu tổng cột lúc đọc (ClaudeOcrService prompt) — nếu tìm được đúng dòng nghi
  // ngờ, dòng đó đã nằm sẵn trong `flaggedLatexTypeIds` (cùng cơ chế "kg:cup" đã có). Cột nào có
  // TOTAL_MISMATCH nhưng KHÔNG dòng nào được OCR chỉ đích danh → không xác định được dòng cụ thể
  // (nhiều khả năng phiếu giấy tự cộng tay sai, không phải OCR đọc nhầm) → mới fallback tô cả cột
  // (phản hồi: "highlight cả cột... có thể bổ sung xác định đúng dòng không").
  const pinpointedEmployeeIdsByCode = new Map<string, Set<string>>();
  for (const type of latexTypes) {
    if (!mismatchedCodes.has(type.code)) continue;
    const ids = new Set(rows.filter((r) => r.flaggedLatexTypeIds.includes(type.id)).map((r) => r.employeeId));
    if (ids.size > 0) pinpointedEmployeeIdsByCode.set(type.code, ids);
  }
  const columnFallback = (code: string) => mismatchedCodes.has(code) && !pinpointedEmployeeIdsByCode.has(code);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 44, bgcolor: tableHeader.sub }}>STT</TableCell>
              <TableCell sx={{ minWidth: 180, bgcolor: tableHeader.sub }}>Tên công nhân</TableCell>
              {latexTypes.map((type) => {
                const pinpointed = pinpointedEmployeeIdsByCode.has(type.code);
                const fallback = columnFallback(type.code);
                return (
                  <TableCell
                    key={type.id}
                    align="right"
                    sx={{ ...numColSx, bgcolor: fallback ? red[50] : tableHeader.sub, color: fallback ? red[700] : undefined }}
                  >
                    {fallback ? (
                      <Tooltip title="Lệch tổng nhưng không xác định được đúng dòng nào — có thể phiếu giấy tự cộng tay sai. Đối chiếu lại cả cột với ảnh.">
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <ErrorOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                          {type.label} ({type.unit})
                        </Box>
                      </Tooltip>
                    ) : pinpointed ? (
                      <Tooltip title="Lệch tổng — OCR đã xác định đúng ô nghi ngờ, xem ô tô vàng bên dưới thay vì cả cột.">
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'warning.dark' }}>
                          <ErrorOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                          {type.label} ({type.unit})
                        </Box>
                      </Tooltip>
                    ) : (
                      `${type.label} (${type.unit})`
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={row.employeeId}
                sx={{
                  bgcolor: row.isAbsent ? neutral[50] : rowIndex % 2 === 1 ? tableRow.zebra : 'background.paper',
                  '&:hover': { bgcolor: tableRow.hover },
                }}
              >
                <TableCell sx={cellSx}>{rowIndex + 1}</TableCell>
                <TableCell sx={cellSx}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: row.isAbsent ? text.secondary : text.primary }}>
                      {row.employeeName}
                    </Typography>
                    {row.isAbsent && <Typography sx={{ fontSize: 11, color: text.muted }}>nghỉ / không cạo</Typography>}
                    {row.nameFlagged && (
                      <Typography sx={{ fontSize: 11, color: 'warning.dark' }}>OCR đọc tên chưa chắc</Typography>
                    )}
                  </Box>
                  {row.rowStatus === 'error' && row.rowError && (
                    <Typography sx={{ fontSize: 11, color: 'error.main', mt: 0.5 }}>{row.rowError}</Typography>
                  )}
                </TableCell>
                {latexTypes.map((type, itemIndex) => {
                  const flagged = row.genericValueFlagged || row.flaggedLatexTypeIds.includes(type.id);
                  const fallback = columnFallback(type.code);
                  return (
                    <TableCell key={type.id} sx={{ ...cellSx, ...(fallback ? { bgcolor: red[50] } : null) }}>
                      <DecimalField
                        size="small"
                        placeholder="—"
                        value={row.items[itemIndex]?.kg ?? ''}
                        onValueChange={(kg) => updateItem(row.employeeId, itemIndex, { kg })}
                        sx={{
                          ...numColSx,
                          '& input': { textAlign: 'right' },
                          ...(flagged
                            ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' }, bgcolor: amber[50] }
                            : row.isAbsent
                              ? { '& .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' } }
                              : null),
                        }}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& td': { borderTop: `2px solid ${borderStrong}`, fontWeight: 700 } }}>
              <TableCell colSpan={2}>Tổng cộng</TableCell>
              {totals.map((total, i) => (
                <TableCell
                  key={latexTypes[i].id}
                  align="right"
                  sx={{ ...numColSx, ...(columnFallback(latexTypes[i].code) ? { bgcolor: red[50], color: red[700] } : null) }}
                >
                  {total.toLocaleString('vi-VN')}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2.5, py: 2, mt: 'auto' }}>
        <LoadingButton
          variant="contained"
          color="success"
          loading={batchMutation.isPending || updateMutation.isPending}
          disabled={dirtyOrPendingCount === 0}
          onClick={handleSaveAll}
        >
          {`Lưu tất cả (${dirtyOrPendingCount} dòng)`}
        </LoadingButton>
      </Box>
    </Box>
  );
}
