'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  User, Link2, Unlink, Loader2, Save, CheckCircle, ShieldAlert,
  Settings, Check, AlertTriangle
} from 'lucide-react';
import AccountLink from '@/components/settings/AccountLink';

interface UserSettings {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  malUsername: string | null;
  anilistUsername: string | null;
  syncToMal: boolean;
  syncToAnilist: boolean;
}

const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface SettingsClientProps {
  user: UserSettings;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();

  // Profile forms state
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [banner, setBanner] = useState(user.banner || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tracker states
  const [malConnected, setMalConnected] = useState(!!user.malUsername);
  const [malUser, setMalUser] = useState(user.malUsername || '');
  const [syncToMal, setSyncToMal] = useState(user.syncToMal);

  const [anilistConnected, setAnilistConnected] = useState(!!user.anilistUsername);
  const [anilistUser, setAnilistUser] = useState(user.anilistUsername || '');
  const [syncToAnilist, setSyncToAnilist] = useState(user.syncToAnilist);

  // Loading indicators
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detect query params for callback results
  useEffect(() => {
    const syncResult = searchParams.get('sync');
    const provider = searchParams.get('provider');
    const reason = searchParams.get('reason');

    if (syncResult === 'success') {
      const provName = provider === 'mal' ? 'MyAnimeList' : 'AniList';
      setNotification({
        type: 'success',
        text: `Successfully connected to your ${provName} account!`,
      });
      // Clear URL params
      router.replace('/settings');
    } else if (syncResult === 'error') {
      const provName = provider === 'mal' ? 'MyAnimeList' : 'AniList';
      const detail = reason === 'missing_verifier' ? 'OAuth context expired.' : 'Authorization rejected.';
      setNotification({
        type: 'error',
        text: `Failed to link ${provName} tracker. ${detail}`,
      });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  // Handle Profile Update
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName, bio, avatar, banner }),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile.');
      }

      // Refresh Client session in NextAuth
      if (updateSession) {
        await updateSession({
          image: avatar || null,
          name: displayName || user.username,
        });
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      router.refresh();
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Error saving profile preferences.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Sync Preference
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncToMal: provider === 'mal' ? nextVal : syncToMal,
          syncToAnilist: provider === 'anilist' ? nextVal : syncToAnilist,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update preferences.');
      }
    } catch (err) {
      // Revert state on error
      if (provider === 'mal') {
        setSyncToMal(currentVal);
      } else {
        setSyncToAnilist(currentVal);
      }
      setNotification({
        type: 'error',
        text: 'Failed to save auto-sync preferences.',
      });
    }
  };

  // Connect Tracker Redirect
  const handleConnect = (provider: 'mal' | 'anilist') => {
    setActionLoading(provider);
    window.location.href = `/api/auth/tracker/${provider}/login`;
  };

  // Disconnect Tracker
  const handleDisconnect = async (provider: 'mal' | 'anilist') => {
    setActionLoading(provider);

    try {
      const res = await fetch('/api/auth/tracker/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      if (!res.ok) {
        throw new Error('Failed to disconnect.');
      }

      if (provider === 'mal') {
        setMalConnected(false);
        setMalUser('');
      } else {
        setAnilistConnected(false);
        setAnilistUser('');
      }

      setNotification({
        type: 'success',
        text: `Disconnected ${provider === 'mal' ? 'MyAnimeList' : 'AniList'} tracker successfully.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        text: `Failed to disconnect ${provider === 'mal' ? 'MyAnimeList' : 'AniList'}.`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* ─── Left Sidebar / Navigation Info ─── */}
      <div className="md:col-span-1 space-y-6">
        <div className="glass-panel border border-border-default rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-3 text-text-primary">
            <div className="w-9 h-9 rounded-xl bg-accent-violet/10 flex items-center justify-center text-accent-violet">
              <Settings size={18} />
            </div>
            <h2 className="font-black tracking-tight text-sm uppercase">Quick Links</h2>
          </div>
          <div className="space-y-1">
            <button className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold bg-accent-violet text-white shadow-[0_0_12px_rgba(124,91,255,0.2)]">
              General & Connections
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition"
            >
              Back to Watchlist
            </button>
          </div>
        </div>

        {/* Informational Guidelines */}
        <div className="bg-surface-2 border border-border-subtle rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wide">
            <AlertTriangle size={14} className="text-accent-gold" />
            <span>Sync Guidelines</span>
          </h3>
          <ul className="space-y-2 text-[11px] text-text-muted leading-relaxed list-disc list-inside">
            <li>Auto-Sync occurs when watch progress reaches 95% on an episode.</li>
            <li>Manual list updates on score/status trigger instant synchronization.</li>
            <li>For MAL, scores are rounded to the nearest integer (1-10).</li>
            <li>Ensure popup blockers don't intercept verification redirects.</li>
          </ul>
        </div>
      </div>

      {/* ─── Main Content Panels ─── */}
      <div className="md:col-span-2 space-y-6">
        {/* Floating Notification Alerts */}
        {notification && (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
            <div className="flex-1 text-xs font-semibold">{notification.text}</div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold hover:underline ml-2 uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Profile Preferences Section */}
        <div className="glass-panel border border-border-default rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2 text-text-primary border-b border-border-subtle pb-4">
            <User size={20} className="text-accent-violet" />
            <h2 className="text-lg font-black tracking-tight font-display">Profile Preferences</h2>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full bg-surface-3 border border-border-subtle rounded-xl px-4 py-2.5 text-xs text-text-disabled cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-surface-3 border border-border-subtle rounded-xl px-4 py-2.5 text-xs text-text-disabled cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                placeholder="e.g. AnimeKing"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bio / Signature</label>
              <textarea
                placeholder="Tell the community about yourself..."
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary resize-none leading-relaxed"
              />
            </div>

            {/* Avatar & Banner Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border-subtle">
              {/* Avatar Uploader */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Avatar (Profile Picture)</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-border-subtle overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-text-muted font-bold uppercase">No PFP</span>
                    )}
                  </div>
                  <div className="flex-grow space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-file-input"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 256, 256);
                            setAvatar(compressed);
                          } catch (err) {
                            console.error('Failed to compress avatar:', err);
                          }
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('avatar-file-input')?.click()}
                        className="px-3 py-1.5 bg-surface-3 border border-border-subtle text-text-primary rounded-xl text-xs font-semibold hover:border-border-emphasis transition"
                      >
                        Upload PFP
                      </button>
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar('')}
                          className="px-3 py-1.5 border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-xl transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste image URL..."
                      value={avatar.startsWith('data:') ? '' : avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-3 py-1.5 text-xs text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Uploader */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Custom Banner</label>
                <div className="flex flex-col gap-3">
                  <div className="w-full h-16 rounded-xl bg-surface-3 border border-border-subtle overflow-hidden flex items-center justify-center relative">
                    {banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={banner} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-text-muted font-bold uppercase">No Banner</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="banner-file-input"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 800, 300);
                            setBanner(compressed);
                          } catch (err) {
                            console.error('Failed to compress banner:', err);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('banner-file-input')?.click()}
                      className="px-3 py-1.5 bg-surface-3 border border-border-subtle text-text-primary rounded-xl text-xs font-semibold hover:border-border-emphasis transition"
                    >
                      Upload Banner
                    </button>
                    {banner && (
                      <button
                        type="button"
                        onClick={() => setBanner('')}
                        className="px-3 py-1.5 border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-xl transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste banner URL..."
                    value={banner.startsWith('data:') ? '' : banner}
                    onChange={(e) => setBanner(e.target.value)}
                    className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-3 py-1.5 text-xs text-text-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">

            {profileMessage && (
              <p
                className={`text-xs font-semibold ${
                  profileMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {profileMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold transition shadow-[0_0_12px_rgba(124,91,255,0.2)] disabled:opacity-50"
            >
              {isSavingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Profile Changes</span>
            </button>
            </div>
          </form>
        </div>

        {/* 2. Connected Trackers Sync Section */}
        <AccountLink user={user} setNotification={setNotification} />
      </div>
    </div>
  );
}
