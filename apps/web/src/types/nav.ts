import type { ReactNode } from 'react';

/** 1 mục điều hướng trong sidebar — spec §3/§47. */
export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  /** READY = đã implement; PENDING = route tồn tại nhưng hiển thị "Đang phát triển". */
  status: 'ready' | 'pending';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Nhãn nhóm CÓ icon, style như 1 NavRow bình thường (khác `NavGroup.label` — chữ hoa nhỏ, không
 * icon) — dùng cho mục cha "expandable" (vd "Sản lượng"). KHÔNG có `path`/`status`: bản thân nhãn
 * này không phải 1 trang, chỉ để mở nhóm — click không điều hướng đi đâu. */
export interface NavExpandableParent {
  label: string;
  icon: ReactNode;
}

/** 1 khối trong sidebar, theo đúng thứ tự render:
 * - `item` — 1 mục đứng riêng.
 * - `group` — nhãn nhóm nhỏ viết hoa (vd "CÀI ĐẶT") + danh sách mục, luôn hiện đủ.
 * - `expandable` — mục cha có icon (style như NavRow) + danh sách con thụt vào, luôn mở (không có
 *   tương tác collapse ở v1 — khác `group` ở chỗ mục cha PHẢI có icon, được style nổi bật hơn nhãn
 *   nhóm, dùng cho 1 feature area cụ thể thay vì 1 category rộng).
 */
export type SidebarSection =
  | { kind: 'item'; item: NavItem }
  | { kind: 'group'; group: NavGroup }
  | { kind: 'expandable'; parent: NavExpandableParent; children: NavItem[] };
