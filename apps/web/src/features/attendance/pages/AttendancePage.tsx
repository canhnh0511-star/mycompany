import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { AttendanceEntryPage } from './AttendanceEntryPage';
import { AttendanceListPage } from './AttendanceListPage';

/** Ngày làm việc (/ngay-lam-viec) — Tabs "Chấm công" / "Danh sách". */
export function AttendancePage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }}>
        <Tab label="Chấm công" />
        <Tab label="Danh sách" />
      </Tabs>
      {tab === 0 && <AttendanceEntryPage />}
      {tab === 1 && <AttendanceListPage />}
    </Box>
  );
}
