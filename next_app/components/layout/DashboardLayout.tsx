'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar, type NavigationItem } from './Sidebar';
import { TopBar, type TopBarProps } from './TopBar';
import { cn } from '@/lib/utils';
import { getHomeNavigationHref, isSellerDashboardRoute, navigateToMarketplaceHome } from '@/lib/navigation';

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
    const [isAuthorized, setIsAuthorized] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState<{ name: string; email: string; avatar?: string } | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [theme, setTheme] = React.useState<'light' | 'dark' | 'auto'>('light');

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const savedTheme = (localStorage.getItem('dashboard_theme') as 'light' | 'dark' | 'auto') || 'light';
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }, []);

    const toggleTheme = (newTheme: 'light' | 'dark' | 'auto') => {
      setTheme(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard_theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    };

    React.useEffect(() => {
      if (typeof window === 'undefined') return;

      const storedUser = localStorage.getItem('mp_user');
      const userObj = storedUser ? JSON.parse(storedUser) : null;

      if (!userObj || userObj.role !== 'seller') {
        window.location.href = '/';
      } else {
        setIsAuthorized(true);
        if (userObj) {
          setCurrentUser({
            name: userObj.businessName || userObj.name || 'Gaurav Enterprise',
            email: userObj.email || 'partner@dealerconnect.in',
            avatar: userObj.avatar || undefined,
          });
        }
      }
    }, [router]);

    const handleSidebarCollapse = (isCollapsed: boolean) => {
      setCollapsed(isCollapsed);
      onSidebarCollapse?.(isCollapsed);
    };

    if (!isAuthorized) {
      return (
        <div className="min-h-screen bg-[#fff6e6] text-[#1f2937] flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
            <p className="text-slate-500 text-sm font-semibold">Authenticating seller account...</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="flex min-h-screen bg-[#fff6e6] text-[#1f2937] flex-col lg:flex-row pb-20 lg:pb-0 font-sans">
        <Sidebar
          items={navigationItems}
          collapsed={collapsed}
          onCollapse={handleSidebarCollapse}
          user={currentUser || user}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-[#fff6e6]">
          <TopBar
            {...topBarProps}
            user={currentUser || user}
            onLogout={onLogout}
            theme={theme}
            onThemeChange={toggleTheme}
            onAddProduct={topBarProps?.onAddProduct || (() => router.push('/dashboard/products/new/'))}
          />

          <main id="dashboard-main" className="flex-1 overflow-y-auto bg-[#fff6e6] px-4 pb-10 pt-6 text-[#1f2937] sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav 
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden flex items-center justify-around border-t border-[#f3d9a7] bg-white/95 backdrop-blur-xl px-2 py-2.5 shadow-[0_-16px_36px_rgba(0,0,0,0.06)]"
          aria-label="Mobile Navigation"
        >
          {navigationItems.filter(item => item.showOnMobile).map((item) => {
            const isLogout = item.href === '/logout';
            const isHomeItem = item.label === 'Home' && item.href === '/';
            const isDashboardItem = item.label === 'Seller Dashboard' && item.href === '/dashboard';
            const resolvedHref = isHomeItem ? getHomeNavigationHref() : item.href;
            const isActive = !isLogout && !isHomeItem && !isDashboardItem && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const isDashboardContextActive = !isLogout && isDashboardItem && isSellerDashboardRoute(pathname);
            const activeState = isActive || isDashboardContextActive;

            const handleMobileClick = (e: React.MouseEvent) => {
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
                  onClick={handleMobileClick}
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1',
                    activeState
                      ? 'text-accent-500 font-bold'
                      : 'text-[#475569] hover:text-[#1f2937]'
                  )}
                  id="bottomHomeBtn"
                  data-testid="bottom-home-btn"
                >
                  <span className={cn(
                    'text-xl flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200',
                    activeState ? 'bg-accent-500/10 text-accent-500' : ''
                  )}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-bold tracking-wide leading-none">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={isLogout ? '#' : resolvedHref}
                onClick={handleMobileClick}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1',
                  activeState 
                    ? 'text-accent-500 font-bold' 
                    : 'text-[#475569] hover:text-[#1f2937]'
                )}
                data-testid={`mobile-nav-${item.href.replace(/\//g, '_')}`}
              >
                <span className={cn(
                  'text-xl flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200',
                  activeState ? 'bg-accent-500/10 text-accent-500' : ''
                )}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold tracking-wide leading-none">{item.label}</span>
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
