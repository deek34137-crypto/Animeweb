import React from 'react';
import { Check } from 'lucide-react';

interface QualitySelectorProps {
  levels: string[];
  currentLevel: string;
  onSelectQuality: (level: string) => void;
  onBack: () => void;
}

export default function QualitySelector({
  levels,
  currentLevel,
  onSelectQuality,
  onBack,
}: QualitySelectorProps) {
  return (
    <div className="w-full space-y-2 animate-fade-up">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white transition-colors font-bold text-xs select-none"
        >
          ← Back
        </button>
        <span className="text-white font-bold text-xs select-none">Stream Quality</span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onSelectQuality(level)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs capitalize ${
              currentLevel === level
                ? 'text-accent-violet font-semibold bg-accent-violet/5'
                : 'text-text-secondary'
            }`}
          >
            <span>{level}</span>
            {currentLevel === level && <Check size={14} className="text-accent-violet" />}
          </button>
        ))}
      </div>
    </div>
  );
}
