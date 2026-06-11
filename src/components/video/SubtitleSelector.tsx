import React from 'react';
import { Check } from 'lucide-react';

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
}

export default function SubtitleSelector({
  subtitles,
  activeSubtitleIdx,
  onSelectSubtitle,
  onBack,
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
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
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
    </div>
  );
}
