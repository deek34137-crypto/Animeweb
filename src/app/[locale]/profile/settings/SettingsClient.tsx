'use client';

import React, { useState } from 'react';
import { Volume2, Play, Check, ArrowLeft, Accessibility, Globe, Tv, Sliders, Info, User, Shield, Sparkles } from 'lucide-react';
import { Link } from '@/navigation';

interface UserPreferences {
  autoplayNext: boolean;
  autoSkipIntro: boolean;
  autoSkipOutro: boolean;
  autoplayCountdown: number;
  preferredLanguage: string;
  preferredQuality: string;
  preferredSpeed: number;
  defaultVolume: number;
  showResumePrompt: boolean;
  reducedMotion: boolean;
}

interface UserProfile {
  displayName: string;
  bio: string;
  favoriteQuote: string;
  location: string;
  profileAccentColor: string;
  profileVisibility: string;
  hideStats: boolean;
  hideLibrary: boolean;
  hideActivity: boolean;
  hideFavorites: boolean;
  hideAchievements: boolean;
  selectedTitleId: string;
  showcaseAnimeId: string;
  showcaseCharacterId: string;
  showcaseStudioId: string;
  showcaseGenreId: string;
}

interface SettingsClientProps {
  initialPreferences: UserPreferences;
  initialProfile: UserProfile;
  unlockedAchievementIds: string[];
  locale: string;
}

const TITLE_MAP: Record<string, string> = {
  first_episode: 'Apprentice Watcher',
  watch_100_episodes: 'Anime Sage',
  complete_10_anime: 'Otaku Master',
  complete_50_anime: 'Absolute Legend',
  write_3_reviews: 'Critic Extraordinaire',
  streak_7_days: 'Daily Devotee',
  secret_easter_egg: 'Hidden Realm Wanderer',
};

const ACCENT_PRESETS = [
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Sakura', value: '#ec4899' },
  { name: 'Gold', value: '#eab308' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
];

export default function SettingsClient({
  initialPreferences,
  initialProfile,
  unlockedAchievementIds,
  locale,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'profile'>('player');
  
  // States
  const [prefs, setPrefs] = useState<UserPreferences>(initialPreferences);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTogglePref = (key: keyof UserPreferences) => {
    const nextVal = !prefs[key];
    const updated = { ...prefs, [key]: nextVal };
    setPrefs(updated);
    savePreferences(updated);
  };

  const handleChangePref = (key: keyof UserPreferences, value: any) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePreferences(updated);
  };

  const handleProfileChange = (key: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleProfile = (key: keyof UserProfile) => {
    setProfile(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async (updated: UserPreferences) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        localStorage.setItem('animeworld:autoplay_next', String(updated.autoplayNext));
        localStorage.setItem('animeworld:auto_skip_intro', String(updated.autoSkipIntro));
        localStorage.setItem('animeworld:auto_skip_outro', String(updated.autoSkipOutro));
        localStorage.setItem('animeworld:autoplay_countdown', String(updated.autoplayCountdown));
        localStorage.setItem('animeworld:preferredLanguage', updated.preferredLanguage);
        localStorage.setItem('animeworld:preferredQuality', updated.preferredQuality);
        localStorage.setItem('animeworld:preferredPlaybackSpeed', String(updated.preferredSpeed));
        localStorage.setItem('animeworld:preferredVolume', String(updated.defaultVolume));
        localStorage.setItem('animeworld:show_resume_prompt', String(updated.showResumePrompt));
        localStorage.setItem('animeworld:reduced_motion', String(updated.reducedMotion));

        setToastMessage('Player preferences saved!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Failed to save cloud sync, saved locally.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setToastMessage('Profile settings updated successfully!');
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        const err = await res.json();
        setToastMessage(`Error: ${err.error || 'Failed to update'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Network error saving profile.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const availableTitles = unlockedAchievementIds
    .map(id => ({ id, name: TITLE_MAP[id] }))
    .filter(t => t.name);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-text-secondary hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-xl border border-white/5"
            aria-label="Back to Profile"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">Settings</h1>
            <p className="text-xs text-text-secondary">Customize your streaming & player profile</p>
          </div>
        </div>
        {isSaving && (
          <span className="text-[10px] text-accent-violet font-bold animate-pulse uppercase tracking-wider">
            Saving...
          </span>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-surface-2 border border-border-subtle rounded-2xl max-w-sm">
        <button
          onClick={() => setActiveTab('player')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'player'
              ? 'bg-accent-violet text-white shadow-md'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <Sliders size={14} />
          Player Options
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-accent-violet text-white shadow-md'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <User size={14} />
          Customize Profile
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'player' ? (
        <div className="space-y-6">
          {/* Playback Controls */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <Sliders size={16} className="text-accent-violet" />
              <span>Playback Controls</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Auto-Play Next Episode</h4>
                  <p className="text-[10px] text-text-muted">Start the next episode automatically when current one ends</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.autoplayNext}
                    onChange={() => handleTogglePref('autoplayNext')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Auto-Skip Opening Themes</h4>
                  <p className="text-[10px] text-text-muted">Automatically skip intro sequences when detected</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.autoSkipIntro}
                    onChange={() => handleTogglePref('autoSkipIntro')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Auto-Skip Ending Themes</h4>
                  <p className="text-[10px] text-text-muted">Automatically skip ending sequences and credits</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.autoSkipOutro}
                    onChange={() => handleTogglePref('autoSkipOutro')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Show In-Player Resume Prompt</h4>
                  <p className="text-[10px] text-text-muted">Ask to resume where you left off rather than starting silently</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.showResumePrompt}
                    onChange={() => handleTogglePref('showResumePrompt')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Autoplay countdown timer</h4>
                  <p className="text-[10px] text-text-muted">Seconds to wait before playing next episode</p>
                </div>
                <select
                  value={prefs.autoplayCountdown}
                  onChange={(e) => handleChangePref('autoplayCountdown', parseInt(e.target.value, 10))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet"
                >
                  <option value={3} className="bg-[#0D0D14] text-white">3 Seconds</option>
                  <option value={5} className="bg-[#0D0D14] text-white">5 Seconds</option>
                  <option value={10} className="bg-[#0D0D14] text-white">10 Seconds</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Default Playback Speed</h4>
                  <p className="text-[10px] text-text-muted">Initial speed multiplier for new videos</p>
                </div>
                <select
                  value={prefs.preferredSpeed}
                  onChange={(e) => handleChangePref('preferredSpeed', parseFloat(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet"
                >
                  <option value={0.5} className="bg-[#0D0D14]">0.5x</option>
                  <option value={0.75} className="bg-[#0D0D14]">0.75x</option>
                  <option value={1.0} className="bg-[#0D0D14]">1.0x (Normal)</option>
                  <option value={1.25} className="bg-[#0D0D14]">1.25x</option>
                  <option value={1.5} className="bg-[#0D0D14]">1.5x</option>
                  <option value={2.0} className="bg-[#0D0D14]">2.0x</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Default Player Volume</h4>
                    <p className="text-[10px] text-text-muted">Volume level used when starting playback</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-accent-violet bg-white/5 px-2 py-0.5 rounded">
                    <Volume2 size={12} />
                    {Math.round(prefs.defaultVolume * 100)}%
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={prefs.defaultVolume}
                  onChange={(e) => handleChangePref('defaultVolume', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-accent-violet"
                />
              </div>
            </div>
          </section>

          {/* Language & Audio Settings */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <Globe size={16} className="text-accent-gold" />
              <span>Language & Audio Settings</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Preferred Audio Track</h4>
                  <p className="text-[10px] text-text-muted">Preferred audio language when starting an anime</p>
                </div>
                <select
                  value={prefs.preferredLanguage}
                  onChange={(e) => handleChangePref('preferredLanguage', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet"
                >
                  <option value="sub" className="bg-[#0D0D14]">Subtitled (Japanese)</option>
                  <option value="dub" className="bg-[#0D0D14]">English Dub</option>
                  <option value="hindi" className="bg-[#0D0D14]">Hindi Dub</option>
                  <option value="tamil" className="bg-[#0D0D14]">Tamil Dub</option>
                  <option value="telugu" className="bg-[#0D0D14]">Telugu Dub</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Preferred Resolution</h4>
                  <p className="text-[10px] text-text-muted">Target resolution for video playback (network dependent)</p>
                </div>
                <select
                  value={prefs.preferredQuality}
                  onChange={(e) => handleChangePref('preferredQuality', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet"
                >
                  <option value="Auto" className="bg-[#0D0D14]">Auto Quality</option>
                  <option value="1080p" className="bg-[#0D0D14]">1080p (Full HD)</option>
                  <option value="720p" className="bg-[#0D0D14]">720p (HD)</option>
                  <option value="480p" className="bg-[#0D0D14]">480p (SD)</option>
                  <option value="360p" className="bg-[#0D0D14]">360p (Low)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Accessibility */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <Accessibility size={16} className="text-accent-sakura" />
              <span>Accessibility</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Reduced Motion</h4>
                  <p className="text-[10px] text-text-muted">Disable fast/heavy player hover and loading animations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prefs.reducedMotion}
                    onChange={() => handleTogglePref('reducedMotion')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-sakura"></div>
                </label>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <form onSubmit={saveProfileSettings} className="space-y-6">
          {/* Profile Details */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <User size={16} className="text-accent-violet" />
              <span>Custom Styling &amp; Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => handleProfileChange('displayName', e.target.value)}
                  placeholder="Aniworld Explorer"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleProfileChange('location', e.target.value)}
                  placeholder="Tokyo, Japan"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Favorite Quote</label>
                <input
                  type="text"
                  value={profile.favoriteQuote}
                  onChange={(e) => handleProfileChange('favoriteQuote', e.target.value)}
                  placeholder="Whatever you do, enjoy it to the fullest."
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Biography</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  placeholder="Write a small description about yourself..."
                  rows={3}
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary resize-none"
                />
              </div>

              {/* Accent Color picker */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Profile Color Theme</label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleProfileChange('profileAccentColor', preset.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                        profile.profileAccentColor === preset.value
                          ? 'border-white text-white font-bold'
                          : 'border-white/10 text-text-muted hover:text-white'
                      }`}
                      style={{ backgroundColor: `${preset.value}15` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.value }} />
                      {preset.name}
                    </button>
                  ))}
                  {/* Custom color picker */}
                  <div className="flex items-center gap-1.5 bg-surface-3 border border-border-subtle rounded-xl px-2.5 py-1 text-xs">
                    <input
                      type="color"
                      value={profile.profileAccentColor}
                      onChange={(e) => handleProfileChange('profileAccentColor', e.target.value)}
                      className="w-6 h-6 border-0 bg-transparent rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-text-secondary uppercase">{profile.profileAccentColor}</span>
                  </div>
                </div>
              </div>

              {/* Player Title Override (unlocked via achievements) */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-accent-gold" />
                  Unlocked Custom Title Override
                </label>
                <select
                  value={profile.selectedTitleId}
                  onChange={(e) => handleProfileChange('selectedTitleId', e.target.value)}
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-3 py-2.5 text-xs text-text-primary"
                >
                  <option value="">No Title Override</option>
                  {availableTitles.map((title) => (
                    <option key={title.id} value={title.id}>
                      🏆 {title.name}
                    </option>
                  ))}
                </select>
                {availableTitles.length === 0 && (
                  <p className="text-[10px] text-text-muted italic pt-1">
                    No custom titles unlocked yet. Complete milestones to unlock titles!
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Showcase Items */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <Sparkles size={16} className="text-accent-gold" />
              <span>Bento Showcase Panels</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Featured showcase modules displayed on your public profile. Enter IDs or keywords to display.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Favorite Anime (ID)</label>
                <input
                  type="text"
                  value={profile.showcaseAnimeId}
                  onChange={(e) => handleProfileChange('showcaseAnimeId', e.target.value)}
                  placeholder="e.g. 5081 (MAL ID)"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Favorite Character</label>
                <input
                  type="text"
                  value={profile.showcaseCharacterId}
                  onChange={(e) => handleProfileChange('showcaseCharacterId', e.target.value)}
                  placeholder="e.g. Lelouch Lamperouge"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Favorite Animation Studio</label>
                <input
                  type="text"
                  value={profile.showcaseStudioId}
                  onChange={(e) => handleProfileChange('showcaseStudioId', e.target.value)}
                  placeholder="e.g. Kyoto Animation"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Favorite Genre</label>
                <input
                  type="text"
                  value={profile.showcaseGenreId}
                  onChange={(e) => handleProfileChange('showcaseGenreId', e.target.value)}
                  placeholder="e.g. Cyberpunk / Sci-Fi"
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:outline-none rounded-xl px-4 py-2.5 text-xs text-text-primary"
                />
              </div>
            </div>
          </section>

          {/* Privacy Controls */}
          <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
              <Shield size={16} className="text-emerald-400" />
              <span>Granular Privacy &amp; Visibility Controls</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white font-display">Who can view your profile?</h4>
                  <p className="text-[10px] text-text-muted">Master switch to restrict profile viewing</p>
                </div>
                <select
                  value={profile.profileVisibility}
                  onChange={(e) => handleProfileChange('profileVisibility', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet"
                >
                  <option value="PUBLIC" className="bg-[#0D0D14]">Public (Everyone)</option>
                  <option value="FRIENDS" className="bg-[#0D0D14]">Friends Only</option>
                  <option value="PRIVATE" className="bg-[#0D0D14]">Private (Only Me)</option>
                </select>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                <h5 className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Granular Visibility Toggles</h5>

                {/* Hide stats */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Statistics Dashboard</h4>
                    <p className="text-[10px] text-text-muted">Restrict others from viewing watch hours and completion totals</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profile.hideStats}
                      onChange={() => handleToggleProfile('hideStats')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                  </label>
                </div>

                {/* Hide library */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Watch Library</h4>
                    <p className="text-[10px] text-text-muted">Keep your list entries private on public pages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profile.hideLibrary}
                      onChange={() => handleToggleProfile('hideLibrary')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                  </label>
                </div>

                {/* Hide activity */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Activity Log</h4>
                    <p className="text-[10px] text-text-muted">Keep updates, status changes, and rating timestamps private</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profile.hideActivity}
                      onChange={() => handleToggleProfile('hideActivity')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                  </label>
                </div>

                {/* Hide favorites */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Favorites List</h4>
                    <p className="text-[10px] text-text-muted">Hide favorite labels on public directory lookups</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profile.hideFavorites}
                      onChange={() => handleToggleProfile('hideFavorites')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                  </label>
                </div>

                {/* Hide achievements */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Achievements &amp; Badges</h4>
                    <p className="text-[10px] text-text-muted">Do not show unlocked trophies and pined tags to others</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profile.hideAchievements}
                      onChange={() => handleToggleProfile('hideAchievements')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-accent-violet text-white text-xs font-bold rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Customization'}
          </button>
        </form>
      )}

      {/* Sync Status Banner */}
      <div className="flex gap-3 bg-surface-2 border border-border-subtle p-4 rounded-2xl text-[11px] leading-relaxed text-text-secondary select-none">
        <Info size={16} className="text-accent-violet flex-shrink-0 mt-0.5" />
        <p>
          Custom styling changes adapt color presets and showcase details instantly. Accent color customization renders on your social profile page.
        </p>
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0D0D14]/90 border border-emerald-500/30 text-white text-xs px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fade-in select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
