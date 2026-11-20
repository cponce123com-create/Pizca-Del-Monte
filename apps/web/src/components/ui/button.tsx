'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary-light active:bg-primary-dark shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-light active:bg-secondary-dark shadow-sm',
      accent: 'bg-accent text-accent-foreground hover:bg-accent-light active:bg-accent-dark shadow-sm',
      outline: 'border-2 border-border bg-transparent hover:bg-muted hover:border-primary',
      ghost: 'bg-transparent hover:bg-muted',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-light active:bg-destructive-dark shadow-sm',
      success: 'bg-success text-success-foreground hover:bg-success-light active:bg-success-dark shadow-sm',
    };

    const sizes = {
      xs: 'px-2 py-1 text-body-xs',
      sm: 'px-3 py-1.5 text-body-sm',
      md: 'px-4 py-2 text-body-md',
      lg: 'px-6 py-3 text-body-lg',
      icon: 'p-2',
    };

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {asChild ? children : <>
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        {children}
        </>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };