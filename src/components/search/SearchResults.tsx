'use client';

import React from 'react';
import { Link } from '@/navigation';
import { Star, Tv, User, Award, Tag } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  filter: string;
  results: any[];
  onSelect: (item: any) => void;
}

export default function SearchResults({ query, filter, results, onSelect }: SearchResultsProps) {
  // Highlight matching text helper
  const highlight = (text: string, q: string) => {
    if (!text || !q) return text || '';
    const regex = new RegExp(`(${q})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-accent-violet/20 text-[#7c3aed] font-extrabold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getUrl = (item: any) => {
    if (filter === 'anime' || filter === 'all') {
      return `/anime/${item.mal_id}`;
    }
    if (filter === 'character') {
      return `/search?q=${encodeURIComponent(item.name)}&type=characters`;
    }
    if (filter === 'studio') {
      return `/search?studio=${item.mal_id}`;
    }
    if (filter === 'people') {
      return `/search?q=${encodeURIComponent(item.name)}&type=people`;
    }
    return `/search?genre=${item.mal_id}`;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle pb-1">
        Search Results ({results.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {results.map((item) => {
          const title = item.title_english || item.title || item.name || item.name_kanji;
          const image = item.images?.webp?.image_url || item.images?.jpg?.image_url || item.image_url;
          const score = item.score ? item.score.toFixed(1) : null;

          return (
            <Link
              key={item.mal_id || item.id}
              href={getUrl(item) as '/'}
              onClick={() => onSelect(item)}
              className="flex items-center gap-3 p-2 rounded-2xl bg-bg-secondary/40 border border-border-subtle hover:border-[#7c3aed]/30 hover:bg-bg-elevated/40 transition-all duration-200 group"
            >
              {/* Thumbnail / Icon */}
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={title}
                  className={`object-cover bg-bg-elevated flex-shrink-0 ${
                    filter === 'character' || filter === 'people' ? 'w-10 h-10 rounded-full' : 'w-9 h-12 rounded-lg'
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-text-muted flex-shrink-0">
                  {filter === 'genre' ? <Tag size={14} /> : <Award size={14} />}
                </div>
              )}

              {/* Details */}
              <div className="min-w-0 flex-grow">
                <h5 className="text-xs font-bold text-text-primary truncate group-hover:text-accent-primary transition-colors">
                  {highlight(title, query)}
                </h5>
                <div className="flex items-center gap-2 text-[9px] text-text-secondary mt-0.5 font-medium">
                  {filter === 'anime' || filter === 'all' ? (
                    <>
                      <span>{item.type || 'TV'}</span>
                      <span>·</span>
                      <span>{item.episodes ? `${item.episodes} Ep` : 'Ongoing'}</span>
                      {score && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-accent-gold font-bold">
                            <Star size={9} fill="currentColor" /> {score}
                          </span>
                        </>
                      )}
                    </>
                  ) : filter === 'character' ? (
                    <span>Character</span>
                  ) : filter === 'studio' ? (
                    <span>Studio</span>
                  ) : filter === 'people' ? (
                    <span>Voice Actor / Staff</span>
                  ) : (
                    <span>Genre</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
