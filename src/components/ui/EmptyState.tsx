'use client';

import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const containerClasses = {
    sm: 'max-w-sm p-8 sm:p-10 space-y-3',
    md: 'max-w-md p-12 sm:p-16 space-y-4',
    lg: 'max-w-lg p-16 sm:p-20 space-y-5',
  };

  const iconContainerClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  return (
    <div
      className={`glass-panel border border-border-default rounded-3xl text-center mx-auto shadow-xl shadow-black/5 animate-fade-up ${containerClasses[size]} ${className}`}
    >
      <div
        className={`rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto text-accent-violet ${iconContainerClasses[size]}`}
      >
        <Icon size={iconSizes[size]} className="text-accent-violet animate-pulse shrink-0" style={{ animationDuration: '3s' }} />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-text-primary tracking-tight font-display">{title}</h3>
        <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>
      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
