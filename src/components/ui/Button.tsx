import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-accent-violet text-white border border-accent-violet
    hover:bg-[#6b4ae6] hover:border-[#6b4ae6]
    shadow-[0_0_20px_rgba(124,91,255,0.25)]
    hover:shadow-[0_0_30px_rgba(124,91,255,0.4)]
  `,
  secondary: `
    bg-surface-2 text-text-primary border border-border-default
    hover:bg-surface-3 hover:border-border-emphasis
  `,
  ghost: `
    bg-transparent text-text-secondary border border-transparent
    hover:bg-surface-2 hover:text-text-primary hover:border-border-subtle
  `,
  danger: `
    bg-[rgba(239,68,68,0.15)] text-red-400 border border-[rgba(239,68,68,0.3)]
    hover:bg-[rgba(239,68,68,0.25)] hover:border-[rgba(239,68,68,0.5)]
  `,
  glass: `
    bg-[rgba(13,13,20,0.72)] text-text-primary border border-border-default
    backdrop-blur-md hover:bg-[rgba(31,31,46,0.8)] hover:border-border-emphasis
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'text-xs px-3 py-1.5 rounded-lg gap-1',
  sm: 'text-sm px-4 py-2 rounded-xl gap-1.5',
  md: 'text-sm px-5 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-7 py-3.5 rounded-2xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-out
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:-translate-y-px active:translate-y-0 active:scale-[0.98]'}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin w-4 h-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}
