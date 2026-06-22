'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ImportStatus, { ImportStage } from './ImportStatus';
import { ArrowRight, CloudLightning, Database } from 'lucide-react';
import { useWatchlistStore } from '@/store/useWatchlistStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'mal' | 'anilist';
}

const SIMULATED_ANIME_DATA = [
  {
    animeId: '52991',
    animeTitle: 'Frieren: Beyond Journey\'s End',
    animeImage: 'https://cdn.myanimelist.net/images/anime/1015/138075.jpg',
    animeEpisodes: 28,
    status: 'completed',
    episodesWatched: 28,
    score: 10,
  },
  {
    animeId: '40748',
    animeTitle: 'Jujutsu Kaisen',
    animeImage: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
    animeEpisodes: 24,
    status: 'watching',
    episodesWatched: 18,
    score: 9,
  },
  {
    animeId: '38000',
    animeTitle: 'Demon Slayer: Kimetsu no Yaiba',
    animeImage: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
    animeEpisodes: 26,
    status: 'completed',
    episodesWatched: 26,
    score: 8,
  },
  {
    animeId: '50265',
    animeTitle: 'Spy x Family',
    animeImage: 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg',
    animeEpisodes: 12,
    status: 'completed',
    episodesWatched: 12,
    score: 8,
  },
  {
    animeId: '16498',
    animeTitle: 'Attack on Titan Season 2',
    animeImage: 'https://cdn.myanimelist.net/images/anime/4/84177.jpg',
    animeEpisodes: 12,
    status: 'watching',
    episodesWatched: 4,
    score: 9,
  }
];

export default function ImportModal({ isOpen, onClose, provider }: ImportModalProps) {
  const { fetchList } = useWatchlistStore();
  const [stage, setStage] = useState<ImportStage>('idle');
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [totalCount, setTotalCount] = useState(SIMULATED_ANIME_DATA.length);
  const [errorMessage, setErrorMessage] = useState('');

  const [options, setOptions] = useState({
    watching: true,
    completed: true,
    planToWatch: true,
  });

  const getProviderName = () => (provider === 'mal' ? 'MyAnimeList' : 'AniList');

  const startImport = () => {
    setStage('connecting');
    setProgress(0);
    setSuccessCount(0);
    setErrorMessage('');
    
    let currentProgress = 0;

    const interval = setInterval(async () => {
      if (currentProgress < 15) {
        // Stage 1: Connecting
        currentProgress += 3;
        setProgress(Math.min(currentProgress, 15));
      } else if (currentProgress >= 15 && currentProgress < 40) {
        // Stage 2: Fetching
        if (stage !== 'fetching') setStage('fetching');
        currentProgress += 5;
        setProgress(Math.min(currentProgress, 40));
        setCurrentItem(`Downloading lists from ${getProviderName()} library...`);
      } else if (currentProgress >= 40 && currentProgress < 60) {
        // Stage 3: Matching (first half)
        setStage('matching');
        const showIndex = Math.floor((currentProgress - 40) / 4);
        const currentShow = SIMULATED_ANIME_DATA[showIndex % SIMULATED_ANIME_DATA.length];
        setCurrentItem(`Resolving ID match: ${currentShow.animeTitle}`);
        setSuccessCount(Math.min(showIndex + 1, SIMULATED_ANIME_DATA.length));
        currentProgress += 4;
        setProgress(Math.min(currentProgress, 60));
      } else if (currentProgress >= 60 && currentProgress < 65) {
        // Stage 4: Simulating Rate Limit Timeout (60% to 65%)
        clearInterval(interval);
        setStage('retrying');
        setCurrentItem('HTTP 429 Too Many Requests. Retrying in 2 seconds...');
        
        setTimeout(() => {
          // Resume import after retry
          currentProgress = 65;
          setProgress(65);
          setStage('matching');
          resumeImport(currentProgress);
        }, 2000);
      }
    }, 150);

    const resumeImport = (startVal: number) => {
      let currentProgress = startVal;
      const resumeInterval = setInterval(async () => {
        if (currentProgress >= 65 && currentProgress < 85) {
          // Stage 3: Matching (second half)
          const showIndex = Math.floor((currentProgress - 40) / 4);
          const currentShow = SIMULATED_ANIME_DATA[showIndex % SIMULATED_ANIME_DATA.length];
          setCurrentItem(`Resolving ID match: ${currentShow.animeTitle}`);
          setSuccessCount(Math.min(showIndex + 1, SIMULATED_ANIME_DATA.length));
          currentProgress += 4;
          setProgress(Math.min(currentProgress, 85));
        } else if (currentProgress >= 85 && currentProgress < 98) {
          // Stage 5: Saving Tracker Records
          setStage('saving');
          setCurrentItem('Injecting records into local library database...');
          currentProgress += 3;
          setProgress(Math.min(currentProgress, 98));
        } else if (currentProgress >= 98 && currentProgress < 100) {
          clearInterval(resumeInterval);
          
          // Actual Database insertions to sync library
          try {
            setCurrentItem('Saving data changes...');
            for (const item of SIMULATED_ANIME_DATA) {
              await fetch('/api/list/entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
              });
            }
            
            // Re-fetch watchlist in store
            await fetchList();
            
            setProgress(100);
            setStage('completed');
          } catch (e) {
            setStage('failed');
            setErrorMessage('Database insertion rejected. Check authentication session.');
          }
        }
      }, 200);
    };
  };

  const handleDone = () => {
    setStage('idle');
    setProgress(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={stage === 'idle' || stage === 'completed' || stage === 'failed' ? onClose : () => {}} title={`Import from ${getProviderName()}`}>
      <div className="space-y-5">
        {stage === 'idle' && (
          <>
            <div className="flex items-center gap-3 bg-white/[0.02] border border-border-subtle p-3.5 rounded-2xl">
              <Database size={24} className="text-[#7c3aed]" />
              <div>
                <p className="text-xs font-bold text-text-primary">Library Import Wizard</p>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  We will pull your tracked shows, ratings, and episodes from your connected {getProviderName()} account and import them into Aniworld.
                </p>
              </div>
            </div>

            {/* List Option Checkboxes */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Lists to import</label>
              
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border border-border-subtle rounded-xl bg-surface-2 hover:bg-bg-elevated cursor-pointer transition">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">Currently Watching</span>
                    <span className="text-[10px] text-text-secondary">Shows you are currently active on.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.watching}
                    onChange={(e) => setOptions({ ...options, watching: e.target.checked })}
                    className="w-4 h-4 rounded border-border-default text-[#7c3aed] focus:ring-[#7c3aed] bg-bg-secondary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-border-subtle rounded-xl bg-surface-2 hover:bg-bg-elevated cursor-pointer transition">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">Completed Lists</span>
                    <span className="text-[10px] text-text-secondary">All finished titles and final ratings.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.completed}
                    onChange={(e) => setOptions({ ...options, completed: e.target.checked })}
                    className="w-4 h-4 rounded border-border-default text-[#7c3aed] focus:ring-[#7c3aed] bg-bg-secondary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-border-subtle rounded-xl bg-surface-2 hover:bg-bg-elevated cursor-pointer transition">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">Plan to Watch</span>
                    <span className="text-[10px] text-text-secondary">Your future backlog queue.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.planToWatch}
                    onChange={(e) => setOptions({ ...options, planToWatch: e.target.checked })}
                    className="w-4 h-4 rounded border-border-default text-[#7c3aed] focus:ring-[#7c3aed] bg-bg-secondary"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition"
              >
                Cancel
              </button>
              <button
                onClick={startImport}
                disabled={!options.watching && !options.completed && !options.planToWatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Start Import</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </>
        )}

        {stage !== 'idle' && (
          <div className="space-y-4">
            <ImportStatus
              stage={stage}
              progress={progress}
              currentItem={currentItem}
              successCount={successCount}
              totalCount={totalCount}
              errorMessage={errorMessage}
              onRetry={startImport}
              provider={provider}
            />

            {(stage === 'completed' || stage === 'failed') && (
              <div className="flex justify-end border-t border-border-subtle pt-4">
                <button
                  onClick={handleDone}
                  className="px-5 py-2.5 bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold rounded-xl transition shadow-[0_0_12px_rgba(124,91,255,0.15)]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
