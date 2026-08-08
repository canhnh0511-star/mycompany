import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function EmployeesScreen() {
  return (
    <PlaceholderScreen
      title="Quản lý Nhân viên"
      description="CRUD nhân viên, đổi status active/inactive, đổi Tổ. Lọc theo team_id/status."
      reference="services/api EmployeeController, features/admin-catalog/"
    />
  );
}
