import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
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
import { ZoomableImageModal } from '@/components/ZoomableImageModal';
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
  ProductionRecordResponse,
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
      // Cùng status dùng cho 2 trường hợp: ảnh chụp lại (RULE 6, tương lai) VÀ ảnh bị user xóa thủ
      // công khỏi batch (removeImage) — label chung chung để đúng cả 2, xem javadoc
      // ScanBatchService.removeImage(). Thực tế các ảnh REPLACED bị lọc khỏi danh sách hiển thị
      // (xem images.filter ở BatchReviewScreen) nên label này chỉ có ý nghĩa nếu sau này hiện lại.
      return 'Đã loại khỏi phiên';
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
    case 'TOTAL_MISMATCH':
      return 'Lệch tổng cột';
    case 'EMPTY_ROW_SKIPPED':
      return 'Dòng không có số liệu';
  }
}

const LATEX_TYPE_CODE_LABEL: Record<string, string> = {
  water: 'Mủ nước',
  cup: 'Mủ chén',
  strip: 'Mủ dây',
  coagulated: 'Mủ đông',
};

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

// Bàn phím decimal-pad ở locale tiếng Việt hiện dấu PHẨY làm dấu thập phân (vd "56,5") nhưng
// Number("56,5") của JS trả NaN (chỉ hiểu dấu chấm) — dòng nhập bị lưu sai/báo lỗi khi Admin gõ đúng
// thói quen tiếng Việt, phát hiện khi test thật trên iPhone (2026-08-23). Chuẩn hóa phẩy → chấm trước
// khi parse ở MỌI nơi đọc số từ ô nhập tay trong bảng review.
function parseDecimalInput(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
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
  latexTypeId: string;
  field: 'kg' | 'drcPercent';
}

/** includeDrc=false cho bảng Sản lượng (sổ ghi mủ) — DRC chỉ có ý nghĩa lúc ghi Sổ bán mủ (đo trên
 * tổng mủ nước bán đi cho người mua ngoài), không đo/ghi theo từng công nhân/ngày — theo yêu cầu bỏ
 * cột này khỏi Batch Review cho production_records (giữ nguyên ở LatexSalesTable). */
function buildColumns(latexTypes: LatexTypeResponse[], includeDrc = true): ValueColumn[] {
  const columns: ValueColumn[] = [];
  latexTypes.forEach((type, i) => {
    columns.push({ key: `${type.id}-kg`, label: type.label, typeIndex: i, latexTypeId: type.id, field: 'kg' });
    if (includeDrc && type.code === 'water') {
      columns.push({ key: `${type.id}-drc`, label: 'DRC', typeIndex: i, latexTypeId: type.id, field: 'drcPercent' });
    }
  });
  return columns;
}

/** Tổng theo từng cột kg (bỏ qua cột DRC — không cộng dồn %) — dòng "Tổng cộng" cuối bảng. Cộng từ
 * `row.items` đã lưu (nguồn sự thật), không phải state đang sửa dở chưa bấm Lưu. */
function computeColumnTotals(rows: { items: LatexItemResponse[] }[], columns: ValueColumn[]): Record<string, number> {
  const totals: Record<string, number> = {};
  columns.forEach((col) => {
    if (col.field !== 'kg') return;
    totals[col.key] = rows.reduce((sum, row) => {
      const item = row.items.find((it) => it.latexTypeId === col.latexTypeId);
      return sum + (item?.kg ?? 0);
    }, 0);
  });
  return totals;
}

const STT_COL_WIDTH = 36;
const NAME_COL_WIDTH = 128;
const VALUE_COL_WIDTH = 76;

// Chỉ mount ĐÚNG 1 ô sửa tại 1 thời điểm trong toàn bảng (bấm-để-sửa, không phải luôn-luôn-sửa-được).
// Ô đang sửa dùng TextInput GỐC của react-native (style thuần, KHÔNG className) — InputField gluestack
// (đi qua react-native-css/NativeWind) crash "TypeError: path.split is not a function" ngay khi mount
// trên iOS thật (2026-08-23), kể cả chỉ 1 ô — nghi do class mặc định `ios:leading-[0px]` sẵn có trong
// inputFieldStyle (components/ui/input) kết hợp NativeCSS, không phải lỗi do component này gây ra
// nhưng sửa tận gốc bên thư viện rủi ro cao, né hẳn bằng TextInput gốc là cách an toàn nhất.
const WARNING_BORDER = '#B98A12';
const WARNING_BG = 'rgba(185, 138, 18, 0.12)';

function TableCell({
  value,
  flagged,
  editing,
  onStartEdit,
  onChangeText,
}: {
  value: string;
  flagged: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onChangeText: (v: string) => void;
}) {
  if (!flagged) {
    return (
      <AppText size="sm" className="font-mono">
        {value || '—'}
      </AppText>
    );
  }
  if (!editing) {
    return (
      <Pressable onPress={onStartEdit}>
        <Box
          className="rounded min-h-8 px-2 justify-center"
          style={{ borderWidth: 1.5, borderColor: WARNING_BORDER, backgroundColor: WARNING_BG }}
        >
          <AppText size="sm" className="font-mono text-right">
            {value || '—'}
          </AppText>
        </Box>
      </Pressable>
    );
  }
  return (
    <Box
      className="rounded min-h-8 px-2 justify-center"
      style={{ borderWidth: 1.5, borderColor: WARNING_BORDER, backgroundColor: WARNING_BG }}
    >
      <TextInput
        autoFocus
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        style={{ textAlign: 'right', fontSize: 14, color: '#1a1a1a', padding: 0 }}
      />
    </Box>
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
  // State xem ảnh phóng to được NÂNG LÊN đây (thay vì giữ trong từng ImageTile) — ZoomableImageModal
  // dựa vào `position: 'absolute'` để phủ toàn màn hình, nhưng RN clip mọi View theo BOUNDS của
  // ancestor gần nhất bất kể position (khác CSS web, "absolute" không thoát khỏi overflow của cha).
  // ImageTile nằm sâu trong `<ScrollView horizontal>` (dải thumbnail ảnh, ~92dp cao) — nếu modal render
  // ngay trong đó, nó bị cắt còn đúng dải ~92dp đó dù style đúng full-screen. Render modal làm sibling
  // của `<ScrollView>` chính ở cuối component (ngoài mọi ScrollView) mới thoát được — phát hiện khi chạy
  // thật trên Android Emulator (2026-08-24), ảnh xem lại chỉ hiện 1 dải nhỏ giữa trang.
  const [zoomUri, setZoomUri] = useState<string | null>(null);

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
    // Thiếu dòng này trước đây (phát hiện 2026-08-24) — "Hôm nay"/"Ngày làm việc" đọc report
    // (queryKeys.reports.*, namespace RIÊNG, không nằm dưới productionRecords/latexSales) nên approve
    // xong vẫn hiện số cũ cho tới khi staleTime 30s trôi qua hoặc màn hình refocus.
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    // Cùng lớp bug với dòng trên, tái phát 2026-08-25: Home "Chờ kiểm tra" đọc
    // queryKeys.scanBatches.pendingCount (namespace RIÊNG, mới thêm — không nằm dưới productionRecords/
    // latexSales/reports) — xóa ảnh/retry/hủy/duyệt phiên đều đổi status batch (có thể đổi số đang
    // "chờ xử lý"), nhưng thiếu dòng này thì Home vẫn hiện số cũ cho tới khi staleTime trôi qua. User
    // báo cáo trực tiếp: xóa 2 ảnh 1 phiên nhưng "Chờ kiểm tra" không đổi.
    queryClient.invalidateQueries({ queryKey: queryKeys.scanBatches.pendingCount });
  }

  function handleActionError(err: unknown, fallbackTitle: string) {
    // duration tường minh — mặc định của variant='error' ở useAppToast là KHÔNG tự đóng (dành cho
    // banner lỗi mạng ở màn Chụp ảnh, cần Admin chủ động xử lý), nhưng Toast UI component không có
    // nút đóng → nếu để mặc định, toast lỗi hành động (thử lại/hủy phiên/xác nhận...) ở màn này sẽ
    // kẹt vĩnh viễn (phát hiện khi test thật trên iPhone qua Expo Go — xem OcrReviewScreen cũ, cùng
    // gốc bug).
    showToast({ title: fallbackTitle, description: getErrorMessage(err), variant: 'error', duration: 6000 });
  }

  const retryImageMutation = useMutation({
    mutationFn: (imageId: string) => scanBatchApi.retryImage(imageId),
    onSuccess: applyResponse,
    onError: (err) => handleActionError(err, 'Thử lại ảnh thất bại'),
  });
  const removeImageMutation = useMutation({
    mutationFn: (imageId: string) => scanBatchApi.removeImage(imageId),
    onSuccess: (response) => {
      applyResponse(response);
      showToast({ title: 'Đã xóa ảnh khỏi phiên', variant: 'success' });
    },
    onError: (err) => handleActionError(err, 'Xóa ảnh thất bại'),
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
  const countableImages = batch.images.filter((image) => image.status !== 'REPLACED' && image.ocrRowCount != null);
  const processedImageCount = countableImages.length;
  const ocrRowCountTotal = processedImageCount > 0 ? countableImages.reduce((sum, i) => sum + (i.ocrRowCount ?? 0), 0) : null;

  // Grilling 2026-08-23 (3 vấn đề màn Batch Review):
  const replacedImageIds = new Set(batch.images.filter((img) => img.status === 'REPLACED').map((img) => img.id));
  // Vấn đề 1 — bỏ khỏi "Cần chú ý" mọi conflict thuộc ảnh đã bị xóa (REPLACED): ảnh nguồn không còn
  // thì conflict đó không còn ý nghĩa để xem/xử lý ở đây nữa (dù status đã RESOLVED hay vẫn OPEN).
  // Vấn đề 3 — EMPTY_ROW_SKIPPED không hiện ở "Cần chú ý" nữa, merge thẳng vào bảng record bên dưới
  // (ProductionRecordsTable) theo đúng rowIndex thay vì hiện như 1 cảnh báo cần xử lý.
  const attentionConflicts = batch.conflicts.filter(
    (c) => c.conflictType !== 'EMPTY_ROW_SKIPPED' && (!c.scanImageId || !replacedImageIds.has(c.scanImageId)),
  );
  const emptyRowConflicts = batch.conflicts.filter(
    (c) => c.conflictType === 'EMPTY_ROW_SKIPPED' && (!c.scanImageId || !replacedImageIds.has(c.scanImageId)),
  );
  // Vấn đề 2 — cell thuộc loại mủ đang lệch tổng (theo ảnh) cần cho sửa được (không chỉ ô OCR flag
  // low_confidence), và sau khi Lưu phải kiểm tra lại — group theo scanImageId để ProductionRecordsTable
  // biết record nào đang "trong vùng ảnh hưởng" của 1 TOTAL_MISMATCH.
  const openTotalMismatchByImage: Record<string, ScanBatchConflictResponse[]> = {};
  batch.conflicts.forEach((c) => {
    if (c.conflictType === 'TOTAL_MISMATCH' && c.status === 'OPEN' && c.scanImageId) {
      (openTotalMismatchByImage[c.scanImageId] ??= []).push(c);
    }
  });

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          {/* router.back() giả định luôn có sẵn lịch sử điều hướng — nếu màn này trở thành màn ĐẦU
              TIÊN trong stack (app reload/khôi phục trạng thái Expo Router, hoặc deep link thẳng vào
              batchId), gọi back() ném lỗi "GO_BACK not handled" (React Navigation), không làm gì cả —
              phát hiện khi test thật trên Android Emulator (2026-08-24). canGoBack() check trước, nếu
              không có lịch sử thì điều hướng thẳng về Home thay vì để nút im lặng vô dụng. */}
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
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

          {/* REPLACED = đã bị xóa thủ công (removeImage) hoặc chụp lại (RULE 6, tương lai) — không còn
              là dữ liệu active, không hiển thị lại trên màn review (xem imageStatusLabel). */}
          {batch.images.filter((image) => image.status !== 'REPLACED').length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space="sm">
                {batch.images
                  .filter((image) => image.status !== 'REPLACED')
                  .map((image) => (
                    <ImageTile
                      key={image.id}
                      image={image}
                      onZoom={() => setZoomUri(image.photoUrl)}
                      onRetry={() => retryImageMutation.mutate(image.id)}
                      retrying={retryImageMutation.isPending && retryImageMutation.variables === image.id}
                      onRemove={() => removeImageMutation.mutate(image.id)}
                      removing={removeImageMutation.isPending && removeImageMutation.variables === image.id}
                    />
                  ))}
              </HStack>
            </ScrollView>
          ) : null}

          {/* Tổng số dòng OCR đọc được (từ TẤT CẢ ảnh đã xử lý xong trong phiên) — để Admin đối chiếu
              bằng mắt với số dòng thật trên phiếu giấy, tránh hiểu lầm hệ thống đọc thiếu dòng khi
              thực ra 1 số dòng bị bỏ có chủ đích (không cạo mủ hôm đó, xem EMPTY_ROW_SKIPPED) —
              phát hiện thiếu khi test thật trên iPhone (2026-08-23). Chỉ áp dụng Sổ ghi mủ — Sổ bán
              mủ không có khái niệm "rows" (1 phiếu = 1 record theo Tổ). */}
          {isProduction && ocrRowCountTotal != null ? (
            <AppText size="xs" className="text-muted-foreground">
              {`Đã đọc ${ocrRowCountTotal} dòng từ ${processedImageCount} ảnh — đối chiếu với số dòng thật trên phiếu giấy.`}
            </AppText>
          ) : null}

          {attentionConflicts.length > 0 ? (
            <VStack space="sm">
              <AppText size="xs" className="text-muted-foreground">
                {`Cần chú ý (${attentionConflicts.length})`}
              </AppText>
              {attentionConflicts.map((conflict) => (
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
            <ProductionRecordsTable
              batchId={batch.id}
              images={batch.images}
              emptyRowConflicts={emptyRowConflicts}
              openTotalMismatchByImage={openTotalMismatchByImage}
              onApplyResponse={applyResponse}
            />
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

      <ZoomableImageModal visible={!!zoomUri} uri={zoomUri} onClose={() => setZoomUri(null)} />
    </VStack>
  );
}

function ImageTile({
  image,
  onZoom,
  onRetry,
  retrying,
  onRemove,
  removing,
}: {
  image: ScanImageResponse;
  onZoom: () => void;
  onRetry: () => void;
  retrying: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const borderColor =
    image.status === 'ACTIVE' || image.status === 'MOVED'
      ? '#9FD3C4'
      : image.status === 'FAILED'
        ? '#E7B3AC'
        : 'rgba(0,0,0,.15)';
  return (
    <VStack space="xs" style={{ width: 72 }}>
      {/* Bấm để xem toàn màn hình + phóng to — thumbnail 72x92 quá nhỏ để soi chữ viết tay mờ so với
          kết quả OCR, phát hiện thiếu khi test thật trên iPhone (2026-08-22). State modal nằm ở component
          cha (BatchReviewScreen), không giữ ở đây — xem comment `zoomUri` tại đó. */}
      <Pressable onPress={onZoom}>
        <Box className="rounded-md overflow-hidden" style={{ width: 72, height: 92, borderWidth: 2, borderColor }}>
          <Image source={{ uri: image.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </Box>
      </Pressable>
      <AppText size="xs" className="text-center text-muted-foreground" numberOfLines={1}>
        {imageStatusLabel(image.status)}
      </AppText>
      {image.status === 'FAILED' ? (
        <AppButton size="sm" variant="outline" onPress={onRetry} isLoading={retrying} isDisabled={removing}>
          Thử lại
        </AppButton>
      ) : null}
      {/* FAILED: chụp/chọn nhầm (vd sai loại phiếu) — không thể retry thành công, cần dọn khỏi màn
          review thay vì nằm lại vĩnh viễn. ACTIVE: ảnh xử lý XONG nhưng Admin đối chiếu tay phát hiện
          đọc sai (vd lệch tổng cột thật — ô "A+B" khó đọc) và muốn chụp lại thay vì sửa tay từng dòng —
          xem javadoc ScanBatchService.removeImage. Cả 2 trường hợp đều là "xóa để chụp lại", chỉ khác
          ACTIVE cần hủy draft record trước (backend tự lo). */}
      {image.status === 'FAILED' || image.status === 'ACTIVE' ? (
        <AppButton size="sm" variant="destructive" onPress={onRemove} isLoading={removing} isDisabled={retrying}>
          Xóa ảnh
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
        {conflict.conflictType === 'TOTAL_MISMATCH' ? (
          // Tổng kg thực tế đã tạo record lệch với dòng "Tổng cộng" OCR đọc trên phiếu giấy — dấu
          // hiệu đọc nhầm CỘT (vd Mủ dây ↔ Mủ đông), phát hiện thật khi test trên iPhone (phiếu
          // 23/08/2026): model tự tin 100% nhưng vẫn gán sai cột. Blocking — bắt Admin đối chiếu tay
          // với phiếu giấy trước khi duyệt.
          (() => {
            const detail = parseDetail<{ latexTypeCode?: string; ocrTotal?: number; systemTotal?: number }>(conflict.detail);
            if (!detail) return null;
            const label = LATEX_TYPE_CODE_LABEL[detail.latexTypeCode ?? ''] ?? detail.latexTypeCode ?? '';
            return (
              <AppText size="sm" className="text-muted-foreground">
                {`${label}: phiếu ghi tổng ${detail.ocrTotal ?? '?'} kg, hệ thống đang tính ${detail.systemTotal ?? '?'} kg — kiểm tra lại từng dòng, có thể bị đọc nhầm cột.`}
              </AppText>
            );
          })()
        ) : null}
        {conflict.conflictType === 'EMPTY_ROW_SKIPPED' ? (
          // Không blocking, không cần xử lý — chỉ hiện rõ cho Admin biết dòng này ĐÃ được đọc (tên có
          // trên phiếu) nhưng cố ý không tạo bản ghi vì không có số liệu (không cạo mủ hôm đó), tránh
          // hiểu lầm là OCR đọc thiếu dòng so với số nhân viên trên phiếu.
          <AppText size="sm" className="text-muted-foreground">
            {`Tên đọc được: "${parseDetail<{ employeeNameRaw?: string }>(conflict.detail)?.employeeNameRaw ?? '(trống)'}" — không có số liệu trên phiếu (có thể nghỉ/không cạo mủ), không tạo bản ghi.`}
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
          conflict.conflictType === 'TOTAL_MISMATCH' ||
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

/** Kiểm tra 1 cột (theo code loại mủ) có đang bị flag TOTAL_MISMATCH mở cho đúng ảnh này không — cho
 * phép sửa (giống ô OCR low_confidence) dù bản thân model không tự flag ô đó, vì Admin cần sửa MỘT
 * TRONG SỐ các dòng của cột này mới hết lệch, không biết trước chính xác dòng nào (Vấn đề 2). */
function isMismatchedColumn(conflicts: ScanBatchConflictResponse[] | undefined, code: string | undefined): boolean {
  if (!conflicts || !code) return false;
  return conflicts.some((c) => parseDetail<{ latexTypeCode?: string }>(c.detail)?.latexTypeCode === code);
}

type DisplayRow =
  | { kind: 'record'; sortKey: number; record: ProductionRecordResponse }
  | { kind: 'empty'; sortKey: number; employeeNameRaw: string; conflictId: string };

function ProductionRecordsTable({
  batchId,
  images,
  emptyRowConflicts,
  openTotalMismatchByImage,
  onApplyResponse,
}: {
  batchId: string;
  images: ScanImageResponse[];
  emptyRowConflicts: ScanBatchConflictResponse[];
  openTotalMismatchByImage: Record<string, ScanBatchConflictResponse[]>;
  onApplyResponse: (response: ScanBatchResponse) => void;
}) {
  const { showToast } = useAppToast();
  const { data: latexTypes } = useLatexTypesLookupQuery();
  const { data } = useProductionRecordsListQuery({ scanBatchId: batchId, status: 'DRAFT' });
  const queryClient = useQueryClient();
  const rows = data?.content ?? [];
  // includeDrc=false — DRC chỉ đo lúc ghi Sổ bán mủ (LatexSalesTable), không phải sản lượng cá nhân/ngày.
  const columns = useMemo(() => buildColumns(latexTypes ?? [], false), [latexTypes]);
  const totals = useMemo(() => computeColumnTotals(rows, columns), [rows, columns]);

  // Vấn đề 3 — thứ tự ảnh trong phiên (theo lúc chụp), nhân hệ số lớn để ghép với rowIndex trong ảnh
  // (chỉ có ý nghĩa SO SÁNH trong cùng 1 ảnh — 2 ảnh khác nhau đều bắt đầu rowIndex từ 0) mà không lẫn
  // thứ tự giữa các ảnh khi phiên có nhiều ảnh. Record nhập tay/không rõ ảnh xếp cuối bảng.
  const imageOrder = new Map(images.filter((img) => img.status !== 'REPLACED').map((img, idx) => [img.id, idx]));
  function sortKeyFor(scanImageId: string | null | undefined, rowIndex: number | null | undefined): number {
    const imgOrder = scanImageId != null ? (imageOrder.get(scanImageId) ?? 999) : 999;
    return imgOrder * 100_000 + (rowIndex ?? 99_999);
  }
  const emptyDisplayRows: DisplayRow[] = [];
  emptyRowConflicts.forEach((c) => {
    const detail = parseDetail<{ employeeNameRaw?: string; rowIndex?: number }>(c.detail);
    if (!detail?.employeeNameRaw) return;
    emptyDisplayRows.push({
      kind: 'empty',
      sortKey: sortKeyFor(c.scanImageId, detail.rowIndex),
      employeeNameRaw: detail.employeeNameRaw,
      conflictId: c.id,
    });
  });
  const displayRows: DisplayRow[] = [
    ...rows.map((r): DisplayRow => ({ kind: 'record', sortKey: sortKeyFor(r.scanImageId, r.rowIndex), record: r })),
    ...emptyDisplayRows,
  ].sort((a, b) => a.sortKey - b.sortKey);

  const [itemsById, setItemsById] = useState<Record<string, ItemFieldValue[]>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Đúng 1 ô Input active tại 1 thời điểm trong toàn bảng — xem javadoc TableCell.
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);

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
          const kg = parseDecimalInput(field.kg);
          if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcPercent = type.code === 'water' && field.drcPercent ? parseDecimalInput(field.drcPercent) : null;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }); // xem javadoc applyResponse
      queryClient.invalidateQueries({ queryKey: queryKeys.scanBatches.pendingCount }); // xem javadoc applyResponse
      setActiveEditKey(null);
      showToast({ title: 'Đã lưu', variant: 'success' });
      // Vấn đề 2 — kiểm tra lại NGAY các TOTAL_MISMATCH đang mở của đúng ảnh chứa dòng vừa sửa: khớp
      // (trong dung sai) thì backend tự đóng cảnh báo, còn lệch thì cập nhật số lệch mới nhất — không
      // cần Admin tự bấm thêm nút nào khác. KHÔNG dùng `openTotalMismatchByImage` (props — cache từ lần
      // render trước) để quyết định conflict nào cần recheck: mạng chậm/nhiều request chồng nhau (quan
      // sát thật ~10-30s/request khi test) có thể khiến cache đó cũ hơn thực tế, vòng lặp chạy trên dữ
      // liệu cũ im lặng bỏ qua conflict mới toanh — không gửi request nào cả dù record đã lưu đúng, phát
      // hiện khi test thật trên iPhone (2026-08-23). Gọi thẳng GET batch MỚI NHẤT ngay tại đây để chắc
      // chắn không bỏ sót. Tự nuốt lỗi (kể cả GET lẫn recheck) — record đã lưu thành công ở trên rồi,
      // bước này chỉ là best-effort, không nên báo lại thành "Lưu thất bại".
      try {
        const freshBatch = await scanBatchApi.get(batchId);
        onApplyResponse(freshBatch);
        const relatedConflicts = row.scanImageId
          ? freshBatch.conflicts.filter(
              (c) => c.conflictType === 'TOTAL_MISMATCH' && c.status === 'OPEN' && c.scanImageId === row.scanImageId,
            )
          : [];
        for (const conflict of relatedConflicts) {
          try {
            const response = await scanBatchApi.recheckTotal(conflict.id);
            onApplyResponse(response);
          } catch {
            // im lặng bỏ qua — xem ghi chú phía trên.
          }
        }
      } catch {
        // im lặng bỏ qua — xem ghi chú phía trên.
      }
    } catch (err) {
      // duration tường minh — xem ghi chú ở handleActionError phía trên, cùng gốc bug toast kẹt vĩnh viễn.
      showToast({ title: 'Lưu thất bại', description: getErrorMessage(err), variant: 'error', duration: 6000 });
    } finally {
      setSavingId(null);
    }
  }

  if (displayRows.length === 0) return null;

  return (
    <VStack space="sm">
      <AppText size="xs" className="text-muted-foreground">
        {`Dữ liệu sản lượng (${displayRows.length} dòng)`}
      </AppText>
      <AppCard className="p-0 overflow-hidden">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <VStack>
            <HStack className="bg-muted border-b border-border">
              <Box style={{ width: STT_COL_WIDTH }} className="px-2 py-3">
                <AppText size="xs" className="text-muted-foreground font-medium">
                  STT
                </AppText>
              </Box>
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

            {displayRows.map((displayRow, i) => {
              // Dòng "nghỉ/không cạo mủ" — KHÔNG phải record thật (ADR-0021, không tạo production_record
              // rỗng), chỉ hiện tên + gạch ngang đúng vị trí trên phiếu để đối chiếu, không sửa/lưu được
              // (Vấn đề 3 — trước đây hiện dưới dạng cảnh báo "Cần chú ý", nay hiện thẳng ở đây).
              if (displayRow.kind === 'empty') {
                return (
                  <HStack
                    key={displayRow.conflictId}
                    className={`items-center ${i > 0 ? 'border-t border-border' : ''}`}
                    style={{ minHeight: 56, opacity: 0.55 }}
                  >
                    <Box style={{ width: STT_COL_WIDTH }} className="px-2 py-2">
                      <AppText size="sm" className="text-muted-foreground">
                        {i + 1}
                      </AppText>
                    </Box>
                    <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                      <AppText size="sm" numberOfLines={1} className="text-muted-foreground">
                        {displayRow.employeeNameRaw}
                      </AppText>
                    </Box>
                    {columns.map((col) => (
                      <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                        <AppText size="sm" className="text-muted-foreground">
                          —
                        </AppText>
                      </Box>
                    ))}
                    <Box style={{ width: 64 }} className="px-2 py-2 items-center">
                      <AppText size="xs" className="text-muted-foreground text-center">
                        Nghỉ
                      </AppText>
                    </Box>
                  </HStack>
                );
              }

              const row = displayRow.record;
              const lowConfidence = parseLowConfidenceFields(row.lowConfidenceFields);
              const mismatchConflicts = row.scanImageId ? openTotalMismatchByImage[row.scanImageId] : undefined;
              const values = fieldValues(row.id, row.items);
              const isExpanded = expandedId === row.id;
              return (
                <VStack key={row.id}>
                  <Pressable onPress={() => setExpandedId(isExpanded ? null : row.id)}>
                    <HStack className={`items-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ minHeight: 56 }}>
                      <Box style={{ width: STT_COL_WIDTH }} className="px-2 py-2">
                        <AppText size="sm" className="text-muted-foreground">
                          {i + 1}
                        </AppText>
                      </Box>
                      <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                        <AppText size="sm" numberOfLines={1}>
                          {row.employeeName}
                        </AppText>
                      </Box>
                      {columns.map((col) => {
                        // Sửa được khi: (a) chính OCR flag ô này không chắc (như trước), HOẶC (b) cột
                        // này đang bị TOTAL_MISMATCH mở cho đúng ảnh của dòng — không biết trước dòng
                        // nào gây lệch nên cho sửa cả cột để Admin tự đối chiếu phiếu gốc (Vấn đề 2).
                        const flagged =
                          matchesColumn(lowConfidence, col.label) ||
                          (col.field === 'kg' && isMismatchedColumn(mismatchConflicts, latexTypes?.[col.typeIndex]?.code));
                        const value = values[col.typeIndex]?.[col.field] ?? '';
                        const cellKey = `${row.id}-${col.key}`;
                        return (
                          <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                            <TableCell
                              value={value}
                              flagged={flagged}
                              editing={activeEditKey === cellKey}
                              onStartEdit={() => setActiveEditKey(cellKey)}
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
                    <Box
                      className="px-3.5 pb-3 bg-muted/40"
                      style={{ minWidth: STT_COL_WIDTH + NAME_COL_WIDTH + columns.length * VALUE_COL_WIDTH }}
                    >
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

            {/* Dòng Tổng cộng — cộng theo `row.items` đã lưu (nguồn sự thật), không phải state đang sửa
                dở chưa bấm Lưu, để tránh hiện số "ảo" khi Admin gõ dở 1 ô rồi chưa lưu. */}
            <HStack className="border-t-2 border-border bg-muted/60" style={{ minHeight: 44 }}>
              <Box style={{ width: STT_COL_WIDTH }} className="px-2 py-2" />
              <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                <AppText size="sm" className="font-semibold">
                  Tổng cộng
                </AppText>
              </Box>
              {columns.map((col) => (
                <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                  <AppText size="sm" className="font-semibold font-mono">
                    {col.field === 'kg' ? (totals[col.key] ?? 0).toLocaleString('vi-VN') : ''}
                  </AppText>
                </Box>
              ))}
              <Box style={{ width: 64 }} className="px-2 py-2" />
            </HStack>
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
  // Đúng 1 ô Input active tại 1 thời điểm — xem javadoc TableCell.
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);

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
          const kg = parseDecimalInput(field.kg);
          if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
          const drcPercent = type.code === 'water' && field.drcPercent ? parseDecimalInput(field.drcPercent) : null;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }); // xem javadoc applyResponse
      queryClient.invalidateQueries({ queryKey: queryKeys.scanBatches.pendingCount }); // xem javadoc applyResponse
      setActiveEditKey(null);
      showToast({ title: 'Đã lưu', variant: 'success' });
    } catch (err) {
      // duration tường minh — xem ghi chú ở handleActionError phía trên, cùng gốc bug toast kẹt vĩnh viễn.
      showToast({ title: 'Lưu thất bại', description: getErrorMessage(err), variant: 'error', duration: 6000 });
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
                    const cellKey = `${row.id}-${col.key}`;
                    return (
                      <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                        <TableCell
                          value={value}
                          flagged={flagged}
                          editing={activeEditKey === cellKey}
                          onStartEdit={() => setActiveEditKey(cellKey)}
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
