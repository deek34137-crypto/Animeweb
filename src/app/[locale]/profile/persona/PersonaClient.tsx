'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Flame, Compass, Share2 } from 'lucide-react';
import { PersonaAxisScores, PersonaDefinition } from '@/lib/persona/personaEngine';

interface PersonaClientProps {
  username: string;
  ratedCount: number;
  persona: any;
  definition: PersonaDefinition | null;
  axisScores: PersonaAxisScores | null;
}

export default function PersonaClient({
  username,
  ratedCount,
  persona,
  definition,
  axisScores,
}: PersonaClientProps) {
  if (ratedCount < 5 || !definition || !axisScores) {
    return (
      <div className="min-h-screen bg-[#0f0f13] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <Brain className="w-12 h-12 text-violet-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Unlock Your Anime Persona</h2>
          <p className="text-sm text-slate-400">
            You need at least <strong className="text-violet-300">5 rated anime</strong> to calculate your MBTI-style Anime Persona.
          </p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-violet-500 h-full transition-all duration-500"
              style={{ width: `${(ratedCount / 5) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">{ratedCount} / 5 ratings submitted</div>
        </div>
      </div>
    );
  }

  const axes = [
    {
      leftLabel: 'Emotional (E)',
      rightLabel: 'Cerebral (C)',
      leftVal: axisScores.emotional,
      rightVal: axisScores.cerebral,
      icon: Brain,
    },
    {
      leftLabel: 'Action (A)',
      rightLabel: 'Atmospheric (S)',
      leftVal: axisScores.action,
      rightVal: axisScores.atmospheric,
      icon: Flame,
    },
    {
      leftLabel: 'Mainstream (M)',
      rightLabel: 'Hidden Gem (H)',
      leftVal: axisScores.mainstream,
      rightVal: axisScores.hidden,
      icon: Compass,
    },
    {
      leftLabel: 'Completionist (C)',
      rightLabel: 'Selective (S)',
      leftVal: axisScores.completionist,
      rightVal: axisScores.selective,
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-8 rounded-3xl bg-gradient-to-br from-violet-950/60 via-purple-950/30 to-black border border-violet-500/30 shadow-2xl overflow-hidden text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Persona Code: {definition.code}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {definition.name}
          </h1>

          <p className="text-sm font-semibold text-violet-300 italic">
            &ldquo;{definition.tagline}&rdquo;
          </p>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {definition.description}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {definition.traits.map((trait) => (
              <span
                key={trait}
                className="text-xs font-medium px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300"
              >
                #{trait}
              </span>
            ))}
          </div>
        </motion.div>

        {/* 4 Axis Breakdown */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Your 4 Personality Axes ({ratedCount} Ratings)
          </h3>

          <div className="space-y-5">
            {axes.map((axis) => (
              <div key={axis.leftLabel} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={axis.leftVal >= 50 ? 'text-violet-300' : 'text-slate-500'}>
                    {axis.leftLabel} ({axis.leftVal}%)
                  </span>
                  <span className={axis.rightVal > 50 ? 'text-violet-300' : 'text-slate-500'}>
                    {axis.rightLabel} ({axis.rightVal}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full transition-all duration-700"
                    style={{ width: `${axis.leftVal}%` }}
                  />
                  <div
                    className="bg-slate-800 h-full transition-all duration-700"
                    style={{ width: `${axis.rightVal}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
