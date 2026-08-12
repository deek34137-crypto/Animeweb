import React from 'react';
import { Check, Settings2, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import type { SubtitleCapabilities } from '@/lib/player/types';

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

interface SubtitleSelectorProps {
  subtitles: SubtitleTrack[];
  activeSubtitleIdx: number;
  onSelectSubtitle: (idx: number) => void;
  onBack: () => void;
  onOpenStyling?: () => void;
  onOpenSync?: () => void;
  capabilities?: SubtitleCapabilities | null;
  subtitlesVisible?: boolean;
  onToggleVisibility?: () => void;
}

export default function SubtitleSelector({
  subtitles,
  activeSubtitleIdx,
  onSelectSubtitle,
  onBack,
  onOpenStyling,
  onOpenSync,
  capabilities,
  subtitlesVisible = true,
  onToggleVisibility
}: SubtitleSelectorProps) {
  return (
    <div className="w-full space-y-2 animate-fade-up">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
        >
          ← Back
        </button>
        <span className="text-white font-bold text-xs select-none">Subtitles</span>
      </div>
      
      {/* Scrollable track selection list */}
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        <button
          onClick={() => onSelectSubtitle(-1)}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs ${
            activeSubtitleIdx === -1
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <span>Off</span>
          {activeSubtitleIdx === -1 && <Check size={14} className="text-accent-violet" />}
        </button>
        
        {subtitles.map((track, idx) => (
          <button
            key={track.lang + idx}
            onClick={() => onSelectSubtitle(idx)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs ${
              activeSubtitleIdx === idx
                ? 'text-accent-violet font-semibold bg-accent-violet/5'
                : 'text-text-secondary'
            }`}
          >
            <span>{track.label}</span>
            {activeSubtitleIdx === idx && <Check size={14} className="text-accent-violet" />}
          </button>
        ))}
      </div>

      {/* Styling, Sync & Visibility options */}
      {activeSubtitleIdx !== -1 && (
        <div className="pt-2 border-t border-white/10 space-y-1">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-text-secondary hover:text-white text-xs"
            >
              {subtitlesVisible ? <EyeOff size={13} className="text-text-muted" /> : <Eye size={13} className="text-text-muted" />}
              <span>{subtitlesVisible ? 'Hide Subtitles' : 'Show Subtitles'}</span>
            </button>
          )}

          {capabilities?.supportsCustomStyling && onOpenStyling && (
            <button
              onClick={onOpenStyling}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-text-secondary hover:text-white text-xs"
            >
              <Settings2 size={13} className="text-text-muted" />
              <span>Subtitle Styling</span>
            </button>
          )}

          {capabilities?.supportsDelay && onOpenSync && (
            <button
              onClick={onOpenSync}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-text-secondary hover:text-white text-xs"
            >
              <SlidersHorizontal size={13} className="text-text-muted" />
              <span>Subtitle Timing</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
