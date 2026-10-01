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
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

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

export default function CommunityClient() {
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

      setNewTitle('');
      setNewContent('');
      setNewSpoiler(false);
      setIsModalOpen(false);

      setSortBy('newest');
      setSelectedCategory(null);
      
      const threadRes = await fetch(`/api/community/threads?sortBy=newest`);
      const threadData = await threadRes.json();
      if (threadData.threads) {
        setThreads(threadData.threads);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Forum Banner Header */}
      <div className="bg-surface-2 rounded-2xl p-6 md:p-10 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[350px] h-[250px] bg-accent-violet/5 blur-[90px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-1.5 bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-xs font-bold px-3 py-1 rounded-full">
            <Users size={12} />
            <span>COMMUNITY FORUM</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight font-display">
            Discuss Anime With <span className="text-accent-violet">Fans Globally</span>
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Welcome to the Aniworld discussion hub! Join thousands of Otakus in seasonal reviews, character theories, recommendations, and creative fan work.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {session ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-accent-violet hover:bg-[#6b4ae6] text-white text-xs font-bold px-5 py-3 rounded-full flex items-center space-x-1.5 shadow-lg hover:shadow-accent-violet/15 transition-all duration-200 hover:-translate-y-px active:scale-[0.98]"
              >
                <Plus size={14} />
                <span>Create New Thread</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="bg-surface-2 hover:bg-surface-3 text-text-primary border border-border-subtle text-xs font-bold px-5 py-3 rounded-full flex items-center space-x-1.5 transition-all duration-200 hover:-translate-y-px active:scale-[0.98]"
              >
                <span>Login to Post</span>
              </Link>
            )}
            <div className="relative max-w-xs w-full">
              <Input
                type="text"
                placeholder="Search forum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full py-2.5 pl-4 pr-10 text-xs"
              />
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Forum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Categories Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-xs font-bold text-text-primary tracking-wider uppercase border-b border-border-subtle pb-2">
            Categories
          </h3>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 border w-full text-left whitespace-nowrap lg:whitespace-normal shrink-0 ${
                selectedCategory === null
                  ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet'
                  : 'bg-surface-2/50 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
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
                    ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet'
                    : 'bg-surface-2/50 border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary'
                }`}
              >
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <CategoryIcon name={cat.icon} />
                  <span>{cat.name}</span>
                </div>
                <span className="hidden lg:block text-[10px] text-text-muted mt-1 font-normal leading-normal">
                  {cat.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Threads Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center border-b border-border-subtle pb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-accent-violet" />
              <span className="text-sm font-bold text-text-primary tracking-tight uppercase font-display">Discussions</span>
            </div>
            
            {/* Sort Tabs */}
            <div className="flex bg-surface-2 border border-border-subtle rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => setSortBy('trending')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  sortBy === 'trending'
                    ? 'bg-accent-violet text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Flame size={12} />
                <span>Trending</span>
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  sortBy === 'newest'
                    ? 'bg-accent-violet text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
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
            <EmptyState
              icon={MessageSquare}
              title="No discussions found"
              description="No threads match your filter criteria. Be the first to start a conversation in this category!"
              size="md"
            />
          ) : (
            <div className="space-y-3">
              {threads.map((t) => (
                <Link
                  key={t.id}
                  href={`/community/thread/${t.slug}`}
                  className="block bg-surface-2 border border-border-subtle rounded-2xl p-5 hover:border-accent-violet/30 hover:bg-surface-3/30 transition-all duration-200 hover:-translate-y-px active:scale-[0.99] group shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-surface-3 border border-border-subtle text-[9px] font-bold text-accent-violet uppercase px-2 py-0.5 rounded-lg tracking-wide">
                          {t.category.name}
                        </span>
                        {t.pinned && (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded-lg">
                            PINNED
                          </span>
                        )}
                        {t.locked && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                            <Lock size={8} /> LOCKED
                          </span>
                        )}
                        {t.spoiler && (
                          <span className="bg-accent-sakura/10 border border-accent-sakura/20 text-accent-sakura text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                            <EyeOff size={8} /> SPOILER
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-violet transition-colors truncate max-w-full leading-snug">
                        {t.title}
                      </h4>
                      <div className="text-[10px] text-text-muted flex items-center space-x-2">
                        <span>By {t.user.displayName || t.user.username}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-auto">
                      <div className="text-center">
                        <div className="text-xs font-bold text-text-secondary">{t.views}</div>
                        <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Views</div>
                      </div>
                      <div className="border-l border-border-subtle h-8 hidden md:block" />
                      <div className="flex items-center space-x-2 text-xs font-semibold bg-surface-3 rounded-full py-2 px-4 border border-border-subtle">
                        <MessageSquare size={13} className="text-accent-violet" />
                        <span className="text-text-secondary">{t.replyCount} Replies</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition duration-300 animate-[backdropIn_0.2s_ease-out]">
          <div className="glass-panel border border-border-default rounded-3xl w-full max-w-2xl p-6 relative space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-[modalIn_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-text-primary uppercase tracking-tight flex items-center gap-2 font-display">
                <Plus size={20} className="text-accent-violet" />
                <span>Create New Thread</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-all text-xs font-bold border border-border-subtle px-3 py-1.5 rounded-xl hover:bg-surface-3"
              >
                Close
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full bg-surface-3 border border-border-subtle focus:border-accent-violet focus:ring-accent-violet/30 focus:outline-none focus:ring-2 rounded-xl p-3 text-xs text-text-primary cursor-pointer transition-all duration-200"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Thread Title</label>
                <Input
                  type="text"
                  placeholder="Summarize your discussion topic..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="p-3"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Content (Markdown)</label>
                  <span className="text-[8px] font-bold text-text-muted uppercase bg-surface-3 px-2 py-0.5 rounded border border-border-subtle">
                    Canonical Markdown only. HTML is blocked.
                  </span>
                </div>
                <Textarea
                  placeholder="Write your topic description here. Supports markdown syntax..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="p-3 h-40"
                  required
                />
              </div>

              <div className="flex items-center gap-2 bg-surface-3/50 border border-border-subtle p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="modalSpoiler"
                  checked={newSpoiler}
                  onChange={(e) => setNewSpoiler(e.target.checked)}
                  className="accent-accent-violet h-4 w-4 cursor-pointer"
                />
                <label htmlFor="modalSpoiler" className="text-xs text-text-secondary font-bold select-none cursor-pointer flex items-center gap-1.5">
                  <EyeOff size={14} className="text-accent-violet" />
                  <span>Mark entire thread as spoiler</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={posting}
                className="bg-accent-violet hover:bg-[#6b4ae6] disabled:opacity-50 text-white text-xs font-bold p-3 rounded-xl w-full flex justify-center items-center gap-2 transition-all duration-200 hover:-translate-y-px active:scale-[0.98] cursor-pointer"
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
