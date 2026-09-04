import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import type { NavGroup, NavItem, SidebarSection } from '../../types/nav';

/**
 * Information Architecture — spec §3. Chỉ "Tổng quan" ở trạng thái READY;
 * mọi mục còn lại là PENDING PREVIEW (spec §44) — route tồn tại nhưng chỉ
 * render placeholder "Đang phát triển" (§47), không tự invent UI/business
 * behavior cho các màn chưa được duyệt.
 *
 * Icon: 1 family duy nhất — MUI Outlined (spec visual-alignment §6), mapping
 * cố định theo module, không trộn filled/rounded/outlined.
 */
export const overviewNavItem: NavItem = {
  label: 'Tổng quan',
  path: '/',
  icon: <HomeOutlinedIcon fontSize="small" />,
  status: 'ready',
};

export const reportsNavItem: NavItem = {
  label: 'Báo cáo',
  path: '/bao-cao',
  icon: <AssessmentOutlinedIcon fontSize="small" />,
  status: 'pending',
};

export const navGroups: NavGroup[] = [
  {
    label: 'Công việc hằng ngày',
    items: [
      { label: 'Phiếu', path: '/phieu', icon: <DescriptionOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Sản lượng', path: '/san-luong', icon: <BarChartOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Ngày làm việc', path: '/ngay-lam-viec', icon: <EventAvailableOutlinedIcon fontSize="small" />, status: 'pending' },
    ],
  },
  {
    label: 'Tiền & vận hành',
    items: [
      { label: 'Bảng lương', path: '/bang-luong', icon: <PaymentsOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Bán mủ', path: '/ban-mu', icon: <ShoppingCartOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Chi phí', path: '/chi-phi', icon: <ReceiptLongOutlinedIcon fontSize="small" />, status: 'pending' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { label: 'Thành phần lương', path: '/thanh-phan-luong', icon: <TuneOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Cấu hình hệ thống', path: '/cau-hinh-he-thong', icon: <SettingsOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Hồ sơ', path: '/ho-so', icon: <PersonOutlineOutlinedIcon fontSize="small" />, status: 'pending' },
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
