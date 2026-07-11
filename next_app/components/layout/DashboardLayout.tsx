'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar, type NavigationItem } from './Sidebar';
import { TopBar, type TopBarProps } from './TopBar';
import { cn } from '@/lib/utils';
import { getHomeNavigationHref, isSellerDashboardRoute, navigateToMarketplaceHome } from '@/lib/navigation';
import { motion } from 'framer-motion';
import { VersionAlert } from '../dashboard/VersionAlert';
import { logoutUser } from '@/lib/firebase';


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
      <div ref={ref} className="flex min-h-screen bg-[#fff6e6] text-[#1f2937] dark:bg-slate-950 dark:text-slate-100 flex-col lg:flex-row pb-20 lg:pb-0 font-sans">
        <Sidebar
          items={navigationItems}
          collapsed={collapsed}
          onCollapse={handleSidebarCollapse}
          user={currentUser || user}
          onLogout={onLogout || logoutUser}
        />
        <VersionAlert />

        <div className="flex-1 flex flex-col overflow-hidden bg-[#fff6e6] dark:bg-slate-950">
          <TopBar
            {...topBarProps}
            user={currentUser || user}
            onLogout={onLogout || logoutUser}
            theme={theme}
            onThemeChange={toggleTheme}
            onAddProduct={topBarProps?.onAddProduct || (() => router.push('/dashboard/products/new/'))}
          />

          <main id="dashboard-main" className="flex-1 overflow-y-auto bg-[#fff6e6] dark:bg-slate-950 px-4 pb-10 pt-6 text-[#1f2937] dark:text-slate-100 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav 
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden flex items-center justify-around border-t border-[#f3d9a7] bg-white/90 backdrop-blur-xl px-2 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] rounded-t-[20px]"
          aria-label="Mobile Navigation"
        >
          {[
            { label: 'Home', href: '/', icon: '🏠' },
            { label: 'Products', href: '/dashboard/products', icon: '📦' },
            { label: 'Add Product', href: '/dashboard/products?new=true', icon: '➕' },
            { label: 'Dashboard', href: '/dashboard', icon: '📊' },
            { label: 'Profile', href: '/dashboard/profile', icon: '👤' }
          ].map((item) => {
            const checkActive = (href: string) => {
              if (href === '/') return pathname === '/';
              if (href.includes('?new=true')) {
                if (typeof window !== 'undefined') {
                  return pathname === '/dashboard/products' && window.location.search.includes('new=true');
                }
                return false;
              }
              if (href === '/dashboard/products') {
                if (typeof window !== 'undefined') {
                  return pathname === '/dashboard/products' && !window.location.search.includes('new=true');
                }
                return pathname === '/dashboard/products';
              }
              return pathname === href || pathname.startsWith(href + '/');
            };

            const activeState = checkActive(item.href);

            const handleMobileClick = (e: React.MouseEvent) => {
              if (item.href === '/') {
                e.preventDefault();
                navigateToMarketplaceHome(window);
              }
            };

            const isHome = item.href === '/';

            return (
              <React.Fragment key={item.label}>
                {isHome ? (
                  <button
                    type="button"
                    onClick={handleMobileClick}
                    className={cn(
                      'relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1.5 outline-none',
                      activeState ? 'text-accent-500 font-bold' : 'text-[#475569]'
                    )}
                    id="bottomHomeBtn"
                  >
                    <motion.span 
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        'text-xl flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 relative z-10',
                        activeState ? 'bg-accent-500/10 text-accent-500 shadow-inner' : 'bg-transparent'
                      )}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="text-[10px] font-bold tracking-wide leading-none z-10">{item.label}</span>
                    {activeState && (
                      <motion.div 
                        layoutId="activeTabGlow"
                        className="absolute inset-0 bg-[#FAB12F]/5 rounded-2xl border border-[#FAB12F]/10 z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1.5 outline-none',
                      activeState ? 'text-accent-500 font-bold' : 'text-[#475569]'
                    )}
                  >
                    <motion.span 
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        'text-xl flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 relative z-10',
                        activeState ? 'bg-accent-500/10 text-accent-500 shadow-inner' : 'bg-transparent'
                      )}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="text-[10px] font-bold tracking-wide leading-none z-10">{item.label}</span>
                    {activeState && (
                      <motion.div 
                        layoutId="activeTabGlow"
                        className="absolute inset-0 bg-[#FAB12F]/5 rounded-2xl border border-[#FAB12F]/10 z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';

export { DashboardLayout };
