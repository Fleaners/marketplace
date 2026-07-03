import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, breadcrumbs, actions, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-neutral-200 dark:border-neutral-800 px-6 py-6 bg-white dark:bg-neutral-900',
          className
        )}
        data-testid="page-header"
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-body-sm text-accent-500 hover:text-accent-600 font-medium"
                    data-testid={`breadcrumb-${index}`}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-body-sm text-neutral-700 dark:text-neutral-300 font-medium">
                    {crumb.label}
                  </span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-neutral-400">/</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Title and Actions */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-headline-1 font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-body-lg text-neutral-600 dark:text-neutral-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

export { PageHeader };
