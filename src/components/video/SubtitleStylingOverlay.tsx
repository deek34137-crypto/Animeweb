import React, { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { SubtitleStyle } from '@/lib/player/types';

interface SubtitleStylingOverlayProps {
  style: SubtitleStyle;
  onChangeStyle: (style: SubtitleStyle) => void;
  onBack: () => void;
}

export default function SubtitleStylingOverlay({
  style,
  onChangeStyle,
  onBack
}: SubtitleStylingOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc key listeners and focus trapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Focus first element for focus trapping
    const focusable = panelRef.current?.querySelectorAll('button, select, input');
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const updateStyleField = <K extends keyof SubtitleStyle>(key: K, value: SubtitleStyle[K]) => {
    onChangeStyle({
      ...style,
      [key]: value
    });
  };

  const fonts = ['Inter', 'Roboto', 'Arial', 'system-ui', 'monospace'];
  const sizes = [
    { label: '0.8x', value: 0.8 },
    { label: '1.0x', value: 1.0 },
    { label: '1.2x', value: 1.2 },
    { label: '1.5x', value: 1.5 },
    { label: '2.0x', value: 2.0 }
  ];
  const colors = [
    { label: 'White', value: '#FFFFFF' },
    { label: 'Yellow', value: '#FACC15' },
    { label: 'Cyan', value: '#22D3EE' },
    { label: 'Green', value: '#4ADE80' }
  ];
  const backgrounds = [
    { label: 'None', value: 'none' },
    { label: 'Shadow', value: 'shadow' },
    { label: 'Semi-Transparent', value: 'semi-transparent' },
    { label: 'Solid Black', value: 'solid' }
  ];

  return (
    <div 
      ref={panelRef}
      className="space-y-3 animate-fade-up select-none"
      role="dialog"
      aria-label="Subtitle Styling Options"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white transition-colors flex items-center gap-1 font-bold text-xs select-none"
          aria-label="Back to Subtitles Menu"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <span className="text-white font-bold text-xs">Subtitle Styling</span>
      </div>

      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {/* Font Family Selection */}
        <div className="space-y-1">
          <label htmlFor="subtitle-font" className="text-text-muted text-[10px] font-semibold block">Font Family</label>
          <select
            id="subtitle-font"
            value={style.fontFamily}
            onChange={(e) => updateStyleField('fontFamily', e.target.value)}
            className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
          >
            {fonts.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Font Size Multiplier Selection */}
        <div className="space-y-1">
          <label className="text-text-muted text-[10px] font-semibold block">Font Size</label>
          <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Font Size Option">
            {sizes.map((s) => (
              <button
                key={s.label}
                role="radio"
                aria-checked={style.fontSizeMultiplier === s.value}
                onClick={() => updateStyleField('fontSizeMultiplier', s.value)}
                className={`py-1 text-center rounded-lg border text-[10px] transition-all font-semibold ${
                  style.fontSizeMultiplier === s.value
                    ? 'border-accent-violet bg-accent-violet/10 text-accent-violet'
                    : 'border-white/10 text-text-secondary hover:bg-white/5'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color Selection */}
        <div className="space-y-1">
          <label className="text-text-muted text-[10px] font-semibold block">Text Color</label>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Text Color Option">
            {colors.map((c) => (
              <button
                key={c.label}
                role="radio"
                aria-checked={style.textColor === c.value}
                onClick={() => updateStyleField('textColor', c.value)}
                className={`py-1 px-1 rounded-lg border text-[10px] flex items-center justify-center gap-1.5 font-semibold transition-all ${
                  style.textColor === c.value
                    ? 'border-accent-violet bg-accent-violet/10 text-accent-violet'
                    : 'border-white/10 text-text-secondary hover:bg-white/5'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c.value }} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Background Modes */}
        <div className="space-y-1">
          <label htmlFor="subtitle-bg" className="text-text-muted text-[10px] font-semibold block">Background Mode</label>
          <select
            id="subtitle-bg"
            value={style.backgroundMode}
            onChange={(e) => updateStyleField('backgroundMode', e.target.value as any)}
            className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent-violet transition-colors"
          >
            {backgrounds.map((bg) => (
              <option key={bg.value} value={bg.value}>{bg.label}</option>
            ))}
          </select>
        </div>

        {/* Vertical Position */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span className="text-text-muted">Vertical Position</span>
            <span className="text-accent-violet">{style.verticalPosition}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="1"
            value={style.verticalPosition}
            onChange={(e) => updateStyleField('verticalPosition', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-violet"
            aria-label="Subtitle Vertical Position Slider"
          />
        </div>
      </div>
    </div>
  );
}
