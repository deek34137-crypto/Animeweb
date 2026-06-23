'use client';

import React, { useState } from 'react';
import { Play, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from '@/navigation';
import { FranchiseGraph, FranchiseEntry } from '@/lib/franchise';

interface FranchiseTimelineProps {
  franchise: FranchiseGraph;
}

export default function FranchiseTimeline({ franchise }: FranchiseTimelineProps) {
  const [activeTab, setActiveTab] = useState<'recommended' | 'release'>('recommended');
  const [isExpanded, setIsExpanded] = useState(false);

  const currentOrder = activeTab === 'recommended' 
    ? franchise.watchOrders.recommended 
    : franchise.watchOrders.release;

  const displayEntries = isExpanded ? currentOrder : currentOrder.slice(0, 5);
  const showExpandButton = currentOrder.length > 5;

  const renderTimelineEntry = (entry: FranchiseEntry, index: number) => {
    return (
      <div key={entry.malId} className="flex gap-4 relative group">
        {/* Step indicator column */}
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border z-10 transition-all ${
            entry.isCurrent
              ? 'bg-accent-violet border-accent-violet text-white ring-4 ring-accent-violet/20 shadow-[0_0_12px_rgba(124,91,255,0.4)] animate-pulse'
              : 'bg-surface-3 border-border-subtle text-text-secondary group-hover:border-border-emphasis'
          }`}>
            {index + 1}
          </div>
          {index < displayEntries.length - 1 && (
            <div className={`w-0.5 flex-grow my-1 transition-colors ${
              entry.isCurrent || (displayEntries[index + 1] && displayEntries[index + 1].isCurrent)
                ? 'bg-accent-violet/40'
                : 'bg-border-subtle group-hover:bg-border-emphasis/40'
            }`} />
          )}
        </div>

        {/* Info card */}
        <div className={`flex-grow glass-panel border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-200 ${
          entry.isCurrent
            ? 'border-accent-violet bg-accent-violet/5 ring-1 ring-accent-violet/10'
            : 'border-border-default/50 hover:border-border-emphasis hover:bg-surface-2/40'
        }`}>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                entry.isCurrent
                  ? 'bg-accent-violet text-white'
                  : 'bg-surface-2 border border-border-subtle text-text-muted'
              }`}>
                {entry.relation}
              </span>
              {entry.type && (
                <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 bg-black/30 border border-white/5 text-text-disabled rounded">
                  {entry.type}
                </span>
              )}
            </div>
            
            <Link
              href={`/anime/${entry.malId}` as '/'}
              className={`text-xs font-black block truncate transition-colors ${
                entry.isCurrent 
                  ? 'text-accent-violet font-black text-sm' 
                  : 'text-text-primary hover:text-accent-violet'
              }`}
            >
              {entry.title}
            </Link>

            <div className="flex items-center gap-1.5 text-[10px] text-text-disabled">
              {entry.releaseYear && <span>{entry.releaseYear}</span>}
              {entry.releaseYear && entry.episodes !== undefined && <span>·</span>}
              {entry.episodes !== undefined && (
                <span>{entry.episodes} {entry.episodes === 1 ? 'episode' : 'episodes'}</span>
              )}
            </div>
          </div>

          <Link
            href={`/anime/${entry.malId}` as '/'}
            className={`flex items-center justify-center gap-1 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              entry.isCurrent
                ? 'bg-accent-violet hover:bg-accent-violet-hover text-white shadow-md'
                : 'bg-surface-3 hover:bg-surface-4 border border-border-subtle text-text-primary'
            }`}
          >
            <Play size={10} fill="currentColor" />
            <span>Watch</span>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle/50 pb-3">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest font-display flex items-center gap-1.5">
          <HelpCircle size={14} className="text-accent-violet" />
          Franchise Watch Order
        </h3>
        
        <div className="flex bg-surface-2 p-1 rounded-xl border border-border-subtle">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'recommended'
                ? 'bg-accent-violet text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('release')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'release'
                ? 'bg-accent-violet text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Release Order
          </button>
        </div>
      </div>

      {/* Why watch this order explanation panel */}
      {franchise.explanation && (
        <div className="bg-accent-violet/5 border border-accent-violet/10 rounded-2xl p-4 flex gap-3">
          <HelpCircle size={18} className="text-accent-violet shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            {franchise.explanation}
          </p>
        </div>
      )}

      {/* Timeline entries */}
      <div className="space-y-4 relative pl-1.5 py-2">
        {displayEntries.map((entry, index) => renderTimelineEntry(entry, index))}
      </div>

      {/* Expand/Collapse Button */}
      {showExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border-default hover:border-border-emphasis rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all bg-surface-1/40 hover:bg-surface-2/20"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>Expand Timeline ({currentOrder.length - 5} more)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
