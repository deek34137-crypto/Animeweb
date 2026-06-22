'use client';

import React from 'react';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div className={`rounded-3xl border border-border-subtle bg-bg-secondary/40 p-5 backdrop-blur-md transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}
