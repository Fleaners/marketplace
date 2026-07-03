'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar, type NavigationItem } from './Sidebar';
import { TopBar, type TopBarProps } from './TopBar';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  navigationItems: NavigationItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  topBarProps?: Partial<TopBarProps>;
  sidebarCollapsed?: boolean;
  onSidebarCollapse?: (collapsed: boolean) => void;
}

const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  (
    {
      children,
      navigationItems,
      user,
      onLogout,
      topBarProps,
      sidebarCollapsed = false,
      onSidebarCollapse,
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = React.useState(sidebarCollapsed);
    const pathname = usePathname();
    const router = useRouter();

    const handleSidebarCollapse = (isCollapsed: boolean) => {
      setCollapsed(isCollapsed);
      onSidebarCollapse?.(isCollapsed);
    };

    return (
      <div ref={ref} className="flex min-h-screen bg-slate-950 text-slate-100 flex-col lg:flex-row pb-20 lg:pb-0">
        <Sidebar
          items={navigationItems}
          collapsed={collapsed}
          onCollapse={handleSidebarCollapse}
          user={user}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <TopBar {...topBarProps} onLogout={onLogout} />

          <main className="flex-1 overflow-y-auto bg-slate-950 px-4 pb-10 pt-6 text-slate-100 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav 
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-2 py-2.5 shadow-[0_-16px_36px_rgba(0,0,0,0.4)]"
          aria-label="Mobile Navigation"
        >
          {navigationItems.map((item) => {
            const isLogout = item.href === '/logout';
            const isActive = !isLogout && (pathname === item.href || pathname.startsWith(item.href + '/'));

            const handleMobileClick = (e: React.MouseEvent) => {
              if (isLogout) {
                e.preventDefault();
                onLogout?.();
              }
            };

            return (
              <Link
                key={item.href}
                href={isLogout ? '#' : item.href}
                onClick={handleMobileClick}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1',
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <span className={cn(
                  'text-xl flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200',
                  isActive ? 'bg-accent-500/10 text-accent-400' : ''
                )}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium tracking-wide leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';

export { DashboardLayout };
