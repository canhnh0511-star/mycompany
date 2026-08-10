import { useLocalSearchParams } from 'expo-router';
import { ProductionRecordDetailScreen } from '@/features/lookup/ProductionRecordDetailScreen';

export default function ProductionRecordDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductionRecordDetailScreen id={id} />;
}
