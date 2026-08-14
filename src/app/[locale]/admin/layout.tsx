import React, { Suspense } from 'react';
import { redirect } from '@/navigation';
import { requireModerator } from '@/lib/admin/middleware';
import AdminNav from './AdminNav';

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-text-secondary animate-pulse">Loading Admin Panel...</div>}>
      <AdminLayoutContent params={params}>
        {children}
      </AdminLayoutContent>
    </Suspense>
  );
}

async function AdminLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const authResult = await requireModerator();
  if (!authResult.authorized) {
    redirect({ href: '/', locale });
  }

  const user = authResult.user;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage users, moderate flagged content, and monitor streaming health.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-text-secondary">
            Role: <span className="text-emerald-400 capitalize">{user.role.toLowerCase()}</span>
          </span>
        </div>
      </div>

      <AdminNav />

      <div className="min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
