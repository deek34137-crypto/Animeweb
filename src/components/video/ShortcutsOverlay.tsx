import React from 'react';
import { X } from 'lucide-react';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

export default function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  const keys = [
    { key: 'Space', action: 'Play / Pause' },
    { key: '←', action: 'Seek Backward 10 seconds' },
    { key: '→', action: 'Seek Forward 10 seconds' },
    { key: '↑', action: 'Increase Volume 10%' },
    { key: '↓', action: 'Decrease Volume 10%' },
    { key: 'M', action: 'Toggle Mute' },
    { key: 'F', action: 'Toggle Fullscreen' },
    { key: 'T', action: 'Theater Mode' },
    { key: 'N', action: 'Next Episode' },
    { key: 'P', action: 'Previous Episode' },
    { key: '?', action: 'Toggle this Shortcuts Overlay' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0D0D14]/95 border border-border-default rounded-2xl p-6 w-full max-w-sm shadow-2xl relative space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-white font-display">Keyboard Shortcuts</h3>
          <p className="text-[10px] text-text-muted">Quick player control options while watching</p>
        </div>

        <div className="border-t border-border-subtle pt-2 space-y-2">
          {keys.map((k) => (
            <div key={k.key} className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">{k.action}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[9px] font-bold">
                {k.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
