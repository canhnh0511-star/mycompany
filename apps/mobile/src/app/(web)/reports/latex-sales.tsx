import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function LatexSalesReportScreen() {
  return (
    <PlaceholderScreen
      title="Báo cáo bán mủ theo Tổ"
      description="Group theo Tổ — chỉ tính bản ghi CONFIRMED. Xuất Excel/PDF."
      reference="docs/adr/0014-report-export-delivery-per-platform.md, services/api ReportController"
    />
  );
}
