'use client';

import React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { navigateToMarketplaceHome } from '@/lib/navigation';

export interface TopBarProps {
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onSearch?: (query: string) => void;
  unreadNotifications?: number;
  onNotifications?: () => void;
  onAIAssistant?: () => void;
  onAddProduct?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
  onLogout?: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  (
    {
      pageTitle = 'Overview',
      breadcrumbs = [],
      onSearch,
      unreadNotifications = 0,
      onNotifications,
      onAIAssistant,
      onAddProduct,
      theme = 'auto',
      onThemeChange,
      onLogout,
      user,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showQuickMenu, setShowQuickMenu] = React.useState(false);
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);
    const [unreadCount, setUnreadCount] = React.useState(unreadNotifications);

    React.useEffect(() => {
      setUnreadCount(unreadNotifications);
    }, [unreadNotifications]);

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setShowQuickMenu((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
      <div
        ref={ref}
        className="sticky top-0 z-40 border-b border-[#f3d9a7] bg-[#fff6e6]/95 backdrop-blur-xl"
        data-testid="topbar"
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="inline-flex items-center gap-2">
                  {crumb.href ? (
                    crumb.href === '/' ? (
                      <button
                        type="button"
                        onClick={() => navigateToMarketplaceHome(window)}
                        className="text-slate-500 hover:text-[#1f2937] font-medium transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <Link href={crumb.href} className="text-slate-500 hover:text-[#1f2937] font-medium transition-colors">
                        {crumb.label}
                      </Link>
                    )
                  ) : (
                    <span className="text-slate-500 font-medium">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 && <span>/</span>}
                </span>
              ))}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f2937] sm:text-3xl font-display">
              {pageTitle}
            </h1>
          </div>

          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search orders, products, buyers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              icon={
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              className="w-full bg-white text-[#1f2937] placeholder:text-slate-400 border border-[#f3d9a7] focus:border-[#FAB12F] focus:ring-[#FAB12F]/20 rounded-2xl shadow-sm"
              data-testid="search-input"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-[#f3d9a7] bg-white px-3 py-2 text-sm font-bold text-[#1f2937] transition hover:border-[#FAB12F] hover:bg-[#fff0db]"
              title="Command palette (Ctrl + K)"
              onClick={() => setShowQuickMenu((prev) => !prev)}
            >
              Ctrl + K
            </button>

            <button
              type="button"
              onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-2xl border border-[#f3d9a7] bg-white p-2 text-[#1f2937] transition hover:bg-[#fff0db] hover:border-[#FAB12F]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowProfileMenu(false);
                  setUnreadCount(0);
                  onNotifications?.();
                }}
                className="relative rounded-2xl border border-[#f3d9a7] bg-white p-2 text-[#1f2937] transition hover:bg-[#fff0db] hover:border-[#FAB12F]"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-[#f3d9a7] bg-white p-4 shadow-xl z-50 text-slate-800">
                  <h4 className="font-bold text-[#1f2937] border-b border-[#f3d9a7] pb-2 text-sm">Corporate Trade Alerts</h4>
                  <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
                    <div className="text-xs border-b border-slate-100 pb-2 text-left">
                      <p className="font-bold text-[#1f2937]">New inquiry on Industrial Water Pump</p>
                      <p className="text-slate-500 mt-0.5">Ramesh Kumar (Om Sree Enterprises) requested catalog details.</p>
                      <span className="text-[10px] font-semibold text-[#FAB12F] mt-1 block">1h ago</span>
                    </div>
                    <div className="text-xs border-b border-slate-100 pb-2 text-left">
                      <p className="font-bold text-[#1f2937]">Tax Directory verified</p>
                      <p className="text-slate-500 mt-0.5">Your Indian GSTIN has been checked and registered.</p>
                      <span className="text-[10px] font-semibold text-[#FAB12F] mt-1 block">1d ago</span>
                    </div>
                    <div className="text-xs text-left">
                      <p className="font-bold text-[#1f2937]">Welcome to DealerConnect</p>
                      <p className="text-slate-500 mt-0.5">Begin listing bulk catalogs and configure direct WhatsApp links.</p>
                      <span className="text-[10px] font-semibold text-[#FAB12F] mt-1 block">3d ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onAIAssistant}
              className="rounded-2xl border border-[#f3d9a7] bg-white p-2 text-[#1f2937] transition hover:bg-[#fff0db] hover:border-[#FAB12F]"
              aria-label="AI Assistant"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <Button
              variant="primary"
              size="md"
              onClick={onAddProduct}
              icon={
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              className="whitespace-nowrap rounded-2xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-900 font-bold border border-[#f3d9a7] shadow-sm hover:scale-[1.02] transition-all"
              data-testid="add-product-button"
            >
              Add Product
            </Button>

            {/* Interactive User Avatar Menu with Actual Seller Details */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                className="rounded-full border border-[#f3d9a7] bg-white p-1 text-[#1f2937] transition hover:bg-[#fff0db] inline-flex items-center"
                aria-label="Seller menu"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FAB12F] to-[#f59e0b] flex items-center justify-center text-xs font-bold text-[#111827]">
                  {user?.name ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2) : 'GE'}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl border border-[#f3d9a7] bg-white p-4 shadow-xl z-50 text-slate-800">
                  <div className="border-b border-[#f3d9a7] pb-3 mb-2 text-left">
                    <p className="font-bold text-sm text-[#1f2937] truncate">{user?.name || 'Gaurav Enterprise'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email || 'partner@dealerconnect.in'}</p>
                    <span className="mt-1.5 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                      🛡️ Verified Premium Seller
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Link
                      href="/dashboard/profile/"
                      className="block rounded-xl px-3 py-2 text-left text-xs font-bold text-[#1f2937] hover:bg-[#fff6e6] transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      👤 View Profile
                    </Link>
                    <Link
                      href="/dashboard/settings/"
                      className="block rounded-xl px-3 py-2 text-left text-xs font-bold text-[#1f2937] hover:bg-[#fff6e6] transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      ⚙️ Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout?.();
                      }}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-[#fff6e6] transition-colors"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showQuickMenu && (
          <div className="border-t border-[#f3d9a7] bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <p className="text-sm font-medium text-[#475569]">Command palette launched. Try “Create product”, “View analytics”, or “Open inbox”.</p>
              <button className="rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-3 py-2 text-sm font-bold text-[#1f2937] hover:bg-[#fff0db]" onClick={() => setShowQuickMenu(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

TopBar.displayName = 'TopBar';

export { TopBar };
