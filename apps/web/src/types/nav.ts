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

/** 1 khối trong sidebar, theo đúng thứ tự render — item đứng riêng hoặc cả group. */
export type SidebarSection = { kind: 'item'; item: NavItem } | { kind: 'group'; group: NavGroup };
