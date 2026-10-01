'use client';

import React from 'react';
import { Zap } from 'lucide-react';

interface DistilledScoreBadgeProps {
  distilledScore: number | null | undefined;
  totalVotes?: number;
  className?: string;
}

export default function DistilledScoreBadge({
  distilledScore,
  totalVotes = 0,
  className = '',
}: DistilledScoreBadgeProps) {
  if (distilledScore == null || (totalVotes > 0 && totalVotes < 3)) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-500/30 backdrop-blur-md shadow-sm ${className}`}
      title={`Distilled Score: ${distilledScore.toFixed(2)} (${totalVotes} votes). Anti-brigading algorithm applied.`}
    >
      <Zap className="w-3 h-3 text-violet-400 fill-violet-400/20" />
      <span>{distilledScore.toFixed(2)}</span>
    </div>
  );
}
