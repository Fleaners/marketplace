import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-3 text-neutral-500">{icon}</div>}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full px-4 py-2 text-body-md border border-neutral-200 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-50',
              'disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500',
              'dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600',
              error && 'border-error focus:ring-error',
              icon && 'pl-10',
              className
            )}
            data-testid="input"
            {...props}
          />
        </div>
        {error && <p className="text-body-sm text-error mt-1">{error}</p>}
        {helpText && !error && (
          <p className="text-body-sm text-neutral-500 dark:text-neutral-400 mt-1">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
