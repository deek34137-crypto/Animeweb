'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export type ImportStage = 'idle' | 'connecting' | 'fetching' | 'matching' | 'saving' | 'completed' | 'failed' | 'retrying';

interface ImportStatusProps {
  stage: ImportStage;
  progress: number;
  currentItem: string;
  successCount: number;
  totalCount: number;
  errorMessage?: string;
  onRetry?: () => void;
  provider: 'mal' | 'anilist';
}

export default function ImportStatus({
  stage,
  progress,
  currentItem,
  successCount,
  totalCount,
  errorMessage,
  onRetry,
  provider
}: ImportStatusProps) {
  const getProviderName = () => (provider === 'mal' ? 'MyAnimeList' : 'AniList');

  const getStageDescription = () => {
    switch (stage) {
      case 'connecting':
        return `Establishing OAuth handshake with ${getProviderName()} API...`;
      case 'fetching':
        return `Fetching anime lists (Watching, Completed, Plan to Watch)...`;
      case 'matching':
        return `Resolving and matching entries with Aniworld catalog...`;
      case 'saving':
        return `Writing tracker records to local library database...`;
      case 'retrying':
        return `API rate limit hit. Retrying request in 2 seconds...`;
      case 'completed':
        return `Import finished! Library synced successfully.`;
      case 'failed':
        return `Import failed: ${errorMessage || 'Unknown API timeout.'}`;
      default:
        return 'Ready to sync.';
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Stage Status Icon + Text */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {['connecting', 'fetching', 'matching', 'saving'].includes(stage) && (
            <Loader2 size={18} className="animate-spin text-[#7c3aed]" />
          )}
          {stage === 'retrying' && (
            <RefreshCw size={18} className="animate-spin text-amber-500" />
          )}
          {stage === 'completed' && (
            <CheckCircle2 size={18} className="text-emerald-500" />
          )}
          {stage === 'failed' && (
            <AlertCircle size={18} className="text-red-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-primary leading-snug">
            {stage === 'completed' ? 'Sync Completed' : stage === 'failed' ? 'Connection Error' : stage === 'retrying' ? 'Rate Limit Mitigation' : 'Syncing Tracker Data'}
          </p>
          <p className="text-[11px] text-text-secondary truncate mt-0.5">
            {getStageDescription()}
          </p>
        </div>
        <span className="text-xs font-extrabold text-text-primary">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/[0.04] rounded-full overflow-hidden h-1.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            stage === 'failed'
              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : stage === 'retrying'
              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : stage === 'completed'
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] shadow-[0_0_8px_rgba(124,58,237,0.5)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current item and count info */}
      {stage !== 'completed' && stage !== 'failed' && stage !== 'idle' && (
        <div className="flex justify-between items-center bg-white/[0.02] border border-border-subtle rounded-xl p-3 text-[11px]">
          <div className="min-w-0 pr-4">
            <span className="text-text-muted block text-[9px] uppercase font-bold tracking-wider mb-0.5">Processing</span>
            <p className="text-text-primary truncate font-medium">{currentItem || 'Preparing items...'}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-text-muted block text-[9px] uppercase font-bold tracking-wider mb-0.5">Progress</span>
            <p className="text-text-primary font-bold">{successCount} / {totalCount} items</p>
          </div>
        </div>
      )}

      {/* Success Summary */}
      {stage === 'completed' && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 text-center space-y-1">
          <p className="text-xs font-bold text-emerald-400">Successfully Imported {successCount} Anime!</p>
          <p className="text-[10px] text-emerald-500/80">Your Aniworld library has been updated and synchronized with MyAnimeList.</p>
        </div>
      )}

      {/* Error Summary */}
      {stage === 'failed' && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 space-y-3">
          <p className="text-xs font-medium text-red-400 text-center leading-relaxed">
            {errorMessage || 'A sync conflict occurred while writing library records.'}
          </p>
          {onRetry && (
            <div className="flex justify-center">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all"
              >
                <RefreshCw size={11} />
                <span>Retry Import</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
