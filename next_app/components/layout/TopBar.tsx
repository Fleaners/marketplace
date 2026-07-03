'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showQuickMenu, setShowQuickMenu] = React.useState(false);

    return (
      <div
        ref={ref}
        className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl"
        data-testid="topbar"
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="inline-flex items-center gap-2">
                  {crumb.href ? (
                    <a href={crumb.href} className="text-slate-400 hover:text-white transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-slate-400">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 && <span>/</span>}
                </span>
              ))}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
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
              className="w-full bg-slate-900/80 text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-accent-500"
              data-testid="search-input"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800"
              title="Command palette (Ctrl + K)"
              onClick={() => setShowQuickMenu((prev) => !prev)}
            >
              Ctrl + K
            </button>

            <button
              type="button"
              onClick={() => onThemeChange?.(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onNotifications}
              className="relative rounded-2xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onAIAssistant}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800"
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              className="whitespace-nowrap"
              data-testid="add-product-button"
            >
              Add Product
            </Button>

            <button
              type="button"
              className="hidden rounded-full border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 md:inline-flex"
              aria-label="Seller menu"
            >
              <span className="sr-only">Seller menu</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-500 to-slate-800 flex items-center justify-center text-sm font-semibold text-slate-950">
                JS
              </div>
            </button>
          </div>
        </div>

        {showQuickMenu && (
          <div className="border-t border-slate-800 bg-slate-950/95 px-4 py-3">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <p className="text-sm text-slate-400">Command palette launched. Try “Create product”, “View analytics”, or “Open inbox”.</p>
              <button className="rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700" onClick={() => setShowQuickMenu(false)}>
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
