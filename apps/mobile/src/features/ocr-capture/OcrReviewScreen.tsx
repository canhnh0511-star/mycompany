import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppHeading } from '@/components/AppHeading';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { useAppToast } from '@/components/useAppToast';
import { useLatexTypesLookupQuery } from '@/features/admin-catalog/useCatalogLookups';
import { productionRecordsApi } from '@/features/production-records/api';
import { latexSalesApi } from '@/features/latex-sales/api';
import type { LatexItemResponse, LatexTypeResponse, OcrCaptureResponse } from '@/types/api';
import { useOcrReviewStore } from './reviewStore';

type RowStatus = 'draft' | 'saving' | 'confirmed' | 'error';

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

/**
 * Bảng review OCR — đọc TRỰC TIẾP từ response `POST /ocr/capture` (ADR-0012), KHÔNG phải state tạm
 * client: response được lưu vào `reviewStore` ngay khi capture xong (ADR-0006 — draft đã ghi DB thật
 * trước khi màn này mở). Route riêng full-screen (ADR-0019 mục 1) — không phải modal/sheet vì cần sửa
 * nhiều field (gõ tay, chọn dropdown).
 *
 * Sửa (PATCH) gọi thẳng theo `id` — không gom batch, vì đây là sửa aggregate ĐÃ TỒN TẠI (khác tạo mới
 * hàng loạt ở Phase 2, ADR-0007). "Lưu tất cả" ở dưới: PATCH (nếu có sửa) rồi POST confirm cho từng
 * dòng — KHÔNG tự confirm nếu Admin chưa bấm nút này (ADR-0006).
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

function ReviewHeader({ title, response }: { title: string; response: OcrCaptureResponse }) {
  const router = useRouter();
  return (
    <VStack space="xs">
      <Pressable onPress={() => router.back()}>
        <AppText size="sm" className="text-primary">
          ‹ Chụp ảnh
        </AppText>
      </Pressable>
      <AppHeading size="lg">{title}</AppHeading>
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

  const allConfirmed = rows.every((r) => statusByIndex[r.index] === 'confirmed');

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
    });
    if (successCount === rows.length) onDone();
  }

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <ReviewHeader title="Xem lại — Sổ ghi mủ" response={response} />

          {rows.map((row) => {
            const data = row.data!;
            const status = statusByIndex[row.index];
            const lowConfidence = parseLowConfidenceFields(data.lowConfidenceFields);
            return (
              <Box key={row.index} className="border border-border rounded-md p-3">
                <VStack space="sm">
                  <HStack className="items-center justify-between">
                    <AppText className="font-semibold">{data.employeeName}</AppText>
                    <Box
                      className={`rounded-full px-2 py-0.5 ${
                        status === 'confirmed' ? 'bg-accent' : status === 'error' ? 'bg-destructive' : 'bg-muted'
                      }`}
                    >
                      <AppText size="xs" className={status === 'error' ? 'text-white' : undefined}>
                        {status === 'confirmed' ? 'Đã xác nhận' : status === 'error' ? 'Lỗi' : 'Chưa xác nhận'}
                      </AppText>
                    </Box>
                  </HStack>
                  {lowConfidence.length > 0 ? (
                    <AppText size="xs" className="text-destructive">
                      {`⚠ AI không chắc: ${lowConfidence.join(', ')}`}
                    </AppText>
                  ) : null}

                  <HStack space="sm" className="flex-wrap">
                    {latexTypes.map((type, i) => (
                      <VStack key={type.id} space="xs" className="flex-1" style={{ minWidth: 110 }}>
                        <AppInput
                          label={`${type.label} (${type.unit})`}
                          keyboardType="decimal-pad"
                          value={itemsByIndex[row.index]?.[i]?.kg ?? ''}
                          onChangeText={(kg) =>
                            setItemsByIndex((s) => {
                              const next = [...s[row.index]];
                              next[i] = { ...next[i], kg };
                              return { ...s, [row.index]: next };
                            })
                          }
                        />
                        {type.code === 'water' ? (
                          <AppInput
                            label="DRC (%)"
                            keyboardType="decimal-pad"
                            value={itemsByIndex[row.index]?.[i]?.drcPercent ?? ''}
                            onChangeText={(drcPercent) =>
                              setItemsByIndex((s) => {
                                const next = [...s[row.index]];
                                next[i] = { ...next[i], drcPercent };
                                return { ...s, [row.index]: next };
                              })
                            }
                          />
                        ) : null}
                      </VStack>
                    ))}
                  </HStack>
                  <AppInput
                    label="Ghi chú"
                    value={notesByIndex[row.index] ?? ''}
                    onChangeText={(notes) => setNotesByIndex((s) => ({ ...s, [row.index]: notes }))}
                  />
                </VStack>
              </Box>
            );
          })}

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
        <AppButton onPress={handleSaveAll} isLoading={saving} isDisabled={rows.length === 0 || allConfirmed}>
          {allConfirmed ? 'Đã lưu tất cả' : `Lưu tất cả (${rows.length} dòng)`}
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

  const [itemsByIndex, setItemsByIndex] = useState<Record<number, ItemFieldValue[]>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, itemsToFieldValues(r.data!.items, latexTypes)])),
  );
  const [statusByIndex, setStatusByIndex] = useState<Record<number, RowStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.index, 'draft' as RowStatus])),
  );
  const [saving, setSaving] = useState(false);

  const allConfirmed = rows.every((r) => statusByIndex[r.index] === 'confirmed');

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
    });
    if (successCount === rows.length) onDone();
  }

  return (
    <VStack className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <VStack space="md">
          <ReviewHeader title="Xem lại — Sổ bán mủ" response={response} />

          {rows.map((row) => {
            const data = row.data!;
            const status = statusByIndex[row.index];
            const lowConfidence = parseLowConfidenceFields(data.lowConfidenceFields);
            return (
              <Box key={row.index} className="border border-border rounded-md p-3">
                <VStack space="sm">
                  <HStack className="items-center justify-between">
                    <AppText className="font-semibold">{data.teamName}</AppText>
                    <Box
                      className={`rounded-full px-2 py-0.5 ${
                        status === 'confirmed' ? 'bg-accent' : status === 'error' ? 'bg-destructive' : 'bg-muted'
                      }`}
                    >
                      <AppText size="xs" className={status === 'error' ? 'text-white' : undefined}>
                        {status === 'confirmed' ? 'Đã xác nhận' : status === 'error' ? 'Lỗi' : 'Chưa xác nhận'}
                      </AppText>
                    </Box>
                  </HStack>
                  {lowConfidence.length > 0 ? (
                    <AppText size="xs" className="text-destructive">
                      {`⚠ AI không chắc: ${lowConfidence.join(', ')}`}
                    </AppText>
                  ) : null}

                  <HStack space="sm" className="flex-wrap">
                    {latexTypes.map((type, i) => (
                      <VStack key={type.id} space="xs" className="flex-1" style={{ minWidth: 110 }}>
                        <AppInput
                          label={`${type.label} (${type.unit})`}
                          keyboardType="decimal-pad"
                          value={itemsByIndex[row.index]?.[i]?.kg ?? ''}
                          onChangeText={(kg) =>
                            setItemsByIndex((s) => {
                              const next = [...s[row.index]];
                              next[i] = { ...next[i], kg };
                              return { ...s, [row.index]: next };
                            })
                          }
                        />
                        {type.code === 'water' ? (
                          <AppInput
                            label="DRC (%)"
                            keyboardType="decimal-pad"
                            value={itemsByIndex[row.index]?.[i]?.drcPercent ?? ''}
                            onChangeText={(drcPercent) =>
                              setItemsByIndex((s) => {
                                const next = [...s[row.index]];
                                next[i] = { ...next[i], drcPercent };
                                return { ...s, [row.index]: next };
                              })
                            }
                          />
                        ) : null}
                      </VStack>
                    ))}
                  </HStack>
                </VStack>
              </Box>
            );
          })}

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
        <AppButton onPress={handleSaveAll} isLoading={saving} isDisabled={rows.length === 0 || allConfirmed}>
          {allConfirmed ? 'Đã lưu tất cả' : `Lưu tất cả (${rows.length} dòng)`}
        </AppButton>
      </Box>
    </VStack>
  );
}
