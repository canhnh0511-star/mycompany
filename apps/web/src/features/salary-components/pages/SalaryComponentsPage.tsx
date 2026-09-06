import { useState } from 'react';
import { Stack, Tab, Tabs, Typography } from '@mui/material';
import { neutral } from '../../../theme/colors';
import { AllowanceConfigsTab } from '../components/AllowanceConfigsTab';
import { MixedLatexRateTab } from '../components/MixedLatexRateTab';
import { TechnicalGradeConfigsTab } from '../components/TechnicalGradeConfigsTab';
import { WaterRateTab } from '../components/WaterRateTab';

const TAB_KEYS = ['water', 'mixed', 'allowance', 'grade'] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * "Thành phần lương" — CRUD 4 cấu hình time-versioned nuôi công thức tính Bảng lương (Module 3):
 * Mủ nước (`rate_configs`, scope latex_type=water), Mủ tạp (`payroll_mixed_latex_rate_configs`),
 * Phụ cấp/khấu trừ (`allowance_configs`), Hạng kỹ thuật (`technical_grade_configs`). Backend đã có
 * đầy đủ (docs/specs/spec-3-bang-luong-v1-draft.md mục 5/7 phase 5) — gọi thẳng, không cần fixture.
 * Không có DELETE ở bất kỳ tab nào — giữ lịch sử đơn giá, "xóa" 1 dòng là đặt lại `effectiveTo`.
 */
export function SalaryComponentsPage() {
  const [tab, setTab] = useState<TabKey>('water');

  return (
    <Stack spacing={2.5}>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
        Khai báo đơn giá/phụ cấp dùng để tính Bảng lương — sửa ở đây có hiệu lực ngay cho mọi tháng
        đang xem, không ảnh hưởng số liệu các tháng đã chốt trước đó.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_event, value: TabKey) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: `1px solid ${neutral[200]}`, minHeight: 40 }}
      >
        <Tab value="water" label="Mủ nước" sx={{ minHeight: 40 }} />
        <Tab value="mixed" label="Mủ tạp" sx={{ minHeight: 40 }} />
        <Tab value="allowance" label="Phụ cấp / Khấu trừ" sx={{ minHeight: 40 }} />
        <Tab value="grade" label="Hạng kỹ thuật" sx={{ minHeight: 40 }} />
      </Tabs>

      {tab === 'water' && <WaterRateTab />}
      {tab === 'mixed' && <MixedLatexRateTab />}
      {tab === 'allowance' && <AllowanceConfigsTab />}
      {tab === 'grade' && <TechnicalGradeConfigsTab />}
    </Stack>
  );
}
