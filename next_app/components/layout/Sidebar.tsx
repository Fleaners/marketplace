'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getHomeNavigationHref, isSellerDashboardRoute, navigateToMarketplaceHome } from '@/lib/navigation';

export interface NavigationItem {
  icon?: React.ReactNode;
  label: string;
  href: string;
  badge?: number | string;
  showOnMobile?: boolean;
}

export interface SidebarProps {
  items: NavigationItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ items, collapsed = false, onCollapse, user, onLogout }, ref) => {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0 bg-[#fff6e6] text-[#1f2937] border-r border-[#f3d9a7] transition-all duration-200',
          collapsed ? 'w-20' : 'w-56'
        )}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-[#f3d9a7]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToMarketplaceHome(window)}
              aria-label="Open marketplace homepage"
              className="flex items-center gap-3 focus:outline-none"
            >
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#FAB12F] to-[#f59e0b] flex items-center justify-center text-sm font-bold text-slate-950">
                SH
              </div>
              {!collapsed && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">Marketplace</p>
                  <p className="text-sm font-extrabold text-[#1f2937]">Seller Hub</p>
                </div>
              )}
            </button>
          </div>
          <button
            onClick={() => onCollapse?.(!collapsed)}
            className="p-2 rounded-2xl bg-white border border-[#f3d9a7] hover:bg-[#fff0db] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-testid="sidebar-toggle"
          >
            <svg className="w-5 h-5 text-[#1f2937]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const isLogout = item.href === '/logout';
            const isHomeItem = item.label === 'Home' && item.href === '/';
            const isDashboardItem = item.label === 'Seller Dashboard' && item.href === '/dashboard';
            const resolvedHref = isHomeItem ? getHomeNavigationHref() : item.href;
            const isActive = !isLogout && !isHomeItem && !isDashboardItem && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const isDashboardContextActive = !isLogout && isDashboardItem && isSellerDashboardRoute(pathname);
            const activeState = isActive || isDashboardContextActive;
            
            const handleItemClick = (e: React.MouseEvent) => {
              if (isLogout) {
                e.preventDefault();
                onLogout?.();
              } else if (isHomeItem) {
                e.preventDefault();
                navigateToMarketplaceHome(window);
              }
            };

            if (isHomeItem) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={handleItemClick}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-3xl px-3 py-3 transition-all duration-200 text-sm font-semibold cursor-pointer text-left',
                    activeState
                      ? 'bg-white text-[#1f2937] shadow-[0_8px_24px_rgba(245,158,11,0.12)] border border-[#f3d9a7]'
                      : 'text-[#475569] hover:text-[#111827] hover:bg-white/50'
                  )}
                  data-testid="nav-item-home"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-3xl transition-all duration-200', activeState ? 'bg-[#FAB12F] text-[#111827]' : 'bg-white border border-[#f3d9a7] text-[#475569] group-hover:bg-[#fff0db] group-hover:text-[#111827]')}>
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={isLogout ? '#' : resolvedHref}
                onClick={handleItemClick}
                className={cn(
                  'group flex items-center gap-3 rounded-3xl px-3 py-3 transition-all duration-200 text-sm font-semibold cursor-pointer',
                  activeState
                    ? 'bg-white text-[#1f2937] shadow-[0_8px_24px_rgba(245,158,11,0.12)] border border-[#f3d9a7]'
                    : 'text-[#475569] hover:text-[#111827] hover:bg-white/50'
                )}
                data-testid={`nav-item-${item.href}`}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-3xl transition-all duration-200', activeState ? 'bg-[#FAB12F] text-[#111827]' : 'bg-white border border-[#f3d9a7] text-[#475569] group-hover:bg-[#fff0db] group-hover:text-[#111827]')}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#f3d9a7] p-4">
          <div className="rounded-[28px] border border-[#f3d9a7] bg-white p-4 shadow-[0_12px_36px_rgba(245,158,11,0.06)]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-[#FAB12F] to-[#f59e0b] flex items-center justify-center text-sm font-bold text-[#111827] uppercase">
                {user?.name ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2) : 'GE'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1f2937]">{user?.name || "Gaurav Enterprise"}</p>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#475569] font-bold">Growth Plan</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[#f59e0b]">
                    <span>★</span>
                    <span className="font-extrabold text-[#1f2937]">4.9</span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="mt-4 space-y-2">
                <Button variant="secondary" size="sm" className="w-full justify-center rounded-2xl border-[#f3d9a7] bg-white text-[#1f2937] hover:bg-[#fff0db] font-bold">
                  Quick Settings
                </Button>
                <button
                  onClick={() => setMenuOpen((value) => !value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-3 py-2 text-left text-sm font-bold text-[#1f2937] hover:bg-[#fff0db]"
                  aria-label="Open seller menu"
                >
                  Manage account
                </button>
                {menuOpen && (
                  <div className="space-y-2 rounded-3xl border border-[#f3d9a7] bg-white p-3 shadow-lg">
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold text-[#1f2937] hover:bg-[#fff6e6]" onClick={() => setMenuOpen(false)}>
                      Account details
                    </button>
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold text-[#1f2937] hover:bg-[#fff6e6]" onClick={() => setMenuOpen(false)}>
                      Support center
                    </button>
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-rose-500 hover:bg-[#fff6e6]" onClick={onLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
