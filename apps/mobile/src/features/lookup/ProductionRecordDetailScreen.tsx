import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { SkeletonDetail } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppToast } from '@/components/useAppToast';
import { diffSnapshots } from '@/features/edit-history/diff';
import { useEditHistoryQuery } from '@/features/edit-history/useEditHistory';
import { useCancelProductionRecordMutation, useProductionRecordQuery } from '@/features/production-records/useProductionRecordsList';
import { ApiError } from '@/lib/api/client';
import { recordStatusLabel, recordStatusTone } from '@/lib/status';

/** Chi tiết Sản lượng cá nhân — ảnh gốc + bảng khối lượng theo loại mủ + lịch sử chỉnh sửa + hủy
 * (không hard delete, CLAUDE.md §4). Route riêng full-screen, back về tab Tra cứu. */
export function ProductionRecordDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: record, isLoading } = useProductionRecordQuery(id);
  const { data: history } = useEditHistoryQuery('production_records', id);
  const cancelMutation = useCancelProductionRecordMutation();
  const { showToast } = useAppToast();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync(id);
      showToast({ title: 'Đã hủy bản ghi', variant: 'success' });
      router.back();
    } catch (err) {
      showToast({
        title: 'Không hủy được',
        description: err instanceof ApiError ? err.message : 'Lỗi không xác định',
        variant: 'error',
      });
    } finally {
      setConfirmingCancel(false);
    }
  }

  if (isLoading || !record) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
        <SkeletonDetail lines={6} />
      </ScrollView>
    );
  }

  const total = record.items.reduce((sum, i) => sum + i.kg, 0);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <VStack space="md">
        <Pressable onPress={() => router.back()}>
          <AppText size="sm" className="text-primary">
            ‹ Tra cứu
          </AppText>
        </Pressable>

        <HStack className="items-center justify-between">
          <VStack>
            <AppHeading size="lg">{record.employeeName}</AppHeading>
            <AppText size="sm" className="text-muted-foreground">
              {`${record.teamName} · ${record.recordDate} · nguồn: ${record.source === 'ocr_import' ? 'chụp ảnh' : 'nhập tay'}`}
            </AppText>
          </VStack>
          <StatusBadge label={recordStatusLabel(record.status)} tone={recordStatusTone(record.status)} />
        </HStack>

        {record.photoUrl ? (
          <AppButton variant="outline" onPress={() => Linking.openURL(record.photoUrl!)}>
            Xem ảnh gốc
          </AppButton>
        ) : null}

        <AppCard className="p-0 overflow-hidden">
          {record.items.map((item, i) => (
            <HStack
              key={item.latexTypeId}
              className={`items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <AppText>{item.latexTypeCode}</AppText>
              <AppText className="font-mono">{`${item.kg} kg${item.drcPercent != null ? ` · DRC ${item.drcPercent}%` : ''}`}</AppText>
            </HStack>
          ))}
          <HStack className="items-center justify-between px-3 py-2 border-t border-border bg-muted">
            <AppText className="font-semibold">Tổng</AppText>
            <AppText className="font-mono font-semibold">{`${total.toFixed(1)} kg`}</AppText>
          </HStack>
        </AppCard>

        {record.notes ? (
          <AppText size="sm" className="text-muted-foreground">
            {`Ghi chú: ${record.notes}`}
          </AppText>
        ) : null}

        {record.status !== 'CANCELLED' ? (
          confirmingCancel ? (
            <HStack space="sm">
              <AppButton variant="destructive" isLoading={cancelMutation.isPending} onPress={handleCancel}>
                Xác nhận hủy bản ghi
              </AppButton>
              <AppButton variant="outline" onPress={() => setConfirmingCancel(false)}>
                Không
              </AppButton>
            </HStack>
          ) : (
            <AppButton variant="destructive" onPress={() => setConfirmingCancel(true)}>
              Hủy bản ghi
            </AppButton>
          )
        ) : null}

        <Box className="border-t border-border pt-3">
          <AppText size="xs" className="text-muted-foreground mb-2">
            Lịch sử chỉnh sửa
          </AppText>
          {history && history.length > 0 ? (
            <VStack space="md">
              {history.map((h) => {
                const lines = diffSnapshots(h.oldData, h.newData);
                return (
                  <Box key={h.id}>
                    <AppText size="xs" className="text-muted-foreground">
                      {`${new Date(h.editedAt).toLocaleString('vi-VN')} · ${h.editedByName}`}
                    </AppText>
                    {lines.length > 0 ? (
                      <VStack space="xs" className="mt-1">
                        {lines.map((line, i) => (
                          <AppText key={i} size="sm">
                            {`${line.label}: ${line.before} → ${line.after}`}
                          </AppText>
                        ))}
                      </VStack>
                    ) : (
                      <AppText size="sm" className="text-muted-foreground mt-1">
                        Không có thay đổi field nào đọc được (snapshot giống nhau).
                      </AppText>
                    )}
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <AppText size="sm" className="text-muted-foreground">
              Chưa có lần sửa nào sau khi tạo.
            </AppText>
          )}
        </Box>
      </VStack>
    </ScrollView>
  );
}
