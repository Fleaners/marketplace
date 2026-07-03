import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center justify-center font-medium rounded-full', {
  variants: {
    variant: {
      primary: 'bg-accent-500 text-white',
      success: 'bg-success/10 text-success dark:bg-success/20',
      warning: 'bg-warning/10 text-warning dark:bg-warning/20',
      error: 'bg-error/10 text-error dark:bg-error/20',
      neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
    },
    size: {
      sm: 'px-2 py-1 text-body-sm',
      md: 'px-3 py-1.5 text-body-md',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        data-testid="badge"
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
