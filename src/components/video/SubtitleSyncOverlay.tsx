import React, { useEffect, useRef } from 'react';
import { ChevronLeft, RotateCcw, Minus, Plus } from 'lucide-react';

interface SubtitleSyncOverlayProps {
  delayMs: number;
  onChangeDelay: (delayMs: number) => void;
  onBack: () => void;
}

export default function SubtitleSyncOverlay({
  delayMs,
  onChangeDelay,
  onBack
}: SubtitleSyncOverlayProps) {
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
    const focusable = panelRef.current?.querySelectorAll('button, input');
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeDelay(parseInt(e.target.value, 10));
  };

  const adjustDelay = (amount: number) => {
    const nextVal = Math.max(-10000, Math.min(10000, delayMs + amount));
    onChangeDelay(nextVal);
  };

  const formatDelayLabel = (val: number) => {
    if (val === 0) return 'Sync (0.0s)';
    const seconds = (val / 1000).toFixed(1);
    return val > 0 ? `+${seconds}s (Subtitle late)` : `${seconds}s (Subtitle early)`;
  };

  return (
    <div 
      ref={panelRef}
      className="space-y-4 animate-fade-up select-none"
      role="dialog"
      aria-label="Subtitle Synchronization Settings"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-white transition-colors flex items-center gap-1 font-bold text-xs select-none"
          aria-label="Back to Subtitles Menu"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <span className="text-white font-bold text-xs">Subtitle Timing</span>
      </div>

      <div className="space-y-3.5">
        {/* Output Delay Status */}
        <div className="text-center bg-[#0D0D14] border border-white/5 rounded-xl py-2 px-3">
          <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Subtitle Offset</p>
          <p className={`text-xs font-bold mt-0.5 ${delayMs === 0 ? 'text-white' : 'text-accent-violet'}`}>
            {formatDelayLabel(delayMs)}
          </p>
        </div>

        {/* Delay Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="-10000"
            max="10000"
            step="100"
            value={delayMs}
            onChange={handleSliderChange}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-violet"
            aria-label="Subtitle Delay Sync Slider"
          />
          <div className="flex justify-between text-[8px] text-text-disabled font-bold px-0.5 select-none">
            <span>-10s (Early)</span>
            <span>0s (Sync)</span>
            <span>+10s (Late)</span>
          </div>
        </div>

        {/* Interactive Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => adjustDelay(-100)}
            className="py-1.5 px-2 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] flex items-center justify-center gap-1 font-semibold text-text-secondary hover:text-white transition-all"
            aria-label="Shift Subtitles 100 milliseconds earlier"
          >
            <Minus size={10} /> 100ms
          </button>
          <button
            onClick={() => adjustDelay(100)}
            className="py-1.5 px-2 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] flex items-center justify-center gap-1 font-semibold text-text-secondary hover:text-white transition-all"
            aria-label="Shift Subtitles 100 milliseconds later"
          >
            <Plus size={10} /> 100ms
          </button>
          
          <button
            onClick={() => adjustDelay(-1000)}
            className="py-1.5 px-2 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] flex items-center justify-center gap-1 font-semibold text-text-secondary hover:text-white transition-all"
            aria-label="Shift Subtitles 1 second earlier"
          >
            <Minus size={10} /> 1.0s
          </button>
          <button
            onClick={() => adjustDelay(1000)}
            className="py-1.5 px-2 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] flex items-center justify-center gap-1 font-semibold text-text-secondary hover:text-white transition-all"
            aria-label="Shift Subtitles 1 second later"
          >
            <Plus size={10} /> 1.0s
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => onChangeDelay(0)}
          disabled={delayMs === 0}
          className="w-full py-1.5 rounded-lg border border-accent-violet/20 hover:border-accent-violet/40 bg-accent-violet/5 hover:bg-accent-violet/10 text-accent-violet transition-all text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Reset Subtitle Sync Timing"
        >
          <RotateCcw size={12} /> Reset to Sync (0s)
        </button>
      </div>
    </div>
  );
}
