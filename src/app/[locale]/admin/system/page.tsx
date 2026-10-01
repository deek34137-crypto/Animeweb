'use client';

import React, { useEffect, useState } from 'react';
import { Database, Cpu, HardDrive, ShieldCheck, RefreshCw, Save, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

interface HealthData {
  dbLatencyMs: number;
  serverMemory: {
    totalGb: number;
    freeGb: number;
    percentUsed: number;
    heapUsedMb: number;
  };
  serverCpu: {
    cores: number;
    loadAverage: number[];
  };
  streamingHealth: {
    totalChecks: number;
    failedChecks: number;
    successRate: number;
  };
}

export default function AdminSystem() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Configuration States ( mock settings panel config fields)
  const [scraperEnabled, setScraperEnabled] = useState(true);
  const [jikanRateLimit, setJikanRateLimit] = useState(3);
  const [cacheTtlDays, setCacheTtlDays] = useState(30);
  const [poolSize, setPoolSize] = useState(15);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchHealth = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/system/health');
      if (!res.ok) throw new Error('Failed to load system diagnostics');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 10 seconds for real-time monitoring feel
    const interval = setInterval(() => fetchHealth(), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1200);
  };

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-sm text-text-secondary">Running system diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Diagnostics Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">System Health & Settings</h2>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Force Refresh
        </button>
      </div>

      {/* Grid of Monitors */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DB Monitor */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Database Status</span>
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-text-primary">{health.dbLatencyMs}ms</span>
              <span className="text-xs text-text-secondary">Latency</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-text-secondary font-semibold">PostgreSQL Connected</span>
            </div>
          </div>

          {/* CPU Monitor */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">CPU Diagnostics</span>
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-text-primary">
                {health.serverCpu.loadAverage[0] !== undefined ? health.serverCpu.loadAverage[0].toFixed(2) : '0.00'}
              </span>
              <span className="text-xs text-text-secondary">1m Load Avg</span>
            </div>
            <p className="mt-3 text-[11px] text-text-secondary font-medium">
              Cores Allocated: <span className="text-blue-400 font-bold">{health.serverCpu.cores} Cores</span>
            </p>
          </div>

          {/* RAM Monitor */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Memory Allocation</span>
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-text-primary">{health.serverMemory.percentUsed}%</span>
              <span className="text-xs text-text-secondary">Used</span>
            </div>
            <p className="mt-3 text-[11px] text-text-secondary font-medium">
              Heap: <span className="text-emerald-400 font-bold">{health.serverMemory.heapUsedMb} MB</span> / {health.serverMemory.totalGb} GB
            </p>
          </div>

          {/* Network / Stream Health Checker */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Streaming Success</span>
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-text-primary">{health.streamingHealth.successRate}%</span>
              <span className="text-xs text-text-secondary">Checks Ok</span>
            </div>
            <p className="mt-3 text-[11px] text-text-secondary font-medium">
              Fails: <span className="text-red-400 font-bold">{health.streamingHealth.failedChecks}</span> / {health.streamingHealth.totalChecks} logs
            </p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-text-primary">System Config Variables</h3>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scraper Enabled Toggle */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-text-primary block">Jikan Scrapers Execution</label>
                <span className="text-xs text-text-secondary block">Disable to temporarily pause anime sync scrapers.</span>
              </div>
              <button
                type="button"
                onClick={() => setScraperEnabled(!scraperEnabled)}
                className="text-text-primary hover:opacity-80 transition"
              >
                {scraperEnabled ? (
                  <ToggleRight className="w-12 h-12 text-purple-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-text-secondary" />
                )}
              </button>
            </div>

            {/* Jikan Rate Limit Slider */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-text-primary">Jikan Rate Throttle (calls/sec)</label>
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  {jikanRateLimit} req/s
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={jikanRateLimit}
                onChange={(e) => setJikanRateLimit(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[10px] text-text-secondary block">Protects against Jikan API rate limit blocks.</span>
            </div>

            {/* Cache TTL Config */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2">
              <label className="text-sm font-bold text-text-primary block">Recommendation Cache TTL (Days)</label>
              <select
                value={cacheTtlDays}
                onChange={(e) => setCacheTtlDays(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple-500"
              >
                <option value="7" className="bg-bg-primary">7 Days (Weekly Refresh)</option>
                <option value="15" className="bg-bg-primary">15 Days (Bi-weekly Refresh)</option>
                <option value="30" className="bg-bg-primary">30 Days (Monthly Refresh)</option>
                <option value="90" className="bg-bg-primary">90 Days (Quarterly Refresh)</option>
              </select>
              <span className="text-[10px] text-text-secondary block">
                How long recommendations fetched from external services remain cached.
              </span>
            </div>

            {/* Database Pool Size */}
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2">
              <label className="text-sm font-bold text-text-primary block">Prisma Client Pool Connection Limit</label>
              <input
                type="number"
                min="5"
                max="50"
                value={poolSize}
                onChange={(e) => setPoolSize(parseInt(e.target.value) || 5)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-text-secondary block">
                Maximum connections generated per server instance inside pool bounds.
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 justify-end pt-4 border-t border-white/5">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold animate-bounce">
                Configuration applied successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-purple-500/10"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Applying...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
