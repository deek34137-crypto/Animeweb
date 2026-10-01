'use client';

import React, { useEffect, useState } from 'react';
import { Users, Play, ShieldAlert, Clock, RefreshCw, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { Link } from '@/navigation';

interface StatData {
  totalUsers: number;
  activeLists: number;
  pendingFlags: number;
  totalWatchHours: number;
  streamErrorRatio: number;
  dailySignups: { date: string; count: number }[];
  providerStats: {
    provider: string;
    total: number;
    failed: number;
    errorRate: number;
    avgLoadDuration: number;
  }[];
  fromCache?: boolean;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.statusText}`);
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-sm text-text-secondary">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-text-primary">Failed to Load Dashboard</h3>
        <p className="text-sm text-text-secondary mt-1">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
          }}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Compute maximum signup count for chart scaling
  const maxSignup = Math.max(...stats.dailySignups.map(d => d.count), 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top action row */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Overview</h2>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Total Users</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-text-primary">{stats.totalUsers.toLocaleString()}</h3>
            <p className="text-xs text-text-secondary mt-1">Registered members</p>
          </div>
        </div>

        {/* Card 2: Active Lists */}
        <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Active Lists</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Play className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-text-primary">{stats.activeLists.toLocaleString()}</h3>
            <p className="text-xs text-text-secondary mt-1">Saved list entries</p>
          </div>
        </div>

        {/* Card 3: Pending Flags */}
        <Link
          href="/admin/moderation"
          className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-red-500/20 transition-all group block"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Pending Flags</span>
            <div className={`p-2 rounded-lg ${stats.pendingFlags > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-green-500/10 text-green-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-text-primary">{stats.pendingFlags}</h3>
            <p className="text-xs text-text-secondary mt-1">Awaiting review</p>
          </div>
        </Link>

        {/* Card 4: Watch Hours */}
        <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Total Watch Time</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-text-primary">{stats.totalWatchHours.toLocaleString()}h</h3>
            <p className="text-xs text-text-secondary mt-1">Accumulated watch time</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Signup chart & Streaming metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup Growth Chart */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h3 className="text-base font-bold text-text-primary mb-6">User Registration (Last 7 Days)</h3>
          
          <div className="h-64 w-full flex items-end justify-between gap-2 pt-4 relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-x-0 top-4 bottom-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full border-t border-white/5" />
              ))}
            </div>

            {/* SVG Line / Bar Representation */}
            {stats.dailySignups.map((d, index) => {
              const heightPct = (d.count / maxSignup) * 80 + 5; // scaled between 5% and 85%
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center group relative z-10">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap">
                    {d.count} signups
                  </div>
                  
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[40px] bg-gradient-to-t from-purple-600/40 to-purple-500 hover:from-purple-500 hover:to-indigo-400 rounded-t transition-all duration-300 relative"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-t transition-opacity" />
                  </div>
                  
                  {/* Date label */}
                  <span className="text-[10px] text-text-secondary mt-2">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streaming Health Summary */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary mb-4">Stream Health Summary</h3>
            <div className="flex items-center gap-4 py-4 border-b border-white/5">
              <div className={`p-3 rounded-2xl ${stats.streamErrorRatio < 2 ? 'bg-emerald-500/10 text-emerald-400' : stats.streamErrorRatio < 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                {stats.streamErrorRatio < 5 ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Stream Failure Ratio</h4>
                <p className="text-2xl font-black mt-0.5">{stats.streamErrorRatio}%</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {stats.streamErrorRatio < 2 ? 'Excellent performance' : stats.streamErrorRatio < 5 ? 'Acceptable rates' : 'High error rates detected'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Provider Breakdown</h4>
            {stats.providerStats.length === 0 ? (
              <p className="text-xs text-text-secondary italic">No stream telemetry recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.providerStats.map((p) => (
                  <div key={p.provider} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-text-primary capitalize">{p.provider}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-primary">{p.avgLoadDuration}ms load</p>
                      <p className={`text-[10px] ${p.errorRate < 2 ? 'text-emerald-400' : p.errorRate < 5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.errorRate}% fail ({p.total} reqs)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
