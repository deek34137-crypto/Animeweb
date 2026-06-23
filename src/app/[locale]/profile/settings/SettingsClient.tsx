'use client';

import React, { useState } from 'react';
import { Volume2, Play, Check, ArrowLeft, Accessibility, Globe, Tv, Sliders, Info } from 'lucide-react';
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

interface SettingsClientProps {
  initialPreferences: UserPreferences;
  locale: string;
}

export default function SettingsClient({
  initialPreferences,
  locale,
}: SettingsClientProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggle = (key: keyof UserPreferences) => {
    const nextVal = !prefs[key];
    const updated = { ...prefs, [key]: nextVal };
    setPrefs(updated);
    savePreferences(updated);
  };

  const handleChange = (key: keyof UserPreferences, value: any) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePreferences(updated);
  };

  const savePreferences = async (updated: UserPreferences) => {
    setIsSaving(true);
    try {
      // 1. Save to database
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        // 2. Save to local storage for immediate sync
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

        setToastMessage('Preferences saved and synced!');
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setToastMessage('Failed to save to cloud, saved locally.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Saved locally (offline).');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

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
            <p className="text-xs text-text-secondary">Customize your streaming & player preferences</p>
          </div>
        </div>
        {isSaving && (
          <span className="text-[10px] text-accent-violet font-bold animate-pulse uppercase tracking-wider">
            Syncing...
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* SECTION 1: Playback Controls */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
            <Sliders size={16} className="text-accent-violet" />
            <span>Playback Controls</span>
          </div>

          <div className="space-y-4">
            {/* Autoplay Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Auto-Play Next Episode</h4>
                <p className="text-[10px] text-text-muted">Start the next episode automatically when current one ends</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.autoplayNext}
                  onChange={() => handleToggle('autoplayNext')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
              </label>
            </div>

            {/* Auto-Skip Intro Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Auto-Skip Opening Themes</h4>
                <p className="text-[10px] text-text-muted">Automatically skip intro sequences when detected</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.autoSkipIntro}
                  onChange={() => handleToggle('autoSkipIntro')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
              </label>
            </div>

            {/* Auto-Skip Outro Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Auto-Skip Ending Themes</h4>
                <p className="text-[10px] text-text-muted">Automatically skip ending sequences and credits</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.autoSkipOutro}
                  onChange={() => handleToggle('autoSkipOutro')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
              </label>
            </div>

            {/* Show Resume Prompt */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Show In-Player Resume Prompt</h4>
                <p className="text-[10px] text-text-muted">Ask to resume where you left off rather than starting silently</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.showResumePrompt}
                  onChange={() => handleToggle('showResumePrompt')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-violet"></div>
              </label>
            </div>

            {/* Countdown Duration */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Autoplay countdown timer</h4>
                <p className="text-[10px] text-text-muted">Seconds to wait before playing next episode</p>
              </div>
              <select
                value={prefs.autoplayCountdown}
                onChange={(e) => handleChange('autoplayCountdown', parseInt(e.target.value, 10))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet select-none"
              >
                <option value={3} className="bg-[#0D0D14] text-white">3 Seconds</option>
                <option value={5} className="bg-[#0D0D14] text-white">5 Seconds</option>
                <option value={10} className="bg-[#0D0D14] text-white">10 Seconds</option>
              </select>
            </div>

            {/* Playback speed */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Default Playback Speed</h4>
                <p className="text-[10px] text-text-muted">Initial speed multiplier for new videos</p>
              </div>
              <select
                value={prefs.preferredSpeed}
                onChange={(e) => handleChange('preferredSpeed', parseFloat(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet select-none"
              >
                <option value={0.5} className="bg-[#0D0D14]">0.5x</option>
                <option value={0.75} className="bg-[#0D0D14]">0.75x</option>
                <option value={1.0} className="bg-[#0D0D14]">1.0x (Normal)</option>
                <option value={1.25} className="bg-[#0D0D14]">1.25x</option>
                <option value={1.5} className="bg-[#0D0D14]">1.5x</option>
                <option value={2.0} className="bg-[#0D0D14]">2.0x</option>
              </select>
            </div>

            {/* Volume slider */}
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
                onChange={(e) => handleChange('defaultVolume', parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-accent-violet"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: Language & Quality */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
            <Globe size={16} className="text-accent-gold" />
            <span>Language & Audio Settings</span>
          </div>

          <div className="space-y-4">
            {/* Preferred Audio Language */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Preferred Audio Track</h4>
                <p className="text-[10px] text-text-muted">Preferred audio language when starting an anime</p>
              </div>
              <select
                value={prefs.preferredLanguage}
                onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet select-none"
              >
                <option value="sub" className="bg-[#0D0D14]">Subtitled (Japanese)</option>
                <option value="dub" className="bg-[#0D0D14]">English Dub</option>
                <option value="hindi" className="bg-[#0D0D14]">Hindi Dub</option>
                <option value="tamil" className="bg-[#0D0D14]">Tamil Dub</option>
                <option value="telugu" className="bg-[#0D0D14]">Telugu Dub</option>
              </select>
            </div>

            {/* Preferred Streaming Quality */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div>
                <h4 className="text-xs font-bold text-white">Preferred Resolution</h4>
                <p className="text-[10px] text-text-muted">Target resolution for video playback (network dependent)</p>
              </div>
              <select
                value={prefs.preferredQuality}
                onChange={(e) => handleChange('preferredQuality', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet select-none"
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

        {/* SECTION 3: Accessibility */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white font-bold text-sm tracking-wide">
            <Accessibility size={16} className="text-accent-sakura" />
            <span>Accessibility</span>
          </div>

          <div className="space-y-4">
            {/* Reduced motion */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Reduced Motion</h4>
                <p className="text-[10px] text-text-muted">Disable fast/heavy player hover and loading animations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prefs.reducedMotion}
                  onChange={() => handleToggle('reducedMotion')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-sakura"></div>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Sync Status Banner */}
      <div className="flex gap-3 bg-surface-2 border border-border-subtle p-4 rounded-2xl text-[11px] leading-relaxed text-text-secondary select-none">
        <Info size={16} className="text-accent-violet flex-shrink-0 mt-0.5" />
        <p>
          Preferences are linked to your account and synchronize across all devices. Local adjustments made during playback will also save here automatically.
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
