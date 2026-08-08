import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function ProductionRecordsReportScreen() {
  return (
    <PlaceholderScreen
      title="Báo cáo sản lượng cá nhân"
      description="Group theo nhân viên, subtotal theo Tổ — chỉ tính bản ghi CONFIRMED. Xuất Excel/PDF."
      reference="docs/adr/0014-report-export-delivery-per-platform.md, services/api ReportController"
    />
  );
}
