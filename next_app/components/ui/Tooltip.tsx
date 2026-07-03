import React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  children: React.ReactNode;
}

const positionStyles = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
};

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, position = 'top', delay = 200, children }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [timer, setTimer] = React.useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      const newTimer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      setTimer(newTimer);
    };

    const handleMouseLeave = () => {
      if (timer) {
        clearTimeout(timer);
      }
      setIsVisible(false);
    };

    return (
      <div
        ref={ref}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid="tooltip"
      >
        {children}
        {isVisible && (
          <div
            className={cn(
              'absolute z-50 px-3 py-2 text-body-sm font-medium text-white bg-neutral-900 dark:bg-neutral-800 rounded-md pointer-events-none animate-fade-in',
              positionStyles[position]
            )}
          >
            {content}
            <div
              className={cn(
                'absolute w-2 h-2 bg-neutral-900 dark:bg-neutral-800 transform rotate-45',
                position === 'top' && 'top-full -translate-y-1/2 left-1/2 -translate-x-1/2',
                position === 'bottom' && 'bottom-full translate-y-1/2 left-1/2 -translate-x-1/2',
                position === 'left' && 'left-full -translate-x-1/2 top-1/2 -translate-y-1/2',
                position === 'right' && 'right-full translate-x-1/2 top-1/2 -translate-y-1/2'
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export { Tooltip };
