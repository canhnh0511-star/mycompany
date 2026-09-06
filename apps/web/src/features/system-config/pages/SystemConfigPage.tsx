import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { TeamsConfigTab } from '../components/TeamsConfigTab';
import { EmployeesConfigTab } from '../components/EmployeesConfigTab';

/** Cấu hình hệ thống — CRUD danh mục Tổ + Nhân viên (CLAUDE.md §1: "Đặt nền móng ... để tái dùng
 * cho Module 2/3"). Cấu trúc Tabs giống hệt `SalaryComponentsPage` (variant="scrollable" theo chuẩn
 * đã chốt ở UI audit vòng 1). */
export function SystemConfigPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }}>
        <Tab label="Tổ" />
        <Tab label="Nhân viên" />
      </Tabs>
      {tab === 0 && <TeamsConfigTab />}
      {tab === 1 && <EmployeesConfigTab />}
    </Box>
  );
}
