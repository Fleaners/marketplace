import React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ label, checked = false, onChange, disabled = false, id }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={id}
          role="switch"
          aria-checked={checked}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500',
            checked
              ? 'bg-accent-500 hover:bg-accent-600'
              : 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => {
            if (!disabled && onChange) {
              onChange(!checked);
            }
          }}
          disabled={disabled}
          data-testid="toggle"
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        {label && (
          <label htmlFor={id} className="text-body-md font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
