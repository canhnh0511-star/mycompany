import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TeamsScreen() {
  return (
    <PlaceholderScreen
      title="Quản lý Tổ"
      description="CRUD Tổ (name/description) — không có DELETE ở v1 (được employees/production_records/latex_sales tham chiếu)."
      reference="services/api TeamController, features/admin-catalog/"
    />
  );
}
