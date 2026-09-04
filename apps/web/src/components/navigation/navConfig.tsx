import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { NavGroup, NavItem, SidebarSection } from '../../types/nav';

/**
 * Information Architecture — spec §3. Chỉ "Tổng quan" ở trạng thái READY;
 * mọi mục còn lại là PENDING PREVIEW (spec §44) — route tồn tại nhưng chỉ
 * render placeholder "Đang phát triển" (§47), không tự invent UI/business
 * behavior cho các màn chưa được duyệt.
 */
export const overviewNavItem: NavItem = {
  label: 'Tổng quan',
  path: '/',
  icon: <HomeRoundedIcon fontSize="small" />,
  status: 'ready',
};

export const reportsNavItem: NavItem = {
  label: 'Báo cáo',
  path: '/bao-cao',
  icon: <AssessmentRoundedIcon fontSize="small" />,
  status: 'pending',
};

export const navGroups: NavGroup[] = [
  {
    label: 'Công việc hằng ngày',
    items: [
      { label: 'Phiếu', path: '/phieu', icon: <DescriptionRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Sản lượng', path: '/san-luong', icon: <BarChartRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Ngày làm việc', path: '/ngay-lam-viec', icon: <EventAvailableRoundedIcon fontSize="small" />, status: 'pending' },
    ],
  },
  {
    label: 'Tiền & vận hành',
    items: [
      { label: 'Bảng lương', path: '/bang-luong', icon: <PaymentsRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Bán mủ', path: '/ban-mu', icon: <StorefrontRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Chi phí', path: '/chi-phi', icon: <ReceiptLongRoundedIcon fontSize="small" />, status: 'pending' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { label: 'Thành phần lương', path: '/thanh-phan-luong', icon: <TuneRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Cấu hình hệ thống', path: '/cau-hinh-he-thong', icon: <SettingsRoundedIcon fontSize="small" />, status: 'pending' },
      { label: 'Hồ sơ', path: '/ho-so', icon: <PersonRoundedIcon fontSize="small" />, status: 'pending' },
    ],
  },
];

export const allNavItems: NavItem[] = [
  overviewNavItem,
  reportsNavItem,
  ...navGroups.flatMap((group) => group.items),
];

/**
 * Thứ tự render đầy đủ của sidebar (spec §3): 2 group công việc trước,
 * "Báo cáo" đứng riêng, rồi mới tới group "Cài đặt".
 */
export const sidebarSections: SidebarSection[] = [
  { kind: 'group', group: navGroups[0] },
  { kind: 'group', group: navGroups[1] },
  { kind: 'item', item: reportsNavItem },
  { kind: 'group', group: navGroups[2] },
];
