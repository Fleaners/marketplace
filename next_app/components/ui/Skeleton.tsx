import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  count?: number;
  circle?: boolean;
  height?: number;
  width?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, count = 1, circle = false, height = 24, width = '100%' }, ref) => {
    return (
      <div ref={ref} className="space-y-3" data-testid="skeleton">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'bg-neutral-200 dark:bg-neutral-700 animate-pulse',
              circle ? 'rounded-full' : 'rounded-md',
              className
            )}
            style={{
              height: `${height}px`,
              width: circle ? `${height}px` : width,
            }}
          />
        ))}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
