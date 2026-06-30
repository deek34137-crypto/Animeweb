'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Link } from '@/navigation';
import {
  MessageSquare,
  Send,
  EyeOff,
  ThumbsUp,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface CommentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface EpisodeComment {
  id: string;
  animeId: string;
  episode: number;
  content: string;
  spoiler: boolean;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  user: CommentUser;
}

export default function EpisodeCommentsSection({
  animeId,
  episode,
}: {
  animeId: string;
  episode: number;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<EpisodeComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top'>('newest');

  // Spoilers reveal map
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Composer state
  const [content, setContent] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/anime/${animeId}/episodes/${episode}/comments?page=${page}&sortBy=${sortBy}`
        );
        const data = await res.json();
        if (data.comments) {
          setComments(data.comments);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error('Failed to load episode comments', err);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [animeId, episode, page, sortBy]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/anime/${animeId}/episodes/${episode}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          spoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit comment');
      }

      // Add newly created comment to top of the list locally
      setComments(prev => [data.comment, ...prev]);
      setTotal(t => t + 1);
      setContent('');
      setSpoiler(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = async (commentId: string) => {
    if (!session) {
      alert('You must be logged in to like comments');
      return;
    }

    // Find the target comment
    const comment = comments.find(c => c.id === commentId);
    if (!comment || comment.deletedAt) return;

    const wasLiked = comment.isLiked;
    const previousLikesCount = comment.likesCount;

    // Optimistic UI update
    setComments(prev =>
      prev.map(c =>
        c.id === commentId
          ? {
              ...c,
              isLiked: !wasLiked,
              likesCount: wasLiked ? previousLikesCount - 1 : previousLikesCount + 1,
            }
          : c
      )
    );

    try {
      const res = await fetch(
        `/api/anime/${animeId}/episodes/${episode}/comments/${commentId}/like`,
        {
          method: 'POST',
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to like comment');
      }

      // Sync confirmed state from server
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                isLiked: data.liked,
                likesCount: data.likesCount,
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      // Revert optimistic update on failure
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                isLiked: wasLiked,
                likesCount: previousLikesCount,
              }
            : c
        )
      );
    }
  };

  const toggleRevealSpoiler = (id: string) => {
    setRevealedSpoilers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="glass-panel border border-border-default rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-border-default/45 pb-3 flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-accent-violet" />
          <h2 className="text-sm font-black text-text-primary uppercase tracking-widest font-display">
            Episode Comments ({total})
          </h2>
        </div>

        {/* Sort controls */}
        <div className="flex bg-surface-2 border border-border-subtle rounded-lg p-0.5 text-[10px] font-bold">
          {(['newest', 'oldest', 'top'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setSortBy(tab);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition capitalize ${
                sortBy === tab
                  ? 'bg-accent-violet text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Comment Composer */}
      {session ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            placeholder="Share your thoughts on this episode... Use Markdown. Keep it clean."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-surface-2 border border-border-subtle text-xs rounded-xl p-3 text-text-primary focus:outline-none focus:border-accent-violet w-full h-24 font-sans placeholder-text-muted resize-none"
            required
          />

          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-surface-2 border border-border-subtle px-3 py-1.5 rounded-lg select-none cursor-pointer">
              <input
                type="checkbox"
                id="commentSpoiler"
                checked={spoiler}
                onChange={(e) => setSpoiler(e.target.checked)}
                className="accent-accent-violet h-3.5 w-3.5 cursor-pointer"
              />
              <label htmlFor="commentSpoiler" className="text-xs text-text-primary font-bold cursor-pointer flex items-center gap-1">
                <EyeOff size={12} className="text-accent-violet" />
                <span>Spoiler comment</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-accent-violet hover:bg-accent-violet-hover disabled:opacity-50 text-white text-xs font-black px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition ml-auto"
            >
              {submitting ? <span>Sending...</span> : <><Send size={12} /><span>Post Comment</span></>}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-surface-2/30 border border-border-subtle/50 p-5 rounded-xl text-center space-y-2">
          <p className="text-xs text-text-muted">You must be logged in to participate in episode reviews.</p>
          <Link href="/login" className="inline-block bg-accent-violet text-white font-extrabold px-5 py-2 rounded-full text-xs hover:bg-accent-violet/85 transition duration-300">
            Login Now
          </Link>
        </div>
      )}

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-surface-2 rounded-xl" />
          <div className="h-16 bg-surface-2 rounded-xl" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center text-xs text-text-muted py-8">
          No comments yet. Share your experience with other fans!
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-border-subtle/40">
          {comments.map((comment, index) => {
            const isDeleted = !!comment.deletedAt;
            const isSpoiler = comment.spoiler && !revealedSpoilers[comment.id];

            return (
              <div key={comment.id} className={`pt-4 first:pt-0 ${index > 0 ? 'border-t border-border-subtle/20' : ''}`}>
                <div className="flex items-start gap-3">
                  {!isDeleted && comment.user.avatar ? (
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.username}
                      className="w-8 h-8 rounded-full border border-border-subtle object-cover mt-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center font-bold text-accent-violet uppercase mt-0.5 shrink-0 select-none">
                      {isDeleted ? 'D' : comment.user.username[0]}
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted">
                      {isDeleted ? (
                        <span className="text-text-muted font-bold">[Deleted]</span>
                      ) : (
                        <Link href={`/user/${comment.user.username}`} className="text-text-primary hover:text-accent-violet transition font-bold">
                          {comment.user.displayName || comment.user.username}
                        </Link>
                      )}
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>

                    {isDeleted ? (
                      <p className="text-xs text-text-muted italic">[Comment deleted]</p>
                    ) : isSpoiler ? (
                      <div className="bg-surface-2 border border-border-subtle p-3 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold">
                          <EyeOff size={13} className="text-accent-violet" />
                          <span>Spoiler hidden</span>
                        </div>
                        <button
                          onClick={() => toggleRevealSpoiler(comment.id)}
                          className="bg-accent-violet hover:bg-accent-violet-hover text-white text-[9px] font-black px-3 py-1.5 rounded-full transition"
                        >
                          Reveal
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs md:text-sm text-text-secondary leading-relaxed break-words relative font-normal">
                        {comment.content}
                        {comment.spoiler && (
                          <button
                            onClick={() => toggleRevealSpoiler(comment.id)}
                            className="mt-1 text-[9px] text-accent-violet hover:underline font-bold block"
                          >
                            Hide Spoiler
                          </button>
                        )}
                      </div>
                    )}

                    {!isDeleted && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => handleLikeToggle(comment.id)}
                          className={`flex items-center space-x-1.5 text-[10px] font-bold transition ${
                            comment.isLiked ? 'text-accent-violet' : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          <ThumbsUp size={11} className={comment.isLiked ? 'fill-accent-violet/20' : ''} />
                          <span>{comment.likesCount}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 text-[10px] font-bold pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border-subtle disabled:opacity-40 text-text-primary font-extrabold"
          >
            Prev
          </button>
          <span className="text-text-muted">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border-subtle disabled:opacity-40 text-text-primary font-extrabold"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
