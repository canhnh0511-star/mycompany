import { useLocalSearchParams } from 'expo-router';
import { TeamBreakdownScreen } from '@/features/production-summary/TeamBreakdownScreen';

export default function TeamBreakdownRoute() {
  const { teamId, workDate, latexTypeCode } = useLocalSearchParams<{
    teamId: string;
    workDate: string;
    latexTypeCode?: string;
  }>();
  return <TeamBreakdownScreen teamId={teamId} workDate={workDate} latexTypeCode={latexTypeCode} />;
}
