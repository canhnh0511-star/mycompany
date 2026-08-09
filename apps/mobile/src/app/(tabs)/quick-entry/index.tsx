import { useState } from 'react';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { AppButton } from '@/components/AppButton';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { ProductionQuickEntryForm } from '@/features/production-records/QuickEntryForm';
import { LatexSaleQuickEntryForm } from '@/features/latex-sales/QuickEntryForm';

type Tab = 'production' | 'latex-sale' | 'attendance';

/**
 * Tab "Nhập tay nhanh" — seg control 3 loại phiếu theo wireframe (Sản lượng/Bán mủ/Chuyên cần).
 * Chuyên cần (attendance-records) chưa build — data shape khác hẳn (attendanceType + quantity, không
 * phải danh sách loại mủ), để `PlaceholderScreen` chờ tới lượt.
 */
export default function QuickEntryScreen() {
  const [tab, setTab] = useState<Tab>('production');

  return (
    <Box className="flex-1 bg-background">
      <HStack className="p-4 pb-0" space="xs">
        <SegButton label="Sản lượng" active={tab === 'production'} onPress={() => setTab('production')} />
        <SegButton label="Bán mủ" active={tab === 'latex-sale'} onPress={() => setTab('latex-sale')} />
        <SegButton label="Chuyên cần" active={tab === 'attendance'} onPress={() => setTab('attendance')} />
      </HStack>

      {tab === 'production' ? <ProductionQuickEntryForm /> : null}
      {tab === 'latex-sale' ? <LatexSaleQuickEntryForm /> : null}
      {tab === 'attendance' ? (
        <PlaceholderScreen
          title="Chuyên cần"
          description="Chưa build — data shape khác (attendanceType + quantity), xem features/attendance-records/README.md."
          reference="docs/adr/0007-batch-manual-entry-best-effort.md, features/attendance-records/"
        />
      ) : null}
    </Box>
  );
}

function SegButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AppButton variant={active ? 'default' : 'outline'} size="sm" onPress={onPress}>
      {label}
    </AppButton>
  );
}
