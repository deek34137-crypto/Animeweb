import React from 'react';

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  variant?: 'violet' | 'cyan' | 'gold' | 'sakura' | 'success';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const variantTrack: Record<NonNullable<ProgressProps['variant']>, string> = {
  violet: 'bg-accent-violet',
  cyan: 'bg-accent-cyan',
  gold: 'bg-accent-gold',
  sakura: 'bg-accent-sakura',
  success: 'bg-green-500',
};

const glowColors: Record<NonNullable<ProgressProps['variant']>, string> = {
  violet: 'shadow-[0_0_8px_rgba(124,91,255,0.6)]',
  cyan: 'shadow-[0_0_8px_rgba(0,212,255,0.6)]',
  gold: 'shadow-[0_0_8px_rgba(255,184,0,0.6)]',
  sakura: 'shadow-[0_0_8px_rgba(255,91,141,0.6)]',
  success: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
};

const sizeHeights: Record<NonNullable<ProgressProps['size']>, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export default function Progress({
  value,
  max = 100,
  variant = 'violet',
  size = 'sm',
  showLabel = false,
  label,
  className = '',
  animated = true,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5 text-xs text-text-secondary">
          <span>{label || 'Progress'}</span>
          <span className="font-semibold tabular-nums">
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        className={`w-full bg-surface-3 rounded-full overflow-hidden ${sizeHeights[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            h-full rounded-full
            ${variantTrack[variant]}
            ${glowColors[variant]}
            ${animated ? 'transition-[width] duration-700 ease-out' : ''}
          `}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
