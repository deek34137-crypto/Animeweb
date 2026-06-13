import React from 'react';
import { Check } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu';
  onSelectLanguage: (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu') => void;
  hasSub: boolean;
  hasDub: boolean;
  hasHindi: boolean;
  hasTamil?: boolean;
  hasTelugu?: boolean;
  onBack: () => void;
}

export default function LanguageSelector({
  currentLanguage,
  onSelectLanguage,
  hasSub,
  hasDub,
  hasHindi,
  hasTamil = false,
  hasTelugu = false,
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
        {/* Japanese Sub */}
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
        
        {/* English Dub */}
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

        {/* Hindi Dub */}
        <button
          disabled={!hasHindi}
          onClick={() => onSelectLanguage('hindi')}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
            !hasHindi ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
          } ${
            currentLanguage === 'hindi'
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>Hindi Dubbed</span>
            {!hasHindi && (
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-white/10 text-text-muted">
                Unavailable
              </span>
            )}
          </div>
          {currentLanguage === 'hindi' && <Check size={14} className="text-accent-violet" />}
        </button>

        {/* Tamil Dub */}
        <button
          disabled={!hasTamil}
          onClick={() => onSelectLanguage('tamil')}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
            !hasTamil ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
          } ${
            currentLanguage === 'tamil'
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>Tamil Dubbed</span>
            {!hasTamil && (
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-white/10 text-text-muted">
                Unavailable
              </span>
            )}
          </div>
          {currentLanguage === 'tamil' && <Check size={14} className="text-accent-violet" />}
        </button>

        {/* Telugu Dub */}
        <button
          disabled={!hasTelugu}
          onClick={() => onSelectLanguage('telugu')}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
            !hasTelugu ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
          } ${
            currentLanguage === 'telugu'
              ? 'text-accent-violet font-semibold bg-accent-violet/5'
              : 'text-text-secondary'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>Telugu Dubbed</span>
            {!hasTelugu && (
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-white/10 text-text-muted">
                Unavailable
              </span>
            )}
          </div>
          {currentLanguage === 'telugu' && <Check size={14} className="text-accent-violet" />}
        </button>
      </div>
    </div>
  );
}
