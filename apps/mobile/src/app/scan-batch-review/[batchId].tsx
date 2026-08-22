import { useLocalSearchParams } from 'expo-router';
import { BatchReviewScreen } from '@/features/ocr-capture/BatchReviewScreen';

/** Route riêng full-screen, KHÔNG nằm trong (tabs) — không có tab bar, có nút back về Chụp ảnh
 * (ADR-0019 mục 1). 0021-scan-batch-model — thay thế `/ocr-review/[logId]` cũ. */
export default function ScanBatchReviewRoute() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  return <BatchReviewScreen batchId={batchId} />;
}
