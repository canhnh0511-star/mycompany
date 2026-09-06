import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
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
 * Information Architecture — cập nhật theo mockup "Nhập phiếu hàng ngày" đã duyệt: "Sản lượng" giờ
 * là mục CHA (expandable) chứa 3 submenu, thay vì các mục rời rạc như bản cũ. Chỉ "Tổng quan"/
 * "Nhập phiếu hàng ngày"/"Bảng lương"/"Thành phần lương" ở trạng thái READY; còn lại PENDING PREVIEW
 * (spec §44) — route tồn tại nhưng chỉ render placeholder "Đang phát triển" (§47).
 *
 * Icon: 1 family duy nhất — MUI Outlined (spec visual-alignment §6), mapping cố định theo module,
 * không trộn filled/rounded/outlined.
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

/** "Ngày làm việc" trước đây nằm trong group "Công việc hằng ngày" cùng Phiếu/Sản lượng — group đó
 * bỏ đi sau khi 2 mục kia dời vào "Sản lượng" (expandable), còn lại đúng 1 mục nên đưa đứng riêng
 * thay vì giữ 1 group chỉ có 1 dòng. */
export const workingDayNavItem: NavItem = {
  label: 'Ngày làm việc',
  path: '/ngay-lam-viec',
  icon: <EventAvailableOutlinedIcon fontSize="small" />,
  status: 'pending',
};

/** "Sản lượng" — mục cha expandable, 3 submenu theo đúng mockup đã duyệt. "Danh sách phiếu" GIỮ
 * NGUYÊN path `/san-luong` cũ (chỉ đổi nhãn từ "Sản lượng") — Home (`TeamStatusPanel`) đang deep-link
 * `/san-luong?date=...`, đổi path sẽ gãy link đó. "Báo cáo sản lượng" là path MỚI, chưa có mockup
 * nên vẫn `pending` (ComingSoonPage).
 */
export const productionNavParent = {
  label: 'Sản lượng',
  icon: <BarChartOutlinedIcon fontSize="small" />,
};

export const productionNavChildren: NavItem[] = [
  { label: 'Nhập phiếu hàng ngày', path: '/phieu', icon: <DescriptionOutlinedIcon fontSize="small" />, status: 'ready' },
  { label: 'Danh sách phiếu', path: '/san-luong', icon: <FormatListBulletedOutlinedIcon fontSize="small" />, status: 'pending' },
  { label: 'Báo cáo sản lượng', path: '/san-luong/bao-cao', icon: <TrendingUpOutlinedIcon fontSize="small" />, status: 'pending' },
];

export const navGroups: NavGroup[] = [
  {
    label: 'Tiền & vận hành',
    items: [
      { label: 'Bảng lương', path: '/bang-luong', icon: <PaymentsOutlinedIcon fontSize="small" />, status: 'ready' },
      { label: 'Bán mủ', path: '/ban-mu', icon: <ShoppingCartOutlinedIcon fontSize="small" />, status: 'pending' },
      { label: 'Chi phí', path: '/chi-phi', icon: <ReceiptLongOutlinedIcon fontSize="small" />, status: 'pending' },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { label: 'Thành phần lương', path: '/thanh-phan-luong', icon: <TuneOutlinedIcon fontSize="small" />, status: 'ready' },
      { label: 'Cấu hình hệ thống', path: '/cau-hinh-he-thong', icon: <SettingsOutlinedIcon fontSize="small" />, status: 'ready' },
      { label: 'Hồ sơ', path: '/ho-so', icon: <PersonOutlineOutlinedIcon fontSize="small" />, status: 'ready' },
    ],
  },
];

export const allNavItems: NavItem[] = [
  overviewNavItem,
  reportsNavItem,
  workingDayNavItem,
  ...productionNavChildren,
  ...navGroups.flatMap((group) => group.items),
];

/**
 * Thứ tự render đầy đủ của sidebar: Tổng quan → Sản lượng (expandable) → Ngày làm việc → group
 * "Tiền & vận hành" → Báo cáo (đứng riêng, khác "Báo cáo sản lượng" trong group Sản lượng) → group
 * "Cài đặt".
 */
export const sidebarSections: SidebarSection[] = [
  { kind: 'expandable', parent: productionNavParent, children: productionNavChildren },
  { kind: 'item', item: workingDayNavItem },
  { kind: 'group', group: navGroups[0] },
  { kind: 'item', item: reportsNavItem },
  { kind: 'group', group: navGroups[1] },
];
