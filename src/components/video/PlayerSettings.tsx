import React, { useState } from 'react';
import { Settings, ChevronRight, Check } from 'lucide-react';
import QualitySelector from './QualitySelector';
import LanguageSelector from './LanguageSelector';
import SubtitleSelector from './SubtitleSelector';

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

  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;

  isAutoplayNext: boolean;
  onToggleAutoplay: () => void;

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
  playbackSpeed,
  onChangeSpeed,
  isAutoplayNext,
  onToggleAutoplay,
  providers,
  currentProvider,
  onSelectProvider,
  onClose,
}: PlayerSettingsProps) {
  const [view, setView] = useState<'main' | 'quality' | 'language' | 'subtitles' | 'speed' | 'provider'>('main');

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
        />
      </div>
    );
  }

  if (view === 'speed') {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
          <button
            onClick={() => setView('main')}
            className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-xs select-none">Playback Speed</span>
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

  if (view === 'provider') {
    return (
      <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-44 shadow-2xl z-50 text-xs text-white animate-fade-up">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
          <button
            onClick={() => setView('main')}
            className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-xs select-none">Stream Provider</span>
        </div>
        <div className="space-y-0.5">
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => {
                onSelectProvider(provider);
                setView('main');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs capitalize ${
                currentProvider.toLowerCase() === provider.toLowerCase()
                  ? 'text-accent-violet font-semibold bg-accent-violet/5'
                  : 'text-text-secondary'
              }`}
            >
              <span>{provider}</span>
              {currentProvider.toLowerCase() === provider.toLowerCase() && <Check size={14} className="text-accent-violet" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-10 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3 min-w-[190px] shadow-2xl z-50 text-xs text-white space-y-2.5 animate-fade-up">
      <p className="px-1 text-text-disabled font-black uppercase tracking-wider text-[8px] flex items-center gap-1 select-none">
        <Settings size={10} />
        Settings
      </p>
      
      <div className="space-y-0.5 border-t border-white/5 pt-1.5">
        {/* Quality Button */}
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
 
        {/* Audio / Language Button */}
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

        {/* Subtitles Button */}
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

        {/* Playback Speed Button */}
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

        {/* Provider Source Button */}
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

        {/* Auto Next Toggle */}
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
      </div>
    </div>
  );
}
