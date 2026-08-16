import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Input, InputField } from '@/components/ui/input';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { productionRecordsApi } from '@/features/production-records/api';
import { latexSalesApi } from '@/features/latex-sales/api';
import type { LatexItemResponse, LatexTypeResponse, OcrCaptureResponse } from '@/types/api';
import { useOcrReviewStore } from './reviewStore';

type RowStatus = 'draft' | 'saving' | 'confirmed' | 'error';

/** Nhãn/tone cho từng dòng đang review (khác `RecordStatus` DB — đây là trạng thái tại chỗ của thao
 * tác Lưu, chưa PATCH/confirm xong thì vẫn coi là "Chưa xác nhận" dù bản ghi gốc đã là DRAFT trên DB). */
function rowStatusLabel(status: RowStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Đã xác nhận';
    case 'error':
      return 'Lỗi';
    case 'saving':
      return 'Đang lưu…';
    case 'draft':
      return 'Chưa xác nhận';
  }
}

function rowStatusTone(status: RowStatus): StatusTone {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'error':
      return 'error';
    case 'saving':
      return 'info';
    case 'draft':
      return 'neutral';
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

/** So khớp tên field OCR trả về (chuỗi tự do) với tên cột — CHỈ khớp khi trùng nhãn (không phân biệt
 * hoa/thường, hoặc chứa nhãn làm chuỗi con). `lowConfidenceFields` là mảng tên field tự do từ AI, KHÔNG
 * đảm bảo khớp 1-1 với `latexType.label` — đây là suy đoán tốt nhất (best-effort), không phải nguồn sự
 * thật tuyệt đối (xem ghi chú Phase 6 cũ). Field nào không khớp được cột nào vẫn hiện trong banner
 * "cần đối chiếu" ở dưới dòng — KHÔNG bị mất thông tin, chỉ là không tô được đúng vị trí ô. */
function matchesColumn(lowConfidence: string[], columnLabel: string): boolean {
  const needle = columnLabel.trim().toLowerCase();
  return lowConfidence.some((f) => f.trim().toLowerCase().includes(needle) || needle.includes(f.trim().toLowerCase()));
}

/**
 * Bảng review OCR — đọc TRỰC TIẾP từ response `POST /ocr/capture` (ADR-0012), KHÔNG phải state tạm
 * client: response được lưu vào `reviewStore` ngay khi capture xong (ADR-0006 — draft đã ghi DB thật
 * trước khi màn này mở). Route riêng full-screen (ADR-0019 mục 1).
 *
 * Layout theo Claude Design màn "06 · Kiểm tra kết quả đọc": 1 bảng compact (không phải card/dòng riêng
 * từng nhân viên như bản trước) — ảnh gốc ghim trên cùng, filter "Cần kiểm tra"/"Tất cả", ô KHỚP được
 * field OCR không chắc mới cho sửa (amber), ô còn lại chỉ đọc. Field nào OCR gắn cờ nhưng không khớp
 * được tên cột nào (xem `matchesColumn`) vẫn hiện banner mức-dòng như bản cũ — không bỏ sót.
 *
 * Sửa (PATCH) gọi thẳng theo `id` — không gom batch, vì đây là sửa aggregate ĐÃ TỒN TẠI (khác tạo mới
 * hàng loạt ở Phase 2, ADR-0007). "Xác nhận ảnh này" ở dưới: PATCH (nếu có sửa) rồi POST confirm cho
 * từng dòng — KHÔNG tự confirm nếu Admin chưa bấm nút này (ADR-0006).
 */
export function OcrReviewScreen({ logId }: { logId: string }) {
  const router = useRouter();
  const response = useOcrReviewStore((s) => s.responses[logId]);
  const removeResponse = useOcrReviewStore((s) => s.removeResponse);
  const { data: latexTypes } = useLatexTypesLookupQuery();

  if (!response) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        <VStack space="sm">
          <AppHeading size="lg">Không tìm thấy dữ liệu review</AppHeading>
          <AppText className="text-muted-foreground">
            Response OCR này không còn trong bộ nhớ (có thể app đã bị kill từ lúc chụp) — mở lại từ tab
            Tra cứu (lọc status Nháp) để xem/xác nhận draft đã tạo.
          </AppText>
          <AppButton variant="outline" onPress={() => router.back()}>
            Về màn Chụp ảnh
          </AppButton>
        </VStack>
      </ScrollView>
    );
  }

  return response.productionRecords ? (
    <ProductionReview response={response} latexTypes={latexTypes ?? []} onDone={() => removeResponse(logId)} />
  ) : (
    <LatexSaleReview response={response} latexTypes={latexTypes ?? []} onDone={() => removeResponse(logId)} />
  );
}

function ReviewHeader({
  title,
  photoUrl,
  response,
}: {
  title: string;
  photoUrl: string | null | undefined;
  response: OcrCaptureResponse;
}) {
  const router = useRouter();
  return (
    <VStack space="sm">
      <Pressable onPress={() => router.back()}>
        <AppText size="sm" className="text-primary">
          ‹ Chụp ảnh
        </AppText>
      </Pressable>
      <AppHeading size="lg">{title}</AppHeading>

      {photoUrl ? (
        <Box className="rounded-xl overflow-hidden border border-border" style={{ height: 160 }}>
          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </Box>
      ) : null}

      {response.unmatchedLines && response.unmatchedLines.length > 0 ? (
        <Box className="border border-destructive rounded-md p-3 bg-destructive/10">
          <AppText size="sm">
            {`⚠ ${response.unmatchedLines.length} dòng không khớp tên nhân viên nào — xử lý qua tab "Nhập tay nhanh".`}
          </AppText>
        </Box>
      ) : null}
    </VStack>
  );
}

function FilterChips({
  needsReviewCount,
  totalCount,
  showOnlyNeedsReview,
  onChange,
}: {
  needsReviewCount: number;
  totalCount: number;
  showOnlyNeedsReview: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <HStack space="xs">
      <Pressable onPress={() => onChange(true)}>
        <Box className={`rounded-full px-3.5 py-2 ${showOnlyNeedsReview ? 'bg-primary' : 'border border-border'}`}>
          <AppText size="sm" className={showOnlyNeedsReview ? 'text-primary-foreground font-medium' : undefined}>
            {`Cần kiểm tra · ${needsReviewCount}`}
          </AppText>
        </Box>
      </Pressable>
      <Pressable onPress={() => onChange(false)}>
        <Box className={`rounded-full px-3.5 py-2 ${!showOnlyNeedsReview ? 'bg-primary' : 'border border-border'}`}>
          <AppText size="sm" className={!showOnlyNeedsReview ? 'text-primary-foreground font-medium' : undefined}>
            {`Tất cả · ${totalCount}`}
          </AppText>
        </Box>
      </Pressable>
    </HStack>
  );
}

/** 1 cột giá trị trong bảng — kg của 1 loại mủ, hoặc DRC (chỉ loại water). */
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

/** 1 ô giá trị trong bảng — chỉ đọc (text) trừ khi `flagged` (OCR không chắc, khớp được tên cột qua
 * `matchesColumn`) thì cho sửa, viền/nền amber. Dùng thẳng `Input`/`InputField` (không qua `AppInput`)
 * để kiểm soát kích thước compact vừa ô bảng — `AppInput` có border/padding mặc định cho form thường,
 * bọc thêm sẽ bị viền đôi. */
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
      <InputField
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        className="text-right text-sm"
      />
    </Input>
  );
}

function ProductionReview({
  response,
  latexTypes,
  onDone,
}: {
  response: OcrCaptureResponse;
  latexTypes: LatexTypeResponse[];
  onDone: () => void;
}) {
  const { showToast } = useAppToast();
  const rows = (response.productionRecords ?? []).filter((r) => r.success && r.data);
  const columns = useMemo(() => buildColumns(latexTypes), [latexTypes]);

  const [itemsByIndex, setItemsByIndex] = useState<Record<number, ItemFieldValue[]>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, itemsToFieldValues(r.data!.items, latexTypes)])),
  );
  const [notesByIndex, setNotesByIndex] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, r.data!.notes ?? ''])),
  );
  const [statusByIndex, setStatusByIndex] = useState<Record<number, RowStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, 'draft' as RowStatus])),
  );
  const [saving, setSaving] = useState(false);
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const rowsWithLowConfidence = useMemo(
    () => rows.map((r) => ({ row: r, lowConfidence: parseLowConfidenceFields(r.data!.lowConfidenceFields) })),
    [rows],
  );
  const needsReviewCount = rowsWithLowConfidence.filter((r) => r.lowConfidence.length > 0).length;
  const visibleRows = showOnlyNeedsReview
    ? rowsWithLowConfidence.filter((r) => r.lowConfidence.length > 0)
    : rowsWithLowConfidence;

  const allConfirmed = rows.every((r) => statusByIndex[r.index] === 'confirmed');
  const photoUrl = rows[0]?.data?.photoUrl;

  function setItemField(rowIndex: number, colIndex: number, field: 'kg' | 'drcPercent', value: string) {
    setItemsByIndex((s) => {
      const next = [...s[rowIndex]];
      next[colIndex] = { ...next[colIndex], [field]: value };
      return { ...s, [rowIndex]: next };
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    let successCount = 0;
    for (const row of rows) {
      const data = row.data!;
      if (statusByIndex[row.index] === 'confirmed') {
        successCount += 1;
        continue;
      }
      setStatusByIndex((s) => ({ ...s, [row.index]: 'saving' }));
      try {
        const items = latexTypes
          .map((type, i) => {
            const field = itemsByIndex[row.index][i];
            const kg = Number(field.kg);
            if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
            const drcPercent = type.code === 'water' && field.drcPercent ? Number(field.drcPercent) : null;
            return { latexTypeId: type.id, kg, drcPercent };
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        await productionRecordsApi.update(data.id, {
          recordDate: data.recordDate,
          employeeId: data.employeeId,
          notes: notesByIndex[row.index]?.trim() || null,
          items,
        });
        await productionRecordsApi.confirm(data.id);
        setStatusByIndex((s) => ({ ...s, [row.index]: 'confirmed' }));
        successCount += 1;
      } catch (err) {
        setStatusByIndex((s) => ({ ...s, [row.index]: 'error' }));
      }
    }
    setSaving(false);
    showToast({
      title: `Đã xác nhận ${successCount}/${rows.length} dòng`,
      variant: successCount === rows.length ? 'success' : 'error',
      // duration tường minh — mặc định của variant='error' ở useAppToast là KHÔNG tự đóng (dành cho
      // banner lỗi mạng ở màn Chụp ảnh, cần Admin chủ động xử lý), nhưng Toast UI component không có
      // nút đóng → nếu để mặc định, toast tóm tắt kết quả lưu ở màn này sẽ kẹt vĩnh viễn khi có dòng
      // lỗi. Dòng lỗi đã hiện sẵn badge "Lỗi" trong bảng, toast không cần neo mãi để nhắc lại.
      duration: 6000,
    });
    if (successCount === rows.length) onDone();
  }

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <ReviewHeader title="Xem lại — Sổ ghi mủ" photoUrl={photoUrl} response={response} />

          {rows.length > 0 ? (
            <FilterChips
              needsReviewCount={needsReviewCount}
              totalCount={rows.length}
              showOnlyNeedsReview={showOnlyNeedsReview}
              onChange={setShowOnlyNeedsReview}
            />
          ) : null}

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
                </HStack>

                {visibleRows.map(({ row, lowConfidence }, i) => {
                  const data = row.data!;
                  const status = statusByIndex[row.index];
                  const isExpanded = expandedIndex === row.index;
                  return (
                    <VStack key={row.index}>
                      <Pressable onPress={() => setExpandedIndex(isExpanded ? null : row.index)}>
                        <HStack className={`items-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ minHeight: 56 }}>
                          <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                            <AppText size="sm" numberOfLines={1}>
                              {data.employeeName}
                            </AppText>
                            {status !== 'draft' ? (
                              <StatusBadge label={rowStatusLabel(status)} tone={rowStatusTone(status)} className="mt-0.5" />
                            ) : null}
                          </Box>
                          {columns.map((col) => {
                            const flagged = matchesColumn(lowConfidence, col.label);
                            const value = itemsByIndex[row.index]?.[col.typeIndex]?.[col.field] ?? '';
                            return (
                              <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                                <TableCell
                                  value={value}
                                  flagged={flagged}
                                  onChangeText={(v) => setItemField(row.index, col.typeIndex, col.field, v)}
                                />
                              </Box>
                            );
                          })}
                        </HStack>
                      </Pressable>

                      {isExpanded ? (
                        <Box className="px-3.5 pb-3 bg-muted/40" style={{ minWidth: NAME_COL_WIDTH + columns.length * VALUE_COL_WIDTH }}>
                          <AppInput
                            label="Ghi chú"
                            value={notesByIndex[row.index] ?? ''}
                            onChangeText={(notes) => setNotesByIndex((s) => ({ ...s, [row.index]: notes }))}
                          />
                          {status === 'error' ? (
                            <AppText size="xs" className="text-destructive mt-1">
                              Lưu dòng này thất bại — bấm "Xác nhận ảnh này" để thử lại.
                            </AppText>
                          ) : null}
                        </Box>
                      ) : null}
                    </VStack>
                  );
                })}
              </VStack>
            </ScrollView>
          </AppCard>

          {rows.length === 0 ? <AppText className="text-muted-foreground">Không có dòng nào đọc được.</AppText> : null}

          {(response.productionRecords ?? [])
            .filter((r) => !r.success)
            .map((r) => (
              <Box key={`failed-${r.index}`} className="border border-destructive rounded-md p-3">
                <AppText size="sm" className="text-destructive">
                  {`Dòng #${r.index + 1}: ${r.error}`}
                </AppText>
              </Box>
            ))}
        </VStack>
      </ScrollView>

      <Box className="p-4 border-t border-border bg-background">
        <AppButton size="lg" onPress={handleSaveAll} isLoading={saving} isDisabled={rows.length === 0 || allConfirmed}>
          {allConfirmed ? 'Đã lưu tất cả' : `Xác nhận ảnh này (${rows.length} dòng)`}
        </AppButton>
      </Box>
    </VStack>
  );
}

function LatexSaleReview({
  response,
  latexTypes,
  onDone,
}: {
  response: OcrCaptureResponse;
  latexTypes: LatexTypeResponse[];
  onDone: () => void;
}) {
  const { showToast } = useAppToast();
  const rows = (response.latexSales ?? []).filter((r) => r.success && r.data);
  const columns = useMemo(() => buildColumns(latexTypes), [latexTypes]);

  const [itemsByIndex, setItemsByIndex] = useState<Record<number, ItemFieldValue[]>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, itemsToFieldValues(r.data!.items, latexTypes)])),
  );
  const [statusByIndex, setStatusByIndex] = useState<Record<number, RowStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, 'draft' as RowStatus])),
  );
  const [saving, setSaving] = useState(false);
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(true);

  const rowsWithLowConfidence = useMemo(
    () => rows.map((r) => ({ row: r, lowConfidence: parseLowConfidenceFields(r.data!.lowConfidenceFields) })),
    [rows],
  );
  const needsReviewCount = rowsWithLowConfidence.filter((r) => r.lowConfidence.length > 0).length;
  const visibleRows = showOnlyNeedsReview
    ? rowsWithLowConfidence.filter((r) => r.lowConfidence.length > 0)
    : rowsWithLowConfidence;

  const allConfirmed = rows.every((r) => statusByIndex[r.index] === 'confirmed');
  const photoUrl = rows[0]?.data?.photoUrl;

  function setItemField(rowIndex: number, colIndex: number, field: 'kg' | 'drcPercent', value: string) {
    setItemsByIndex((s) => {
      const next = [...s[rowIndex]];
      next[colIndex] = { ...next[colIndex], [field]: value };
      return { ...s, [rowIndex]: next };
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    let successCount = 0;
    for (const row of rows) {
      const data = row.data!;
      if (statusByIndex[row.index] === 'confirmed') {
        successCount += 1;
        continue;
      }
      setStatusByIndex((s) => ({ ...s, [row.index]: 'saving' }));
      try {
        const items = latexTypes
          .map((type, i) => {
            const field = itemsByIndex[row.index][i];
            const kg = Number(field.kg);
            if (!field.kg || Number.isNaN(kg) || kg <= 0) return null;
            const drcPercent = type.code === 'water' && field.drcPercent ? Number(field.drcPercent) : null;
            return { latexTypeId: type.id, kg, drcPercent };
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        await latexSalesApi.update(data.id, {
          recordDate: data.recordDate,
          teamId: data.teamId,
          buyerName: data.buyerName,
          sellerSignedBy: data.sellerSignedBy,
          notes: data.notes,
          items,
        });
        await latexSalesApi.confirm(data.id);
        setStatusByIndex((s) => ({ ...s, [row.index]: 'confirmed' }));
        successCount += 1;
      } catch (err) {
        setStatusByIndex((s) => ({ ...s, [row.index]: 'error' }));
      }
    }
    setSaving(false);
    showToast({
      title: `Đã xác nhận ${successCount}/${rows.length} dòng`,
      variant: successCount === rows.length ? 'success' : 'error',
      // duration tường minh — mặc định của variant='error' ở useAppToast là KHÔNG tự đóng (dành cho
      // banner lỗi mạng ở màn Chụp ảnh, cần Admin chủ động xử lý), nhưng Toast UI component không có
      // nút đóng → nếu để mặc định, toast tóm tắt kết quả lưu ở màn này sẽ kẹt vĩnh viễn khi có dòng
      // lỗi. Dòng lỗi đã hiện sẵn badge "Lỗi" trong bảng, toast không cần neo mãi để nhắc lại.
      duration: 6000,
    });
    if (successCount === rows.length) onDone();
  }

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <ReviewHeader title="Xem lại — Sổ bán mủ" photoUrl={photoUrl} response={response} />

          {rows.length > 0 ? (
            <FilterChips
              needsReviewCount={needsReviewCount}
              totalCount={rows.length}
              showOnlyNeedsReview={showOnlyNeedsReview}
              onChange={setShowOnlyNeedsReview}
            />
          ) : null}

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
                </HStack>

                {visibleRows.map(({ row, lowConfidence }, i) => {
                  const data = row.data!;
                  const status = statusByIndex[row.index];
                  return (
                    <HStack key={row.index} className={`items-center ${i > 0 ? 'border-t border-border' : ''}`} style={{ minHeight: 56 }}>
                      <Box style={{ width: NAME_COL_WIDTH }} className="px-3.5 py-2">
                        <AppText size="sm" numberOfLines={1}>
                          {data.teamName}
                        </AppText>
                        {status !== 'draft' ? (
                          <StatusBadge label={rowStatusLabel(status)} tone={rowStatusTone(status)} className="mt-0.5" />
                        ) : null}
                      </Box>
                      {columns.map((col) => {
                        const flagged = matchesColumn(lowConfidence, col.label);
                        const value = itemsByIndex[row.index]?.[col.typeIndex]?.[col.field] ?? '';
                        return (
                          <Box key={col.key} style={{ width: VALUE_COL_WIDTH }} className="px-1.5 py-2 items-end">
                            <TableCell
                              value={value}
                              flagged={flagged}
                              onChangeText={(v) => setItemField(row.index, col.typeIndex, col.field, v)}
                            />
                          </Box>
                        );
                      })}
                    </HStack>
                  );
                })}
              </VStack>
            </ScrollView>
          </AppCard>

          {rows.length === 0 ? <AppText className="text-muted-foreground">Không có dòng nào đọc được.</AppText> : null}

          {(response.latexSales ?? [])
            .filter((r) => !r.success)
            .map((r) => (
              <Box key={`failed-${r.index}`} className="border border-destructive rounded-md p-3">
                <AppText size="sm" className="text-destructive">
                  {`Dòng #${r.index + 1}: ${r.error}`}
                </AppText>
              </Box>
            ))}
        </VStack>
      </ScrollView>

      <Box className="p-4 border-t border-border bg-background">
        <AppButton size="lg" onPress={handleSaveAll} isLoading={saving} isDisabled={rows.length === 0 || allConfirmed}>
          {allConfirmed ? 'Đã lưu tất cả' : `Xác nhận ảnh này (${rows.length} dòng)`}
        </AppButton>
      </Box>
    </VStack>
  );
}
