import { useLocalSearchParams } from 'expo-router';
import { OcrReviewScreen } from '@/features/ocr-capture/OcrReviewScreen';

/** Route riêng full-screen, KHÔNG nằm trong (tabs) — không có tab bar, có nút back về Chụp ảnh
 * (ADR-0019 mục 1). `logId` = `ocrCallLogId`, dùng để tra response trong `reviewStore`. */
export default function OcrReviewRoute() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  return <OcrReviewScreen logId={logId} />;
}
