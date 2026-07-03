import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg transition-all duration-200',
  {
    variants: {
      variant: {
        elevated: 'bg-white dark:bg-neutral-900 shadow-md border border-neutral-100 dark:border-neutral-800',
        outlined: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
        ghost: 'bg-transparent',
        glass:
          'bg-white/80 dark:bg-neutral-900/10 backdrop-blur-md border border-neutral-200/30 dark:border-neutral-800/20',
      },
      hover: {
        true: 'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      hover: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, hover }), className)}
        data-testid="card"
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card, cardVariants };
