export interface NavigationItem {
  icon?: string;
  label: string;
  href: string;
  badge?: number | string;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Products', href: '/dashboard/products', icon: '📦' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
  { label: 'Inventory', href: '/dashboard/inventory', icon: '📋' },
  { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
  { label: 'Logout', href: '/logout', icon: '🚪' },
];
