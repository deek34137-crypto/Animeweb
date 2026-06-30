'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Link } from '@/navigation';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Search,
  Plus,
  Tv,
  BookOpen,
  Compass,
  HelpCircle,
  Palette,
  Megaphone,
  AlertTriangle,
  Lock,
  EyeOff,
  Flame,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

interface Thread {
  id: string;
  slug: string;
  title: string;
  views: number;
  replyCount: number;
  lastReplyAt: string | null;
  locked: boolean;
  pinned: boolean;
  spoiler: boolean;
  createdAt: string;
  user: {
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  category: {
    name: string;
    slug: string;
  };
}

// Maps icon name strings to Lucide components
function CategoryIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  switch (name) {
    case 'Megaphone':
      return <Megaphone size={size} className={className} />;
    case 'Tv':
      return <Tv size={size} className={className} />;
    case 'BookOpen':
      return <BookOpen size={size} className={className} />;
    case 'Compass':
      return <Compass size={size} className={className} />;
    case 'HelpCircle':
      return <HelpCircle size={size} className={className} />;
    case 'Palette':
      return <Palette size={size} className={className} />;
    default:
      return <MessageSquare size={size} className={className} />;
  }
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trending' | 'newest'>('trending');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newSpoiler, setNewSpoiler] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories and initial threads
  useEffect(() => {
    async function initData() {
      try {
        const catRes = await fetch('/api/community/categories');
        const catData = await catRes.json();
        if (catData.categories) {
          setCategories(catData.categories);
          if (catData.categories.length > 0) {
            setNewCategoryId(catData.categories[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    initData();
  }, []);

  // Fetch threads when filters update
  useEffect(() => {
    async function loadThreads() {
      setLoading(true);
      try {
        let url = `/api/community/threads?sortBy=${sortBy}`;
        if (selectedCategory) {
          url += `&categoryId=${selectedCategory}`;
        }
        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (data.threads) {
          setThreads(data.threads);
        }
      } catch (err) {
        console.error('Failed to load threads', err);
      } finally {
        setLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => {
      loadThreads();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [selectedCategory, searchQuery, sortBy]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPosting(true);

    if (newTitle.trim().length < 5) {
      setError('Title must be at least 5 characters long');
      setPosting(false);
      return;
    }
    if (!newContent.trim()) {
      setError('Thread content cannot be empty');
      setPosting(false);
      return;
    }

    try {
      const res = await fetch('/api/community/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          categoryId: newCategoryId,
          spoiler: newSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create thread');
      }

      // Reset form and close modal
      setNewTitle('');
      setNewContent('');
      setNewSpoiler(false);
      setIsModalOpen(false);

      // Reload threads
      setSortBy('newest'); // Show new post
      setSelectedCategory(null);
      
      // Fetch threads manually to update instantly
      const threadRes = await fetch(`/api/community/threads?sortBy=newest`);
      const threadData = await threadRes.json();
      if (threadData.threads) {
        setThreads(threadData.threads);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Forum Banner Header */}
      <div className="bg-anime-card rounded-2xl p-6 md:p-10 border border-anime-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[350px] h-[250px] bg-anime-orange/5 blur-[90px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-1.5 bg-anime-orange/10 border border-anime-orange/20 text-anime-orange text-xs font-bold px-3 py-1 rounded-full">
            <Users size={12} />
            <span>COMMUNITY FORUM</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Discuss Anime With <span className="text-anime-orange">Fans Globally</span>
          </h1>
          <p className="text-sm text-anime-muted max-w-2xl leading-relaxed">
            Welcome to the Aniworld discussion hub! Join thousands of Otakus in seasonal reviews, character theories, recommendations, and creative fan work.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {session ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-anime-orange hover:bg-anime-orangeHover text-black text-xs font-extrabold px-5 py-3 rounded-full flex items-center space-x-1.5 shadow-lg hover:shadow-orange-500/10 transition duration-300"
              >
                <Plus size={14} />
                <span>Create New Thread</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="bg-anime-card hover:bg-anime-border/20 text-white border border-anime-border text-xs font-extrabold px-5 py-3 rounded-full flex items-center space-x-1.5 transition duration-300"
              >
                <span>Login to Post</span>
              </Link>
            )}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search forum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-anime-dark border border-anime-border/60 text-xs rounded-full py-3 pl-4 pr-10 focus:outline-none focus:border-anime-orange text-gray-200 w-full placeholder-gray-500"
              />
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Forum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Categories Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-anime-border/20 pb-2">
            Categories
          </h3>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 border w-full text-left whitespace-nowrap lg:whitespace-normal shrink-0 ${
                selectedCategory === null
                  ? 'bg-anime-orange/10 border-anime-orange/30 text-anime-orange'
                  : 'bg-anime-card/50 border-anime-border/20 text-anime-muted hover:border-anime-border/60 hover:text-white'
              }`}
            >
              <MessageSquare size={16} />
              <span>All Discussions</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col px-4 py-3 rounded-xl border text-left transition-all duration-300 whitespace-nowrap lg:whitespace-normal shrink-0 w-full ${
                  selectedCategory === cat.id
                    ? 'bg-anime-orange/10 border-anime-orange/30 text-anime-orange'
                    : 'bg-anime-card/50 border-anime-border/20 text-anime-muted hover:border-anime-border/60 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <CategoryIcon name={cat.icon} />
                  <span>{cat.name}</span>
                </div>
                <span className="hidden lg:block text-[10px] text-anime-muted mt-1 font-normal leading-normal">
                  {cat.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Threads Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center border-b border-anime-border/40 pb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-anime-orange" />
              <span className="text-sm font-black text-white tracking-tight uppercase">Discussions</span>
            </div>
            
            {/* Sort Tabs */}
            <div className="flex bg-anime-card/80 border border-anime-border/30 rounded-lg p-0.5 text-xs font-bold">
              <button
                onClick={() => setSortBy('trending')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition ${
                  sortBy === 'trending'
                    ? 'bg-anime-orange text-black'
                    : 'text-anime-muted hover:text-white'
                }`}
              >
                <Flame size={12} />
                <span>Trending</span>
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition ${
                  sortBy === 'newest'
                    ? 'bg-anime-orange text-black'
                    : 'text-anime-muted hover:text-white'
                }`}
              >
                <Clock size={12} />
                <span>Newest</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-anime-card/40 border border-anime-border/20 rounded-xl p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-anime-card/30 border border-anime-border/20 rounded-xl p-10 text-center space-y-3">
              <MessageSquare size={36} className="text-gray-600 mx-auto" />
              <h4 className="text-sm font-extrabold text-white">No discussions found</h4>
              <p className="text-xs text-anime-muted max-w-sm mx-auto">
                No threads match your filter criteria. Be the first to start a conversation in this category!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((t) => (
                <Link
                  key={t.id}
                  href={`/community/thread/${t.slug}`}
                  className="block bg-anime-card border border-anime-border/40 rounded-xl p-5 hover:border-anime-orange/30 transition duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-anime-dark border border-anime-border text-[9px] font-black text-anime-orange uppercase px-2 py-0.5 rounded tracking-wide">
                          {t.category.name}
                        </span>
                        {t.pinned && (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                            PINNED
                          </span>
                        )}
                        {t.locked && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Lock size={8} /> LOCKED
                          </span>
                        )}
                        {t.spoiler && (
                          <span className="bg-anime-orange/10 border border-anime-orange/20 text-anime-orange text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <EyeOff size={8} /> SPOILER
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-anime-orange transition-colors truncate max-w-full leading-snug">
                        {t.title}
                      </h4>
                      <div className="text-[10px] text-anime-muted flex items-center space-x-2">
                        <span>By {t.user.displayName || t.user.username}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-auto">
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-200">{t.views}</div>
                        <div className="text-[9px] text-anime-muted uppercase font-bold tracking-wider">Views</div>
                      </div>
                      <div className="border-l border-anime-border/20 h-8 hidden md:block" />
                      <div className="flex items-center space-x-2 text-xs font-semibold bg-anime-dark/60 rounded-full py-2 px-4 border border-anime-border/40">
                        <MessageSquare size={13} className="text-anime-orange" />
                        <span className="text-gray-200">{t.replyCount} Replies</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition duration-300">
          <div className="bg-anime-card border border-anime-border/60 rounded-2xl w-full max-w-2xl p-6 relative space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-anime-border/20 pb-3">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Plus size={20} className="text-anime-orange" />
                <span>Create New Thread</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-anime-muted hover:text-white transition text-xs font-extrabold bg-anime-dark border border-anime-border/40 px-3 py-1.5 rounded-full"
              >
                Close
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-anime-muted">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="bg-anime-dark border border-anime-border text-xs rounded-lg p-3 text-gray-200 focus:outline-none focus:border-anime-orange w-full cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-anime-muted">Thread Title</label>
                <input
                  type="text"
                  placeholder="Summarize your discussion topic..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-anime-dark border border-anime-border text-xs rounded-lg p-3 text-gray-200 focus:outline-none focus:border-anime-orange w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-anime-muted">Content (Markdown)</label>
                  <span className="text-[8px] font-bold text-anime-muted uppercase bg-anime-dark px-2 py-0.5 rounded border border-anime-border/20">
                    Canonical Markdown only. HTML is blocked.
                  </span>
                </div>
                <textarea
                  placeholder="Write your topic description here. Supports markdown syntax..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="bg-anime-dark border border-anime-border text-xs rounded-lg p-3 text-gray-200 focus:outline-none focus:border-anime-orange w-full h-40 font-sans"
                  required
                />
              </div>

              <div className="flex items-center gap-2 bg-anime-dark/50 border border-anime-border/30 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="modalSpoiler"
                  checked={newSpoiler}
                  onChange={(e) => setNewSpoiler(e.target.checked)}
                  className="accent-anime-orange h-4 w-4 cursor-pointer"
                />
                <label htmlFor="modalSpoiler" className="text-xs text-gray-200 font-bold select-none cursor-pointer flex items-center gap-1.5">
                  <EyeOff size={14} className="text-anime-orange" />
                  <span>Mark entire thread as spoiler</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={posting}
                className="bg-anime-orange hover:bg-anime-orangeHover disabled:opacity-50 text-black text-xs font-black p-3 rounded-lg w-full flex justify-center items-center gap-2 transition duration-300"
              >
                {posting ? (
                  <span>Creating Thread...</span>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Create Thread</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
