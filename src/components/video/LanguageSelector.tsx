import React from 'react';
import { Check } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: 'sub' | 'dub';
  onSelectLanguage: (lang: 'sub' | 'dub') => void;
  hasSub: boolean;
  hasDub: boolean;
  onBack: () => void;
}

export default function LanguageSelector({
  currentLanguage,
  onSelectLanguage,
  hasSub,
  hasDub,
  onBack,
}: LanguageSelectorProps) {
  return (
    <div className="w-full space-y-2 animate-fade-up">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
        >
          ← Back
        </button>
        <span className="text-white font-bold text-xs select-none">Audio / Language</span>
      </div>
      <div className="space-y-1">
        <button
          disabled={!hasSub}
          onClick={() => onSelectLanguage('sub')}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
            !hasSub ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
          } ${
            currentLanguage === 'sub'
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <span>Sub (Japanese Audio)</span>
          {currentLanguage === 'sub' && <Check size={14} className="text-accent-violet" />}
        </button>
        
        <button
          disabled={!hasDub}
          onClick={() => onSelectLanguage('dub')}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
            !hasDub ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
          } ${
            currentLanguage === 'dub'
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>Dub (English Audio)</span>
            {!hasDub && (
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-white/10 text-text-muted">
                Unavailable
              </span>
            )}
          </div>
          {currentLanguage === 'dub' && <Check size={14} className="text-accent-violet" />}
        </button>
      </div>
    </div>
  );
}
