'use client';

import React, { useState } from 'react';
import { Link2, Unlink, Loader2, Database, Check } from 'lucide-react';
import ImportModal from './ImportModal';

interface UserSettings {
  malUsername: string | null;
  anilistUsername: string | null;
  syncToMal: boolean;
  syncToAnilist: boolean;
}

interface AccountLinkProps {
  user: UserSettings;
  setNotification: (notif: { type: 'success' | 'error'; text: string } | null) => void;
}

export default function AccountLink({ user, setNotification }: AccountLinkProps) {
  const [malConnected, setMalConnected] = useState(!!user.malUsername);
  const [malUser, setMalUser] = useState(user.malUsername || '');
  const [syncToMal, setSyncToMal] = useState(user.syncToMal);

  const [anilistConnected, setAnilistConnected] = useState(!!user.anilistUsername);
  const [anilistUser, setAnilistUser] = useState(user.anilistUsername || '');
  const [syncToAnilist, setSyncToAnilist] = useState(user.syncToAnilist);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Import modal triggers
  const [importProvider, setImportProvider] = useState<'mal' | 'anilist' | null>(null);

  const handleConnect = (provider: 'mal' | 'anilist') => {
    setActionLoading(provider);
    window.location.href = `/api/auth/tracker/${provider}/login`;
  };

  const handleDisconnect = async (provider: 'mal' | 'anilist') => {
    setActionLoading(provider);
    try {
      const res = await fetch('/api/auth/tracker/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!res.ok) throw new Error('Failed to disconnect');

      if (provider === 'mal') {
        setMalConnected(false);
        setMalUser('');
      } else {
        setAnilistConnected(false);
        setAnilistUser('');
      }

      setNotification({
        type: 'success',
        text: `Successfully unlinked your ${provider === 'mal' ? 'MyAnimeList' : 'AniList'} account.`,
      });
    } catch {
      setNotification({
        type: 'error',
        text: `Error unlinking ${provider === 'mal' ? 'MyAnimeList' : 'AniList'}.`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSync = async (provider: 'mal' | 'anilist', currentVal: boolean) => {
    const nextVal = !currentVal;
    if (provider === 'mal') {
      setSyncToMal(nextVal);
    } else {
      setSyncToAnilist(nextVal);
    }

    try {
      const res = await fetch('/api/auth/tracker/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncToMal: provider === 'mal' ? nextVal : syncToMal,
          syncToAnilist: provider === 'anilist' ? nextVal : syncToAnilist,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
    } catch {
      // Revert state
      if (provider === 'mal') {
        setSyncToMal(currentVal);
      } else {
        setSyncToAnilist(currentVal);
      }
      setNotification({
        type: 'error',
        text: 'Failed to update auto-sync configuration.',
      });
    }
  };

  return (
    <div className="glass-panel border border-border-default rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center space-x-2 text-text-primary border-b border-border-subtle pb-4">
        <Link2 size={20} className="text-accent-violet" />
        <h2 className="text-lg font-black tracking-tight font-display">Watchlist Tracker Integration</h2>
      </div>

      <div className="space-y-6">
        {/* MyAnimeList Sync Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-border-subtle bg-surface-1/40 rounded-2xl p-5 gap-4 hover:border-accent-violet/10 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2e51a2]" />
              <span className="text-sm font-bold text-text-primary">MyAnimeList</span>
              {malConnected && (
                <span className="text-[9px] font-bold bg-[#2e51a2]/10 border border-[#2e51a2]/20 text-[#2e51a2] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Linked
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {malConnected
                ? `Connected as ${malUser}. Auto-sync updates watch progress to your MAL profile.`
                : 'Track progress and sync your anime scores instantly to your MyAnimeList profile.'}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-3 flex-shrink-0 self-end sm:self-auto">
            {malConnected ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportProvider('mal')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default hover:border-[#7c3aed]/50 bg-bg-secondary hover:bg-bg-elevated text-text-primary text-xs font-bold rounded-xl transition"
                  >
                    <Database size={12} className="text-text-muted" />
                    <span>Import Library</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect('mal')}
                    disabled={actionLoading === 'mal'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {actionLoading === 'mal' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Unlink size={12} />
                    )}
                    <span>Disconnect</span>
                  </button>
                </div>
                {/* Auto Sync Toggle switch */}
                <div className="flex items-center gap-2 cursor-pointer mt-1">
                  <span className="text-[10px] text-text-muted font-bold uppercase">Auto-Sync</span>
                  <button
                    onClick={() => handleToggleSync('mal', syncToMal)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      syncToMal ? 'bg-accent-violet' : 'bg-surface-3 border border-border-subtle'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 transform ${
                        syncToMal ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => handleConnect('mal')}
                disabled={actionLoading === 'mal'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold rounded-xl transition shadow-[0_0_12px_rgba(124,91,255,0.15)] disabled:opacity-50"
              >
                {actionLoading === 'mal' && <Loader2 size={12} className="animate-spin" />}
                <span>Connect MyAnimeList</span>
              </button>
            )}
          </div>
        </div>

        {/* AniList Sync Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-border-subtle bg-surface-1/40 rounded-2xl p-5 gap-4 hover:border-accent-violet/10 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3db4f2]" />
              <span className="text-sm font-bold text-text-primary">AniList</span>
              {anilistConnected && (
                <span className="text-[9px] font-bold bg-[#3db4f2]/10 border border-[#3db4f2]/20 text-[#3db4f2] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Linked
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {anilistConnected
                ? `Connected as ${anilistUser}. Updates watch progress to your AniList profile.`
                : 'Track progress and sync your anime scores instantly to your AniList profile.'}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-3 flex-shrink-0 self-end sm:self-auto">
            {anilistConnected ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportProvider('anilist')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default hover:border-[#7c3aed]/50 bg-bg-secondary hover:bg-bg-elevated text-text-primary text-xs font-bold rounded-xl transition"
                  >
                    <Database size={12} className="text-text-muted" />
                    <span>Import Library</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect('anilist')}
                    disabled={actionLoading === 'anilist'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {actionLoading === 'anilist' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Unlink size={12} />
                    )}
                    <span>Disconnect</span>
                  </button>
                </div>
                {/* Auto Sync Toggle switch */}
                <div className="flex items-center gap-2 cursor-pointer mt-1">
                  <span className="text-[10px] text-text-muted font-bold uppercase">Auto-Sync</span>
                  <button
                    onClick={() => handleToggleSync('anilist', syncToAnilist)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      syncToAnilist ? 'bg-accent-violet' : 'bg-surface-3 border border-border-subtle'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 transform ${
                        syncToAnilist ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => handleConnect('anilist')}
                disabled={actionLoading === 'anilist'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold rounded-xl transition shadow-[0_0_12px_rgba(124,91,255,0.15)] disabled:opacity-50"
              >
                {actionLoading === 'anilist' && <Loader2 size={12} className="animate-spin" />}
                <span>Connect AniList</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Import Modal */}
      {importProvider && (
        <ImportModal
          isOpen={!!importProvider}
          onClose={() => setImportProvider(null)}
          provider={importProvider}
        />
      )}
    </div>
  );
}
