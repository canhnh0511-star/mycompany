import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function CaptureScreen() {
  return (
    <PlaceholderScreen
      title="Chụp ảnh"
      description="Chọn loại phiếu (Sổ ghi mủ / Sổ bán mủ) → chụp liên tục hoặc chọn nhiều ảnh từ thư viện → OCR đọc → bảng review draft. Chờ wireframe chốt layout trước khi build (docs/frontend-grilling-plan.md §5)."
      reference="docs/adr/0011-ocr-capture-flow-v1-scope.md, features/ocr-capture/"
    />
  );
}
