'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface NavigationItem {
  icon?: React.ReactNode;
  label: string;
  href: string;
  badge?: number | string;
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
          'hidden lg:flex flex-col h-screen sticky top-0 bg-slate-950 text-slate-100 border-r border-slate-800 transition-all duration-200',
          collapsed ? 'w-20' : 'w-56'
        )}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-accent-500 to-slate-800 flex items-center justify-center text-sm font-semibold text-slate-950">
              SH
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] uppercase text-slate-400">Marketplace</p>
                <p className="text-base font-semibold text-white">Seller Hub</p>
              </div>
            )}
          </div>
          <button
            onClick={() => onCollapse?.(!collapsed)}
            className="p-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-testid="sidebar-toggle"
          >
            <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const isLogout = item.href === '/logout';
            const isActive = !isLogout && (pathname === item.href || pathname.startsWith(item.href + '/'));
            
            const handleItemClick = (e: React.MouseEvent) => {
              if (isLogout) {
                e.preventDefault();
                onLogout?.();
              }
            };

            return (
              <Link
                key={item.href}
                href={isLogout ? '#' : item.href}
                onClick={handleItemClick}
                className={cn(
                  'group flex items-center gap-3 rounded-3xl px-3 py-3 transition-all duration-200 text-sm font-medium cursor-pointer',
                  isActive
                    ? 'bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                )}
                data-testid={`nav-item-${item.href}`}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-3xl transition-all duration-200', isActive ? 'bg-accent-500 text-slate-950' : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-white')}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-accent-500 to-slate-800 flex items-center justify-center text-sm font-semibold text-slate-950">
                JS
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">John's Studio</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Growth Plan</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-300">
                    <span>★</span>
                    <span className="font-semibold text-slate-100">4.9</span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="mt-4 space-y-2">
                <Button variant="secondary" size="sm" className="w-full justify-center">
                  Quick Settings
                </Button>
                <button
                  onClick={() => setMenuOpen((value) => !value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800"
                  aria-label="Open seller menu"
                >
                  Manage account
                </button>
                {menuOpen && (
                  <div className="space-y-2 rounded-3xl border border-slate-800 bg-slate-950 p-3">
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900" onClick={() => setMenuOpen(false)}>
                      Account details
                    </button>
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900" onClick={() => setMenuOpen(false)}>
                      Support center
                    </button>
                    <button className="w-full rounded-2xl px-3 py-2 text-left text-sm text-rose-400 hover:bg-slate-900" onClick={onLogout}>
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
