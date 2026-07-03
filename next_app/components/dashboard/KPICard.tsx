import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  (
    {
      title,
      value,
      unit,
      trend,
      icon,
      onClick,
      loading = false,
      className,
    },
    ref
  ) => {
    const trendColor = trend?.direction === 'up'
      ? 'text-success'
      : trend?.direction === 'down'
      ? 'text-error'
      : 'text-neutral-500';

    const trendIcon = trend?.direction === 'up'
      ? '↑'
      : trend?.direction === 'down'
      ? '↓'
      : '−';

    return (
      <Card
        ref={ref}
        variant="elevated"
        hover={!!onClick}
        onClick={onClick}
        className={cn(
          'p-6 flex flex-col',
          className
        )}
        data-testid="kpi-card"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-body-md font-medium text-neutral-600 dark:text-neutral-400 mb-2">
              {title}
            </p>
          </div>
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 bg-accent-50 dark:bg-accent-900/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">{icon}</span>
            </div>
          )}
        </div>

        {/* Value */}
        {loading ? (
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-3" />
        ) : (
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-headline-1 font-bold text-neutral-900 dark:text-neutral-50">
                {value}
              </span>
              {unit && (
                <span className="text-body-lg text-neutral-600 dark:text-neutral-400">
                  {unit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Trend Badge */}
        {trend && !loading && (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                trend.direction === 'up'
                  ? 'success'
                  : trend.direction === 'down'
                  ? 'error'
                  : 'neutral'
              }
              size="sm"
              className={cn('flex items-center gap-1')}
            >
              <span>{trendIcon}</span>
              <span>{Math.abs(trend.percentage)}%</span>
            </Badge>
            <span className="text-body-sm text-neutral-500 dark:text-neutral-400">
              {trend.direction === 'up' ? 'increase' : trend.direction === 'down' ? 'decrease' : 'neutral'}
            </span>
          </div>
        )}
      </Card>
    );
  }
);

KPICard.displayName = 'KPICard';

export { KPICard };
