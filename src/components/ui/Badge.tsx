import React from 'react';

type BadgeVariant = 'default' | 'violet' | 'sakura' | 'gold' | 'cyan' | 'success' | 'danger' | 'warning' | 'ghost';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-2 text-text-secondary border-border-default',
  violet: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
  sakura: 'bg-[rgba(255,91,141,0.15)] text-accent-sakura border-[rgba(255,91,141,0.3)]',
  gold: 'bg-[rgba(255,184,0,0.15)] text-accent-gold border-[rgba(255,184,0,0.3)]',
  cyan: 'bg-[rgba(0,212,255,0.15)] text-accent-cyan border-[rgba(0,212,255,0.3)]',
  success: 'bg-[rgba(34,197,94,0.15)] text-green-400 border-[rgba(34,197,94,0.3)]',
  danger: 'bg-[rgba(239,68,68,0.15)] text-red-400 border-[rgba(239,68,68,0.3)]',
  warning: 'bg-[rgba(245,158,11,0.15)] text-amber-400 border-[rgba(245,158,11,0.3)]',
  ghost: 'bg-transparent text-text-muted border-border-subtle',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[9px] px-1.5 py-0.5 tracking-wider',
  sm: 'text-[10px] px-2 py-0.5 tracking-wide',
  md: 'text-xs px-2.5 py-1',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-secondary',
  violet: 'bg-accent-violet',
  sakura: 'bg-accent-sakura',
  gold: 'bg-accent-gold',
  cyan: 'bg-accent-cyan',
  success: 'bg-green-400',
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  ghost: 'bg-text-muted',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-bold uppercase
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
