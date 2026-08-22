import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { ErrorState, getErrorMessage } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { useEmployeesLookupQuery, useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { latexSalesApi } from '@/features/latex-sales/api';
import { useLatexSalesListQuery } from '@/features/latex-sales/useLatexSalesList';
import { productionRecordsApi } from '@/features/production-records/api';
import { useProductionRecordsListQuery } from '@/features/production-records/useProductionRecordsList';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryClient';
import type {
  BatchStatus,
  ConflictType,
  ImageStatus,
  LatexItemResponse,
  LatexTypeResponse,
  OcrUnmatchedLine,
  ScanBatchConflictResponse,
  ScanBatchResponse,
  ScanImageResponse,
} from '@/types/api';
import { scanBatchApi } from './api';

function batchStatusLabel(status: BatchStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Mới tạo';
    case 'UPLOADING':
      return 'Đang tải ảnh…';
    case 'PROCESSING':
      return 'Đang đọc ảnh…';
    case 'NEED_REVIEW':
      return 'Cần kiểm tra';
    case 'READY_TO_APPROVE':
      return 'Sẵn sàng xác nhận';
    case 'PARTIAL_FAILED':
      return 'Một số ảnh lỗi';
    case 'FAILED':
      return 'Lỗi toàn bộ';
    case 'APPROVED':
      return 'Đã xác nhận';
    case 'CANCELLED':
      return 'Đã hủy';
  }
}

function batchStatusTone(status: BatchStatus): StatusTone {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'PARTIAL_FAILED':
    case 'NEED_REVIEW':
      return 'warning';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'info';
  }
}

function imageStatusLabel(status: ImageStatus): string {
  switch (status) {
    case 'UPLOADING':
      return 'Đang tải lên';
    case 'PROCESSING':
      return 'Đang đọc';
    case 'ACTIVE':
      return 'OK';
    case 'FAILED':
      return 'Lỗi';
    case 'PENDING_MOVE':
      return 'Chờ chuyển ngày';
    case 'MOVED':
      return 'Đã chuyển';
    case 'REPLACED':
      return 'Đã thay bằng ảnh khác';
  }
}

function conflictTypeLabel(type: ConflictType): string {
  switch (type) {
    case 'DUPLICATE_IMAGE':
      return 'Ảnh trùng';
    case 'IMAGE_QUALITY_OR_OCR_FAILED':
      return 'Ảnh lỗi/không đọc được';
    case 'DATE_MISMATCH':
      return 'Ngày trên ảnh khác ngày phiên';
    case 'UNKNOWN_EMPLOYEE':
      return 'Không khớp tên nhân viên';
    case 'INVALID_BUSINESS_VALUE':
      return 'Số liệu bất thường';
    case 'POTENTIAL_DUPLICATE_OCR_ROW':
      return 'Có thể trùng bản ghi đã có';
    case 'PENDING_MOVE':
      return 'Đang chờ chuyển sang phiếu bổ sung';
    case 'OTHER':
      return 'Cần chú ý';
  }
}

function parseDetail<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function genericDetailText(raw: string | null): string | null {
  const parsed = parseDetail<Record<string, unknown>>(raw);
  if (!parsed) return null;
  const parts: string[] = [];
  if (typeof parsed.employeeName === 'string') parts.push(`Nhân viên: ${parsed.employeeName}`);
  if (typeof parsed.reason === 'string') parts.push(reasonLabel(parsed.reason));
  if (typeof parsed.errorMessage === 'string' && parsed.errorMessage !== 'null') parts.push(parsed.errorMessage);
  if (typeof parsed.mismatchReason === 'string' && parsed.mismatchReason !== 'null') parts.push(parsed.mismatchReason);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'contentHash trùng ảnh khác đang active trong cùng phiên':
      return 'Ảnh này giống hệt 1 ảnh khác đã chụp trong phiên';
    case 'ocr_call_failed':
      return 'Gọi AI đọc ảnh thất bại';
    case 'type_mismatch':
      return 'Ảnh không khớp loại phiếu đã chọn';
    case 'kg/DRC ngoài khoảng hợp lệ':
      return 'Khối lượng/DRC ngoài khoảng hợp lệ';
    case 'đã có bản ghi sản lượng active khác cho nhân viên/ngày này':
      return 'Đã có bản ghi khác cho nhân viên/ngày này';
    default:
      return reason;
  }
}

interface ItemFieldValue {
  kg: string;
  drcPercent: string;
}

function itemsToFieldValues(items: LatexItemResponse[], latexTypes: LatexTypeResponse[]): ItemFieldValue[] {
  return latexTypes.map((type) => {
    const found = items.find((i) => i.latexTypeId === type.id);
    return { kg: found ? String(found.kg) : '', drcPercent: found?.drcPercent != null ? String(found.drcPercent) : '' };
  });
}

function parseLowConfidenceFields(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.fields) ? parsed.fields : [];
  } catch {
    return [];
  }
}

function matchesColumn(lowConfidence: string[], columnLabel: string): boolean {
  const needle = columnLabel.trim().toLowerCase();
  return lowConfidence.some((f) => f.trim().toLowerCase().includes(needle) || needle.includes(f.trim().toLowerCase()));
}

interface ValueColumn {
  key: string;
  label: string;
  typeIndex: number;
  field: 'kg' | 'drcPercent';
}

function buildColumns(latexTypes: LatexTypeResponse[]): ValueColumn[] {
  const columns: ValueColumn[] = [];
  latexTypes.forEach((type, i) => {
    columns.push({ key: `${type.id}-kg`, label: type.label, typeIndex: i, field: 'kg' });
    if (type.code === 'water') {
      columns.push({ key: `${type.id}-drc`, label: 'DRC', typeIndex: i, field: 'drcPercent' });
    }
  });
  return columns;
}

const NAME_COL_WIDTH = 128;
const VALUE_COL_WIDTH = 76;

function TableCell({ value, flagged, onChangeText }: { value: string; flagged: boolean; onChangeText: (v: string) => void }) {
  if (!flagged) {
    return (
      <AppText size="sm" className="font-mono">
        {value || '—'}
      </AppText>
    );
  }
  return (
    <Input className="border-[1.5px] border-warning bg-warning/10 min-h-8 px-2">
      <InputField keyboardType="decimal-pad" value={value} onChangeText={onChangeText} className="text-right text-sm" />
    </Input>
  );
}

/**
 * Màn Batch Review — 0021-scan-batch-model (Spec 1), thay thế `OcrReviewScreen.tsx` cũ (đọc theo model
 * batch/conflict thay vì response OCR của 1 ảnh đơn lẻ). Route riêng full-screen `/scan-batch-review/
 * [batchId]`. Nguồn sự thật là `GET /scan-batches/{id}` (ảnh + conflict) + `GET .../list?scanBatchId=`
 * (draft record thật, ADR-0012 — không dùng state tạm client).
 *
 * Bố cục: banner trạng thái batch (FAILED/PARTIAL_FAILED có [Thử lại]/[Hủy phiên]) → dải ảnh → danh
 * sách conflict (đã sort displayOrder từ backend, mỗi loại có hành động riêng — mục 6 Spec 1) → bảng
 * record có thể sửa (kg/DRC, chỉ ô OCR không chắc mới cho sửa — cùng pattern OcrReviewScreen cũ) →
 * nút "Xác nhận dữ liệu" (approve cả batch, gate theo `canApprove` backend đã tính sẵn).
 */
export function BatchReviewScreen({ batchId }: { batchId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();

  const {
    data: batch,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.scanBatches.detail(batchId),
    queryFn: () => scanBatchApi.get(batchId),
  });

  function applyResponse(response: ScanBatchResponse) {
    queryClient.setQueryData(queryKeys.scanBatches.detail(batchId), response);
    queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.all });
  }

  function handleActionError(err: unknown, fallbackTitle: string) {
    showToast({ title: fallbackTitle, description: getErrorMessage(err), variant: 'error' });
  }

  const retryImageMutation = useMutation({
    mutationFn: (imageId: string) => scanBatchApi.retryImage(imageId),
    onSuccess: applyResponse,
    onError: (err) => handleActionError(err, 'Thử lại ảnh thất bại'),
  });
  const retryBatchMutation = useMutation({
    mutationFn: () => scanBatchApi.retryBatch(batchId),
    onSuccess: applyResponse,
    onError: (err) => handleActionError(err, 'Thử lại phiên thất bại'),
  });
  const cancelBatchMutation = useMutation({
    mutationFn: () => scanBatchApi.cancel(batchId),
    onSuccess: (response) => {
      applyResponse(response);
      showToast({ title: 'Đã hủy phiên quét', variant: 'success' });
    },
    onError: (err) => handleActionError(err, 'Hủy phiên thất bại'),
  });
  const resolveDateMutation = useMutation({
    mutationFn: ({ imageId, resolution }: { imageId: string; resolution: 'KEEP_SESSION_DATE' | 'CHANGE_DATE' }) =>
      scanBatchApi.resolveDate(imageId, { resolution }),
    onSuccess: applyResponse,
    onError: (err) => handleActionError(err, 'Xử lý ngày thất bại'),
  });
  const resolveConflictMutation = useMutation({
    mutationFn: ({
      conflictId,
      action,
      employeeId,
    }: {
      conflictId: string;
      action: 'OVERRIDE' | 'DISCARD' | 'ASSIGN_EMPLOYEE';
      employeeId?: string | null;
    }) => scanBatchApi.resolveConflict(conflictId, { action, employeeId }),
    onSuccess: applyResponse,
    onError: (err) => handleActionError(err, 'Xử lý cảnh báo thất bại'),
  });
  const approveMutation = useMutation({
    mutationFn: () => scanBatchApi.approve(batchId),
    onSuccess: (response) => {
      applyResponse(response);
      showToast({ title: 'Đã xác nhận dữ liệu', variant: 'success' });
    },
    onError: (err) => handleActionError(err, 'Xác nhận thất bại'),
  });

  if (isLoading || !batch) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        {isError ? (
          <ErrorState message="Không tải được phiên quét." detail={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <LoadingState />
        )}
      </ScrollView>
    );
  }

  const isProduction = batch.documentType === 'PRODUCTION_RECORD';

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <Pressable onPress={() => router.back()}>
            <AppText size="sm" className="text-primary">
              ‹ Chụp ảnh
            </AppText>
          </Pressable>

          <HStack className="items-center justify-between">
            <VStack className="flex-1">
              <AppHeading size="lg">{isProduction ? 'Sổ ghi mủ' : 'Sổ bán mủ'}</AppHeading>
              <AppText size="sm" className="text-muted-foreground">
                {`${batch.teamName} · ${batch.workDate}${batch.batchType === 'SUPPLEMENT' ? ' · Bổ sung' : ''}`}
              </AppText>
            </VStack>
            <StatusBadge label={batchStatusLabel(batch.status)} tone={batchStatusTone(batch.status)} />
          </HStack>

          {batch.status === 'FAILED' || batch.status === 'PARTIAL_FAILED' ? (
            <Box className="border border-destructive rounded-md p-3 bg-destructive/10">
              <VStack space="sm">
                <AppText size="sm">
                  {batch.status === 'FAILED'
                    ? 'Toàn bộ ảnh trong phiên này đều lỗi.'
                    : 'Một số ảnh trong phiên này bị lỗi — cần xử lý trước khi xác nhận.'}
                </AppText>
                <HStack space="sm">
                  <AppButton
                    size="sm"
                    onPress={() => retryBatchMutation.mutate()}
                    isLoading={retryBatchMutation.isPending}
                    isDisabled={batch.status !== 'FAILED'}
                  >
                    Thử lại
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="destructive"
                    onPress={() => cancelBatchMutation.mutate()}
                    isLoading={cancelBatchMutation.isPending}
                  >
                    Hủy phiên
                  </AppButton>
                </HStack>
              </VStack>
            </Box>
          ) : null}

          {batch.status === 'APPROVED' ? (
            <Box className="border border-success rounded-md p-3 bg-success/10">
              <AppText size="sm">{`Đã xác nhận lúc ${batch.approvedAt ? new Date(batch.approvedAt).toLocaleString('vi-VN') : ''}.`}</AppText>
            </Box>
          ) : null}

          {batch.status === 'CANCELLED' ? (
            <Box className="border border-border rounded-md p-3 bg-muted">
              <AppText size="sm" className="text-muted-foreground">
                Phiên quét này đã bị hủy — mọi dữ liệu nháp liên quan cũng đã hủy theo.
              </AppText>
            </Box>
          ) : null}

          {batch.images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space="sm">
                {batch.images.map((image) => (
                  <ImageTile
                    key={image.id}
                    image={image}
                    onRetry={() => retryImageMutation.mutate(image.id)}
                    retrying={retryImageMutation.isPending && retryImageMutation.variables === image.id}
                  />
                ))}
              </HStack>
            </ScrollView>
          ) : null}

          {batch.conflicts.length > 0 ? (
            <VStack space="sm">
              <AppText size="xs" className="text-muted-foreground">
                {`Cần chú ý (${batch.conflicts.length})`}
              </AppText>
              {batch.conflicts.map((conflict) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  teamId={batch.teamId}
                  onResolveDate={(resolution) => resolveDateMutation.mutate({ imageId: conflict.scanImageId!, resolution })}
                  onResolveConflict={(action, employeeId) =>
                    resolveConflictMutation.mutate({ conflictId: conflict.id, action, employeeId })
                  }
                  onRetryImage={() => retryImageMutation.mutate(conflict.scanImageId!)}
                  busy={resolveDateMutation.isPending || resolveConflictMutation.isPending || retryImageMutation.isPending}
                />
              ))}
            </VStack>
          ) : null}

          {isProduction ? (
            <ProductionRecordsTable batchId={batch.id} />
          ) : (
            <LatexSalesTable batchId={batch.id} />
          )}
        </VStack>
      </ScrollView>

      <Box className="p-4 border-t border-border bg-background">
        <AppButton
          size="lg"
          onPress={() => approveMutation.mutate()}
          isLoading={approveMutation.isPending}
          isDisabled={!batch.canApprove}
        >
          {batch.status === 'APPROVED' ? 'Đã xác nhận' : 'Xác nhận dữ liệu'}
        </AppButton>
      </Box>
    </VStack>
  );
}

function ImageTile({ image, onRetry, retrying }: { image: ScanImageResponse; onRetry: () => void; retrying: boolean }) {
  const borderColor =
    image.status === 'ACTIVE' || image.status === 'MOVED'
      ? '#9FD3C4'
      : image.status === 'FAILED'
        ? '#E7B3AC'
        : 'rgba(0,0,0,.15)';
  return (
    <VStack space="xs" style={{ width: 72 }}>
      <Box className="rounded-md overflow-hidden" style={{ width: 72, height: 92, borderWidth: 2, borderColor }}>
        <Image source={{ uri: image.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </Box>
      <AppText size="xs" className="text-center text-muted-foreground" numberOfLines={1}>
        {imageStatusLabel(image.status)}
      </AppText>
      {image.status === 'FAILED' ? (
        <AppButton size="sm" variant="outline" onPress={onRetry} isLoading={retrying}>
          Thử lại
        </AppButton>
      ) : null}
    </VStack>
  );
}

function ConflictCard({
  conflict,
  teamId,
  onResolveDate,
  onResolveConflict,
  onRetryImage,
  busy,
}: {
  conflict: ScanBatchConflictResponse;
  teamId: string;
  onResolveDate: (resolution: 'KEEP_SESSION_DATE' | 'CHANGE_DATE') => void;
  onResolveConflict: (action: 'OVERRIDE' | 'DISCARD' | 'ASSIGN_EMPLOYEE', employeeId?: string | null) => void;
  onRetryImage: () => void;
  busy: boolean;
}) {
  const { data: employees } = useEmployeesLookupQuery({ teamId, status: 'ACTIVE' });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const isOpen = conflict.status === 'OPEN';
  const tone: StatusTone = conflict.status === 'OPEN' ? (conflict.blocking ? 'error' : 'warning') : 'neutral';

  const unmatchedLine = conflict.conflictType === 'UNKNOWN_EMPLOYEE' ? parseDetail<OcrUnmatchedLine>(conflict.detail) : null;
  const dateDetail =
    conflict.conflictType === 'DATE_MISMATCH'
      ? parseDetail<{ sessionWorkDate: string; ocrDetectedDate: string }>(conflict.detail)
      : null;
  const detailText = genericDetailText(conflict.detail);

  return (
    <AppCard className={conflict.blocking && isOpen ? 'border-destructive' : undefined}>
      <VStack space="sm">
        <HStack className="items-center justify-between">
          <AppText className="font-semibold">{conflictTypeLabel(conflict.conflictType)}</AppText>
          <StatusBadge label={conflict.status === 'OPEN' ? 'Chưa xử lý' : conflict.status === 'RESOLVED' ? 'Đã xử lý' : 'Đã bỏ qua'} tone={tone} />
        </HStack>

        {conflict.conflictType === 'UNKNOWN_EMPLOYEE' && unmatchedLine ? (
          <AppText size="sm" className="text-muted-foreground">
            {`Tên đọc được: "${unmatchedLine.employeeNameRaw ?? '(trống)'}"`}
          </AppText>
        ) : null}
        {conflict.conflictType === 'DATE_MISMATCH' && dateDetail ? (
          <AppText size="sm" className="text-muted-foreground">
            {`Ngày phiên: ${dateDetail.sessionWorkDate} · Ngày đọc từ ảnh: ${dateDetail.ocrDetectedDate}`}
          </AppText>
        ) : null}
        {conflict.conflictType === 'PENDING_MOVE' ? (
          <AppText size="sm" className="text-muted-foreground">
            Ảnh này đang chờ duyệt trong phiếu bổ sung ở ngày khác — không cần xử lý ở đây, tự đóng khi phiếu
            bổ sung được xác nhận hoặc hủy.
          </AppText>
        ) : null}
        {detailText ? (
          <AppText size="sm" className="text-muted-foreground">
            {detailText}
          </AppText>
        ) : null}

        {isOpen && conflict.conflictType === 'DATE_MISMATCH' ? (
          <HStack space="sm" className="flex-wrap">
            <AppButton size="sm" variant="outline" isDisabled={busy} onPress={() => onResolveDate('KEEP_SESSION_DATE')}>
              Giữ ngày phiên
            </AppButton>
            <AppButton size="sm" isDisabled={busy} onPress={() => onResolveDate('CHANGE_DATE')}>
              Đổi theo ngày trên ảnh
            </AppButton>
          </HStack>
        ) : null}

        {isOpen && conflict.conflictType === 'IMAGE_QUALITY_OR_OCR_FAILED' ? (
          <AppButton size="sm" isDisabled={busy} onPress={onRetryImage}>
            Thử lại ảnh này
          </AppButton>
        ) : null}

        {isOpen && conflict.conflictType === 'UNKNOWN_EMPLOYEE' ? (
          <VStack space="sm">
            <AppSelect
              placeholder="Chọn nhân viên đúng"
              value={selectedEmployeeId}
              options={(employees ?? []).map((e) => ({ label: e.fullName, value: e.id }))}
              onChange={setSelectedEmployeeId}
            />
            <HStack space="sm">
              <AppButton
                size="sm"
                isDisabled={busy || !selectedEmployeeId}
                onPress={() => onResolveConflict('ASSIGN_EMPLOYEE', selectedEmployeeId)}
              >
                Gán nhân viên
              </AppButton>
              <AppButton size="sm" variant="destructive" isDisabled={busy} onPress={() => onResolveConflict('DISCARD')}>
                Bỏ dòng này
              </AppButton>
            </HStack>
          </VStack>
        ) : null}

        {isOpen &&
        (conflict.conflictType === 'DUPLICATE_IMAGE' ||
          conflict.conflictType === 'INVALID_BUSINESS_VALUE' ||
          conflict.conflictType === 'POTENTIAL_DUPLICATE_OCR_ROW' ||
          conflict.conflictType === 'OTHER') ? (
          <HStack space="sm" className="flex-wrap">
            <AppButton size="sm" variant="outline" isDisabled={busy} onPress={() => onResolveConflict('OVERRIDE')}>
              Bỏ qua, giữ nguyên
            </AppButton>
            <AppButton size="sm" variant="destructive" isDisabled={busy} onPress={() => onResolveConflict('DISCARD')}>
              Bỏ dòng/ảnh này
            </AppButton>
          </HStack>
        ) : null}
      </VStack>
    </AppCard>
  );
}

function ProductionRecordsTable({ batchId }: { batchId: string }) {
  const { showToast } = useAppToast();
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const { data } = useProductionRecordsListQuery({ scanBatchId: batchId, status: 'DRAFT' });
  const queryClient = useQueryClient();
  const rows = data?.content ?? [];
  const columns = useMemo(() => buildColumns(latexTypes ?? []), [latexTypes]);

  const [itemsById, setItemsById] = useState<Record<string, ItemFieldValue[]>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function fieldValues(rowId: string, items: LatexItemResponse[]) {
    return itemsById[rowId] ?? itemsToFieldValues(items, latexTypes ?? []);
  }

  function setItemField(rowId: string, colIndex: number, field: 'kg' | 'drcPercent', value: string, items: LatexItemResponse[]) {
    setItemsById((s) => {
      const current = s[rowId] ?? itemsToFieldValues(items, latexTypes ?? []);
      const next = [...current];
      next[colIndex] = { ...next[colIndex], [field]: value };
      return { ...s, [rowId]: next };
    });
  }

  async function handleSaveRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row || !latexTypes) return;
    setSavingId(rowId);
    try {
      const values = fieldValues(rowId, row.items);
      const items = latexTypes
        .map((type, i) => {
          const field = values[i];
          const kg = Number(field.kg);
          if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcPercent = type.code === 'water' && field.drcPercent ? Number(field.drcPercent) : null;
          return { latexTypeId: type.id, kg, drcPercent };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);
      await productionRecordsApi.update(rowId, {
        recordDate: row.recordDate,
        employeeId: row.employeeId,
        notes: (notesById[rowId] ?? row.notes ?? '').trim() || null,
        items,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.productionRecords.all });
      showToast({ title: 'Đã lưu', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Lưu thất bại', description: getErrorMessage(err), variant: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  if (rows.length === 0) return null;

  return (
    <VStack space="sm">
      <AppText size="xs" className="text-muted-foreground">
        {`Dữ liệu sản lượng (${rows.length} dòng)`}
      </AppText>
      <AppCard className="p-0 overflow-hidden">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <VStack>
            <HStack className="bg-muted border-b border-border">
              <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-3">
                <AppText size="xs" className="text-muted-foreground font-medium">
                  Công nhân
                </AppText>
              </Box>
              {columns.map((col) => (
                <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-2 py-3 items-end">
                  <AppText size="xs" className="text-muted-foreground font-medium">
                    {col.label}
                  </AppText>
                </Box>
              ))}
              <Box style={{ width: 64 }} className="px-2 py-3" />
            </HStack>

            {rows.map((row, i) => {
              const lowConfidence = parseLowConfidenceFields(row.lowConfidenceFields);
              const values = fieldValues(row.id, row.items);
              const isExpanded = expandedId === row.id;
              return (
                <VStack key={row.id}>
                  <Pressable onPress={() => setExpandedId(isExpanded ? null : row.id)}>
                    <HStack className={`items-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ minHeight: 56 }}>
                      <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                        <AppText size="sm" numberOfLines={1}>
                          {row.employeeName}
                        </AppText>
                      </Box>
                      {columns.map((col) => {
                        const flagged = matchesColumn(lowConfidence, col.label);
                        const value = values[col.typeIndex]?.[col.field] ?? '';
                        return (
                          <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                            <TableCell
                              value={value}
                              flagged={flagged}
                              onChangeText={(v) => setItemField(row.id, col.typeIndex, col.field, v, row.items)}
                            />
                          </Box>
                        );
                      })}
                      <Box style={{ width: 64 }} className="px-2 py-2">
                        <AppButton size="sm" variant="outline" isLoading={savingId === row.id} onPress={() => handleSaveRow(row.id)}>
                          Lưu
                        </AppButton>
                      </Box>
                    </HStack>
                  </Pressable>
                  {isExpanded ? (
                    <Box className="px-3.5 pb-3 bg-muted/40" style={{ minWidth: NAME_COL_WIDTH + columns.length * VALUE_COL_WIDTH }}>
                      <AppInput
                        label="Ghi chú"
                        value={notesById[row.id] ?? row.notes ?? ''}
                        onChangeText={(notes) => setNotesById((s) => ({ ...s, [row.id]: notes }))}
                      />
                    </Box>
                  ) : null}
                </VStack>
              );
            })}
          </VStack>
        </ScrollView>
      </AppCard>
    </VStack>
  );
}

function LatexSalesTable({ batchId }: { batchId: string }) {
  const { showToast } = useAppToast();
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const { data } = useLatexSalesListQuery({ scanBatchId: batchId, status: 'DRAFT' });
  const queryClient = useQueryClient();
  const rows = data?.content ?? [];
  const columns = useMemo(() => buildColumns(latexTypes ?? []), [latexTypes]);

  const [itemsById, setItemsById] = useState<Record<string, ItemFieldValue[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function fieldValues(rowId: string, items: LatexItemResponse[]) {
    return itemsById[rowId] ?? itemsToFieldValues(items, latexTypes ?? []);
  }

  function setItemField(rowId: string, colIndex: number, field: 'kg' | 'drcPercent', value: string, items: LatexItemResponse[]) {
    setItemsById((s) => {
      const current = s[rowId] ?? itemsToFieldValues(items, latexTypes ?? []);
      const next = [...current];
      next[colIndex] = { ...next[colIndex], [field]: value };
      return { ...s, [rowId]: next };
    });
  }

  async function handleSaveRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row || !latexTypes) return;
    setSavingId(rowId);
    try {
      const values = fieldValues(rowId, row.items);
      const items = latexTypes
        .map((type, i) => {
          const field = values[i];
          const kg = Number(field.kg);
          if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcPercent = type.code === 'water' && field.drcPercent ? Number(field.drcPercent) : null;
          return { latexTypeId: type.id, kg, drcPercent };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);
      await latexSalesApi.update(rowId, {
        recordDate: row.recordDate,
        teamId: row.teamId,
        buyerName: row.buyerName,
        sellerSignedBy: row.sellerSignedBy,
        notes: row.notes,
        items,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.latexSales.all });
      showToast({ title: 'Đã lưu', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Lưu thất bại', description: getErrorMessage(err), variant: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  if (rows.length === 0) return null;

  return (
    <VStack space="sm">
      <AppText size="xs" className="text-muted-foreground">
        {`Dữ liệu bán mủ (${rows.length} dòng)`}
      </AppText>
      <AppCard className="p-0 overflow-hidden">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <VStack>
            <HStack className="bg-muted border-b border-border">
              <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-3">
                <AppText size="xs" className="text-muted-foreground font-medium">
                  Tổ
                </AppText>
              </Box>
              {columns.map((col) => (
                <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-2 py-3 items-end">
                  <AppText size="xs" className="text-muted-foreground font-medium">
                    {col.label}
                  </AppText>
                </Box>
              ))}
              <Box style={{ width: 64 }} className="px-2 py-3" />
            </HStack>

            {rows.map((row, i) => {
              const lowConfidence = parseLowConfidenceFields(row.lowConfidenceFields);
              const values = fieldValues(row.id, row.items);
              return (
                <HStack key={row.id} className={`items-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ minHeight: 56 }}>
                  <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                    <AppText size="sm" numberOfLines={1}>
                      {row.teamName}
                    </AppText>
                  </Box>
                  {columns.map((col) => {
                    const flagged = matchesColumn(lowConfidence, col.label);
                    const value = values[col.typeIndex]?.[col.field] ?? '';
                    return (
                      <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                        <TableCell
                          value={value}
                          flagged={flagged}
                          onChangeText={(v) => setItemField(row.id, col.typeIndex, col.field, v, row.items)}
                        />
                      </Box>
                    );
                  })}
                  <Box style={{ width: 64 }} className="px-2 py-2">
                    <AppButton size="sm" variant="outline" isLoading={savingId === row.id} onPress={() => handleSaveRow(row.id)}>
                      Lưu
                    </AppButton>
                  </Box>
                </HStack>
              );
            })}
          </VStack>
        </ScrollView>
      </AppCard>
    </VStack>
  );
}
