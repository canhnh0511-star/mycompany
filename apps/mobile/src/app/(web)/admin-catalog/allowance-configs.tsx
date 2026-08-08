import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AllowanceConfigsScreen() {
  return (
    <PlaceholderScreen
      title="Phụ cấp / Khấu trừ"
      description="Khai báo cấu hình cho Module 3 (tính lương) sau này — storm_allowance, medication, attendance, lighting, tapping_work. Module 1 chỉ khai báo, chưa tính lương."
      reference="services/api AllowanceConfigController"
    />
  );
}
