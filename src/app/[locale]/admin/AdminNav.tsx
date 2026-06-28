'use client';

import React from 'react';
import { Link, usePathname } from '@/navigation';
import { LayoutDashboard, Users, ShieldAlert, Activity } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Moderation', href: '/admin/moderation', icon: ShieldAlert },
    { name: 'System Health', href: '/admin/system', icon: Activity },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl md:w-max">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/admin' && pathname.startsWith(tab.href));
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
