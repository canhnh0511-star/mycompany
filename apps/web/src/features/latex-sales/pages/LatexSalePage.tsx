import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { LatexSaleEntryPage } from './LatexSaleEntryPage';
import { LatexSalesListPage } from './LatexSalesListPage';

/** Bán mủ (/ban-mu) — Tabs "Nhập liệu" / "Danh sách", cùng convention `SystemConfigPage`. */
export function LatexSalePage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }}>
        <Tab label="Nhập liệu" />
        <Tab label="Danh sách" />
      </Tabs>
      {tab === 0 && <LatexSaleEntryPage />}
      {tab === 1 && <LatexSalesListPage />}
    </Box>
  );
}
