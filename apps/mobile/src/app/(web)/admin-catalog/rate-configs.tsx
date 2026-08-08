import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function RateConfigsScreen() {
  return (
    <PlaceholderScreen
      title="Đơn giá theo thời gian"
      description="Đơn giá theo latex_type_id, hiệu lực theo effective_from/to, không chồng lấn. Không có DELETE (giữ lịch sử đơn giá)."
      reference="services/api RateConfigController"
    />
  );
}
