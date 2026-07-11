import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAB12F] focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-[#FAB12F] text-slate-950 hover:bg-[#e09e1b] active:bg-[#c98e18] font-bold shadow-sm',
        secondary:
          'border border-neutral-300 text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-900 bg-white dark:bg-slate-900',
        tertiary:
          'text-neutral-750 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-850',
        danger:
          'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-550',
        ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
      },
      size: {
        sm: 'px-3.5 py-2 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-7 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        ref={ref as any}
        data-testid="button"
        {...(props as any)}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && !loading && <span className="mr-2 flex items-center">{icon}</span>}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
