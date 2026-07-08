export interface NavigationItem {
  icon?: string;
  label: string;
  href: string;
  badge?: number | string;
  showOnMobile?: boolean;
}

export const MARKETPLACE_HOME_ROUTE = '/';
export const SELLER_DASHBOARD_ROUTE = '/dashboard';
export const SELLER_DASHBOARD_BASE_PATH = '/dashboard';

export function isSellerDashboardRoute(pathname: string): boolean {
  return pathname === SELLER_DASHBOARD_ROUTE || pathname.startsWith(`${SELLER_DASHBOARD_ROUTE}/`);
}

export function getHomeNavigationHref(): string {
  return MARKETPLACE_HOME_ROUTE;
}

export function navigateToMarketplaceHome(windowRef: Window | null = typeof window !== 'undefined' ? window : null): void {
  if (!windowRef) return;
  windowRef.location.assign('/');
}

export const navigationItems: NavigationItem[] = [
  { label: 'Home', href: MARKETPLACE_HOME_ROUTE, icon: '🏠', showOnMobile: true },
  { label: 'Products', href: '/dashboard/products', icon: '📦', showOnMobile: true },
  { label: 'Orders', href: '/dashboard/orders', icon: '📝', showOnMobile: true },
  { label: 'Leads', href: '/dashboard/leads', icon: '💬', showOnMobile: true },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
  { label: 'AI Insights', href: '/dashboard/ai-insights', icon: '🧠', badge: 'AI', showOnMobile: true },
  { label: 'Advertising', href: '/dashboard/advertising', icon: '📢', showOnMobile: true },
  { label: 'Inventory', href: '/dashboard/inventory', icon: '📋' },
  { label: 'Reviews', href: '/dashboard/reviews', icon: '⭐' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️', showOnMobile: true },
  { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
  { label: 'Seller Dashboard', href: SELLER_DASHBOARD_ROUTE, icon: '🏢', showOnMobile: true },
  { label: 'Logout', href: '/logout', icon: '🚪' },
];

