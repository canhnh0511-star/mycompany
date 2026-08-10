import { useLocalSearchParams } from 'expo-router';
import { LatexSaleDetailScreen } from '@/features/lookup/LatexSaleDetailScreen';

export default function LatexSaleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LatexSaleDetailScreen id={id} />;
}
