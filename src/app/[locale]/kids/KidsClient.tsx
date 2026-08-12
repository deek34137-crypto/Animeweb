'use client';

import React, { useState } from 'react';

import { motion } from 'framer-motion';
import { Sparkles, Play, Globe, Shield, Tv, Search, Volume2 } from 'lucide-react';
import { Link } from '@/navigation';

import { proxyUrl } from '@/lib/image';

interface KidsShow {
  id: string; // MAL ID or slug
  title: string;
  hindiTitle?: string;
  image: string;
  category: 'Cartoons' | 'Anime' | 'Hindi Dubbed';
  episodesCount: number;
  rating: string;
  description: string;
  languages: string[];
}

const KIDS_CATALOG: KidsShow[] = [
  {
    id: '527',
    title: 'Pokémon',
    hindiTitle: 'पोकेमॉन',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx527-kF2FwJkF3h1g.png',
    category: 'Cartoons',
    episodesCount: 276,
    rating: 'G - All Ages',
    description: 'Follow Ash Ketchum and his loyal companion Pikachu on their legendary journey to become Pokémon Masters!',
    languages: ['Hindi', 'English', 'Japanese'],
  },
  {
    id: '2471',
    title: 'Doraemon',
    hindiTitle: 'डोरेमोन',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx2471-X3oF0X3X3X3X.jpg',
    category: 'Cartoons',
    episodesCount: 1787,
    rating: 'G - All Ages',
    description: 'A robotic cat from the 22nd century travels back in time to help Nobita Nobi with magical futuristic gadgets.',
    languages: ['Hindi', 'English', 'Japanese'],
  },
  {
    id: '2986',
    title: 'Crayon Shin-chan',
    hindiTitle: 'शिनचैन',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx2986-W117215.jpg',
    category: 'Cartoons',
    episodesCount: 1000,
    rating: 'PG - Children',
    description: 'The hilarious daily antics of 5-year-old Shinnosuke "Shin-chan" Nohara and his family.',
    languages: ['Hindi', 'English', 'Japanese'],
  },
  {
    id: '223',
    title: 'Dragon Ball',
    hindiTitle: 'ड्रैगन बॉल',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx223-24833.jpg',
    category: 'Anime',
    episodesCount: 153,
    rating: 'PG - Children',
    description: 'Goku and Bulma search the world for seven magical Dragon Balls that grant any wish.',
    languages: ['Hindi', 'English', 'Japanese'],
  },
  {
    id: '20',
    title: 'Naruto',
    hindiTitle: 'नारुतो',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-7383.jpg',
    category: 'Hindi Dubbed',
    episodesCount: 220,
    rating: 'PG-13',
    description: 'A young ninja who seeks recognition from his peers and dreams of becoming the Hokage.',
    languages: ['Hindi', 'English', 'Japanese'],
  },
  {
    id: '235',
    title: 'Detective Conan',
    hindiTitle: 'डिटेक्टिव कॉनन',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx235-117349.jpg',
    category: 'Hindi Dubbed',
    episodesCount: 1000,
    rating: 'PG-13',
    description: 'High school detective Shinichi Kudo is transformed into a child and solves mysteries undercover as Conan Edogawa.',
    languages: ['Hindi', 'English'],
  },
  {
    id: '249',
    title: 'Inazuma Eleven',
    hindiTitle: 'इनाज़ुमा इलेवन',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx249-21808.jpg',
    category: 'Cartoons',
    episodesCount: 127,
    rating: 'G - All Ages',
    description: 'Endou Mamoru recruits talented soccer players to save the Raimon school soccer club.',
    languages: ['Hindi', 'English'],
  },
  {
    id: '936',
    title: 'Beyblade',
    hindiTitle: 'बेब्लेड',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx936-75218.jpg',
    category: 'Cartoons',
    episodesCount: 51,
    rating: 'G - All Ages',
    description: 'Tyson Granger and the Bladebreakers compete in high-stakes Beyblade spinning top battles worldwide.',
    languages: ['Hindi', 'English'],
  },
];

export default function KidsClient() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Set kids_mode cookie so Edge middleware can block /hentai/* routes
  React.useEffect(() => {
    document.cookie = 'kids_mode=true; path=/; SameSite=Lax; max-age=86400';
    localStorage.setItem('kids_mode', 'true');
    return () => {
      // Clear when unmounting (user leaves Kids Zone)
      document.cookie = 'kids_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('kids_mode');
    };
  }, []);



  const categories = ['All', 'Cartoons', 'Hindi Dubbed', 'Anime'];

  const filteredShows = KIDS_CATALOG.filter((show) => {
    const matchesCategory = selectedCategory === 'All' || show.category === selectedCategory;
    const matchesSearch =
      show.title.toLowerCase().includes(search.toLowerCase()) ||
      (show.hindiTitle && show.hindiTitle.includes(search));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0f0f13] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-900/40 via-pink-900/30 to-purple-950/50 border border-violet-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-pink-400" />
              ToonWorld & AnimoTV Powered
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Kids & Cartoons <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Zone</span> 🎈
            </h1>

            <p className="text-slate-300 text-base leading-relaxed">
              Safe, fun, and magical cartoons & anime dubbed in <strong className="text-violet-300">Hindi</strong> and <strong className="text-pink-300">English</strong>! Stream Doraemon, Shinchan, Pokémon and more anytime.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-semibold">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Safe for Kids
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-semibold">
                <Globe className="w-3.5 h-3.5 text-blue-400" /> Multi-Audio (Hindi/English)
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-semibold">
                <Tv className="w-3.5 h-3.5 text-pink-400" /> HD Quality
              </span>
            </div>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Doraemon, Shinchan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 focus:outline-none text-xs text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredShows.map((show, idx) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-violet-500/50 transition-all duration-300 shadow-lg flex flex-col"
            >
              {/* Poster */}
              <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                <img
                  src={proxyUrl(show.image)}
                  alt={show.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-transparent to-transparent opacity-80" />

                {/* Rating Badge */}
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-extrabold text-pink-400 border border-pink-500/30">
                  {show.rating}
                </span>

                {/* Audio Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1">
                  {show.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded bg-violet-600/80 backdrop-blur-md text-[9px] font-bold text-white uppercase"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                {/* Hover Play Button */}
                <Link
                  href={`/watch/${show.id}/1`}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </Link>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-violet-400 transition-colors line-clamp-1">
                      {show.title}
                    </h3>
                  </div>
                  {show.hindiTitle && (
                    <p className="text-xs text-pink-400 font-semibold">{show.hindiTitle}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{show.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400 font-medium">
                  <span>{show.episodesCount} Episodes</span>
                  <Link
                    href={`/watch/${show.id}/1`}
                    className="text-violet-400 font-bold hover:underline"
                  >
                    Watch Now →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
