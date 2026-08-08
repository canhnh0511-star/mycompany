import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function QuickEntryScreen() {
  return (
    <PlaceholderScreen
      title="Nhập tay nhanh"
      description="Form nhiều dòng/tổ/ngày cho Sản lượng cá nhân / Bán mủ / Công chuyên cần, lưu best-effort theo từng dòng."
      reference="docs/adr/0007-batch-manual-entry-best-effort.md, docs/adr/0013-quick-entry-form-stack.md, features/production-records/ + features/latex-sales/ + features/attendance-records/"
    />
  );
}
