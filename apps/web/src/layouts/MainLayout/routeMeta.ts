import { allNavItems } from '../../components/navigation/navConfig';

/** Tiêu đề top bar theo route hiện tại — fallback về nhãn nav item. */
export function getPageTitle(pathname: string): string {
  const match = allNavItems.find((item) => item.path === pathname);
  return match?.label ?? 'Nông trường cao su';
}
