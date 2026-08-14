import React, { useState, useEffect } from 'react';
import { Settings, ChevronRight, Check } from 'lucide-react';
import QualitySelector from './QualitySelector';
import LanguageSelector from './LanguageSelector';
import SubtitleSelector from './SubtitleSelector';
import SubtitleStylingOverlay from './SubtitleStylingOverlay';
import SubtitleSyncOverlay from './SubtitleSyncOverlay';
import type { SubtitleStyle, SubtitleCapabilities, PlayerAction, KeyBinding } from '@/lib/player/types';
import { usePlayerPreferences } from './PlayerContext';
import { DEFAULT_KEYBINDS } from '@/lib/player/preferences/preferences';

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

interface PlayerSettingsProps {
  levels: string[];
  currentLevel: string;
  onSelectQuality: (level: string) => void;
  
  currentLanguage: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu';
  onSelectLanguage: (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu') => void;
  hasSub: boolean;
  hasDub: boolean;
  hasHindi: boolean;
  hasTamil?: boolean;
  hasTelugu?: boolean;

  subtitles: SubtitleTrack[];
  activeSubtitleIdx: number;
  onSelectSubtitle: (idx: number) => void;
  capabilities?: SubtitleCapabilities | null;
  subtitlesVisible?: boolean;
  onToggleVisibility?: () => void;
  subtitleStyle?: SubtitleStyle;
  onChangeSubtitleStyle?: (style: SubtitleStyle) => void;
  subtitleDelayOffset?: number;
  onChangeSubtitleDelay?: (delayMs: number) => void;

  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;

  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;

  autoSkipIntro: boolean;
  onToggleAutoSkipIntro: () => void;
  autoSkipOutro: boolean;
  onToggleAutoSkipOutro: () => void;
  autoplayCountdown: number;
  onSelectCountdown: (seconds: number) => void;

  providers: string[];
  currentProvider: string;
  onSelectProvider: (provider: string) => void;

  onClose: () => void;
}

export default function PlayerSettings({
  levels,
  currentLevel,
  onSelectQuality,
  currentLanguage,
  onSelectLanguage,
  hasSub,
  hasDub,
  hasHindi,
  hasTamil = false,
  hasTelugu = false,
  subtitles,
  activeSubtitleIdx,
  onSelectSubtitle,
  capabilities,
  subtitlesVisible = true,
  onToggleVisibility,
  subtitleStyle,
  onChangeSubtitleStyle,
  subtitleDelayOffset = 0,
  onChangeSubtitleDelay,
  playbackSpeed,
  onChangeSpeed,
  isAutoplayNext,
  onToggleAutoplay,
  autoSkipIntro,
  onToggleAutoSkipIntro,
  autoSkipOutro,
  onToggleAutoSkipOutro,
  autoplayCountdown,
  onSelectCountdown,
  providers,
  currentProvider,
  onSelectProvider,
  onClose,
}: PlayerSettingsProps) {
  const [view, setView] = useState<'main' | 'quality' | 'language' | 'subtitles' | 'subtitle-styling' | 'subtitle-sync' | 'speed' | 'provider' | 'countdown' | 'shortcuts'>('main');
  const [bindingAction, setBindingAction] = useState<PlayerAction | null>(null);

  const { preferences, setDevicePreference } = usePlayerPreferences() as any;
  const currentBinds = preferences?.keyBinds || {};

  const handleRemap = (action: PlayerAction, binding: KeyBinding) => {
    const reservedCodes = [
      'KeyW', 'KeyR', 'KeyT', 'KeyN', 'KeyL',
      'F11', 'F12',
    ];
    if (reservedCodes.includes(binding.code)) {
      alert(`The key "${binding.code}" is reserved by the browser/system.`);
      return;
    }

    const conflicts = Object.entries(currentBinds).find(([act, bind]) => {
      const b = bind as any;
      return act !== action && b && b.code === binding.code &&
        !!b.ctrl === !!binding.ctrl &&
        !!b.alt === !!binding.alt &&
        !!b.shift === !!binding.shift &&
        !!b.meta === !!binding.meta;
    });

    const updatedBinds = { ...currentBinds };

    if (conflicts) {
      const conflictAction = conflicts[0];
      const proceed = confirm(`The key "${binding.code}" is already assigned to "${conflictAction}". Do you want to swap them?`);
      if (!proceed) return;

      const oldKey = currentBinds[action] || DEFAULT_KEYBINDS[action];
      updatedBinds[conflictAction] = oldKey;
    }

    updatedBinds[action] = binding;
    setDevicePreference('keyBinds', updatedBinds);
  };

  useEffect(() => {
    if (!bindingAction) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setBindingAction(null);
        return;
      }

      const binding: KeyBinding = {
        code: e.code,
        ctrl: e.ctrlKey || undefined,
        alt: e.altKey || undefined,
        shift: e.shiftKey || undefined,
        meta: e.metaKey || undefined,
      };

      handleRemap(bindingAction, binding);
      setBindingAction(null);
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [bindingAction, currentBinds]);

  const activeSubtitleLabel = activeSubtitleIdx === -1 ? 'Off' : subtitles[activeSubtitleIdx]?.label || 'Off';

  if (view === 'quality') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white">
        <QualitySelector
          levels={levels}
          currentLevel={currentLevel}
          onSelectQuality={(lvl) => {
            onSelectQuality(lvl);
            setView('main');
          }}
          onBack={() => setView('main')}
        />
      </div>
    );
  }

  if (view === 'language') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white">
        <LanguageSelector
          currentLanguage={currentLanguage}
          onSelectLanguage={(lang) => {
            onSelectLanguage(lang);
            setView('main');
          }}
          hasSub={hasSub}
          hasDub={hasDub}
          hasHindi={hasHindi}
          hasTamil={hasTamil}
          hasTelugu={hasTelugu}
          onBack={() => setView('main')}
        />
      </div>
    );
  }

  if (view === 'subtitles') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white">
        <SubtitleSelector
          subtitles={subtitles}
          activeSubtitleIdx={activeSubtitleIdx}
          onSelectSubtitle={(idx) => {
            onSelectSubtitle(idx);
            setView('main');
          }}
          onBack={() => setView('main')}
          capabilities={capabilities}
          subtitlesVisible={subtitlesVisible}
          onToggleVisibility={onToggleVisibility}
          onOpenStyling={() => setView('subtitle-styling')}
          onOpenSync={() => setView('subtitle-sync')}
        />
      </div>
    );
  }

  if (view === 'subtitle-styling') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <SubtitleStylingOverlay
          style={subtitleStyle!}
          onChangeStyle={onChangeSubtitleStyle!}
          onBack={() => setView('main')}
        />
      </div>
    );
  }

  if (view === 'subtitle-sync') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <SubtitleSyncOverlay
          delayMs={subtitleDelayOffset}
          onChangeDelay={onChangeSubtitleDelay!}
          onBack={() => setView('main')}
        />
      </div>
    );
  }

  if (view === 'speed') {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
          <button
            onClick={() => setView('main')}
            className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-xs select-none">Speed</span>
        </div>
        <div className="space-y-0.5">
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => {
                onChangeSpeed(speed);
                setView('main');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs ${
                playbackSpeed === speed
                  ? 'text-accent-violet font-semibold bg-accent-violet/5'
                  : 'text-text-secondary'
              }`}
            >
              <span>{speed}x</span>
              {playbackSpeed === speed && <Check size={14} className="text-accent-violet" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'shortcuts') {
    const actionsList: { key: PlayerAction; label: string }[] = [
      { key: 'togglePlay', label: 'Play / Pause' },
      { key: 'seekBackward', label: 'Seek Backward' },
      { key: 'seekForward', label: 'Seek Forward' },
      { key: 'volumeUp', label: 'Volume Up' },
      { key: 'volumeDown', label: 'Volume Down' },
      { key: 'toggleMute', label: 'Mute / Unmute' },
      { key: 'toggleFullscreen', label: 'Fullscreen' },
      { key: 'cycleSubtitle', label: 'Cycle Subtitles' },
      { key: 'delayDecrease', label: 'Subtitle Delay -' },
      { key: 'delayIncrease', label: 'Subtitle Delay +' },
      { key: 'delayReset', label: 'Reset Subtitle Delay' },
      { key: 'speedIncrease', label: 'Speed Increase' },
      { key: 'speedDecrease', label: 'Speed Decrease' },
      { key: 'nextEpisode', label: 'Next Episode' },
      { key: 'prevEpisode', label: 'Previous Episode' },
      { key: 'skipIntro', label: 'Skip Intro' },
      { key: 'skipEnding', label: 'Skip Ending' },
    ];

    const getBindDisplay = (action: PlayerAction) => {
      const bind = currentBinds[action] || DEFAULT_KEYBINDS[action];
      if (!bind) return 'None';
      const parts: string[] = [];
      if (bind.ctrl) parts.push('Ctrl');
      if (bind.alt) parts.push('Alt');
      if (bind.shift) parts.push('Shift');
      if (bind.meta) parts.push('Meta');
      parts.push(bind.code.replace('Key', '').replace('Digit', ''));
      return parts.join(' + ');
    };

    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-56 max-h-72 overflow-y-auto shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setView('main')}
              className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
            >
              ←
            </button>
            <span className="text-white font-bold text-xs select-none">Remap Hotkeys</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all keybindings to defaults?')) {
                setDevicePreference('keyBinds', {});
              }
            }}
            className="text-[10px] text-accent-violet hover:underline font-semibold"
          >
            Reset All
          </button>
        </div>

        {bindingAction ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-white font-bold animate-pulse">Press any key to bind...</p>
            <p className="text-[10px] text-text-muted">Press Escape to cancel</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {actionsList.map((act) => (
              <div key={act.key} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-text-secondary">{act.label}</span>
                <button
                  onClick={() => setBindingAction(act.key)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-accent-violet/50 hover:bg-white/10 text-white font-mono text-[10px] min-w-16 text-center select-none"
                >
                  {getBindDisplay(act.key)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'provider') {
    // Split providers into primary and drawer groups based on position in the array.
    // Convention: providers starting with '*' separator are drawer providers.
    // The VideoPlayer passes all selectable providers; we detect the split by
    // checking for the sentinel separator '__drawer__' injected by the registry.
    const separatorIdx = providers.indexOf('__drawer__');
    const primaryProviders = separatorIdx !== -1 ? providers.slice(0, separatorIdx) : providers;
    const drawerProviders  = separatorIdx !== -1 ? providers.slice(separatorIdx + 1) : [];

    const [drawerOpen, setDrawerOpen] = React.useState(
      drawerProviders.includes(currentProvider.toLowerCase())
    );

    const providerDisplayName = (name: string) =>
      name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const ProviderButton = ({
      provider,
      isPrimary,
    }: {
      provider: string;
      isPrimary: boolean;
    }) => {
      const isActive = currentProvider.toLowerCase() === provider.toLowerCase();
      return (
        <button
          key={provider}
          onClick={() => {
            onSelectProvider(provider);
            setView('main');
          }}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between gap-2 text-xs ${
            isActive
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            {/* Status dot — green = primary/fast, yellow = drawer/extra */}
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isPrimary ? 'bg-green-400' : 'bg-yellow-400/80'
              }`}
            />
            <span className="truncate">{providerDisplayName(provider)}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {isActive && <Check size={12} className="text-accent-violet" />}
          </span>
        </button>
      );
    };

    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-52 max-h-80 overflow-y-auto shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
          <button
            onClick={() => setView('main')}
            className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-xs select-none">Stream Provider</span>
        </div>

        {/* Primary providers */}
        {primaryProviders.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-1 pt-0.5 pb-1 text-[9px] font-black uppercase tracking-widest text-text-disabled flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              Primary
            </p>
            {primaryProviders.map(p => (
              <ProviderButton key={p} provider={p} isPrimary={true} />
            ))}
          </div>
        )}

        {/* Drawer extras — collapsible */}
        {drawerProviders.length > 0 && (
          <div className="mt-1.5 border-t border-white/5 pt-1.5 space-y-0.5">
            <button
              onClick={() => setDrawerOpen(o => !o)}
              className="w-full flex items-center justify-between px-1 pb-1 text-[9px] font-black uppercase tracking-widest text-text-disabled hover:text-text-secondary transition-colors"
            >
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
                More Providers
              </span>
              <span className="text-[10px]">{drawerOpen ? '▲' : '▼'}</span>
            </button>
            {drawerOpen && drawerProviders.map(p => (
              <ProviderButton key={p} provider={p} isPrimary={false} />
            ))}
          </div>
        )}
      </div>
    );
  }


  if (view === 'countdown') {
    const options = [3, 5, 10];
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
          <button
            onClick={() => setView('main')}
            className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-xs select-none">Timer Duration</span>
        </div>
        <div className="space-y-0.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onSelectCountdown(opt);
                setView('main');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs ${
                autoplayCountdown === opt
                  ? 'text-accent-violet font-semibold bg-accent-violet/5'
                  : 'text-text-secondary'
              }`}
            >
              <span>{opt} Seconds</span>
              {autoplayCountdown === opt && <Check size={14} className="text-accent-violet" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-[210px] shadow-2xl z-50 text-xs text-white space-y-2.5 animate-fade-up">
      <p className="px-1 text-text-disabled font-black uppercase tracking-wider text-[8px] flex items-center gap-1 select-none">
        <Settings size={10} />
        Settings
      </p>
      
      <div className="space-y-0.5 border-t border-white/5 pt-1.5">
        <button
          onClick={() => setView('quality')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Quality</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px] capitalize">
            {currentLevel}
            <ChevronRight size={12} />
          </span>
        </button>
 
        <button
          onClick={() => setView('language')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Audio</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px] uppercase">
            {currentLanguage}
            <ChevronRight size={12} />
          </span>
        </button>

        <button
          onClick={() => setView('subtitles')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Subtitles</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px] truncate max-w-[80px]">
            {activeSubtitleLabel}
            <ChevronRight size={12} />
          </span>
        </button>

        <button
          onClick={() => setView('speed')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Speed</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px]">
            {playbackSpeed}x
            <ChevronRight size={12} />
          </span>
        </button>

        <button
          onClick={() => setView('shortcuts')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Shortcuts</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px]">
            Remap
            <ChevronRight size={12} />
          </span>
        </button>

        <button
          onClick={() => setView('countdown')}
          className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
        >
          <span>Timer Duration</span>
          <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px]">
            {autoplayCountdown}s
            <ChevronRight size={12} />
          </span>
        </button>

        {providers.length > 0 && (
          <button
            onClick={() => setView('provider')}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-text-secondary hover:text-white"
          >
            <span>Provider</span>
            <span className="flex items-center gap-0.5 text-text-muted font-bold text-[10px] capitalize">
              {currentProvider}
              <ChevronRight size={12} />
            </span>
          </button>
        )}

        <div className="flex items-center justify-between px-2 py-1.5 border-t border-white/5 mt-1 pt-1.5">
          <span className="text-text-secondary">Auto-Next Ep</span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAutoplayNext}
              onChange={onToggleAutoplay}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent-violet"></div>
          </label>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-text-secondary">Auto-Skip Intro</span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSkipIntro}
              onChange={onToggleAutoSkipIntro}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent-violet"></div>
          </label>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-text-secondary">Auto-Skip Outro</span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSkipOutro}
              onChange={onToggleAutoSkipOutro}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent-violet"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
