import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PlayerErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function PlayerError({
  message = 'Failed to load video stream. The source might be offline or blocked.',
  onRetry,
}: PlayerErrorProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4 text-center">
      <div className="max-w-sm space-y-4 animate-fade-up">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <AlertCircle size={24} className="animate-bounce" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white font-display">Playback Error</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {message}
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            size="sm"
            className="mx-auto flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Try Alternative Source
          </Button>
        )}
      </div>
    </div>
  );
}
