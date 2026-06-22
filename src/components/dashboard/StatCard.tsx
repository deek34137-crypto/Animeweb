'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

export default function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent-violet/30 hover:bg-bg-elevated/40 hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)]">
      {/* Decorative ambient background glow */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-accent-violet/5 rounded-full blur-xl transition-transform duration-500 group-hover:scale-150 pointer-events-none" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</p>
          <h4 className="text-2xl sm:text-3xl font-black text-text-primary font-display mt-1.5 tracking-tight leading-none">
            {value}
          </h4>
          {description && (
            <p className="text-[10px] text-text-muted font-medium mt-1">{description}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-text-secondary group-hover:text-accent-primary group-hover:bg-accent-violet/10 transition-all duration-300 border border-border-subtle group-hover:border-accent-violet/20 shadow-sm flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
