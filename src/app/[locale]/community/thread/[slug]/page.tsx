'use client';

import React, { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { Link } from '@/navigation';
import {
  MessageSquare,
  Lock,
  EyeOff,
  CornerDownRight,
  Send,
  AlertTriangle,
  UserCheck,
  Calendar,
  Eye,
  CheckCircle,
} from 'lucide-react';

interface UserDetails {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role?: string;
}

interface ThreadDetails {
  id: string;
  slug: string;
  title: string;
  content: string;
  views: number;
  replyCount: number;
  locked: boolean;
  pinned: boolean;
  spoiler: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  user: UserDetails;
}

interface PostReply {
  id: string;
  threadId: string;
  content: string;
  spoiler: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  user: UserDetails;
}

// AST-Style safe Markdown Renderer
function parseInlineFormatting(text: string) {
  // 1. Escape HTML tags first
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Format mentions: @username -> links
  escaped = escaped.replace(
    /\B@([a-zA-Z0-9_]{3,30})\b/g,
    '<a href="/user/$1" class="text-anime-orange hover:underline font-extrabold">@$1</a>'
  );

  // 3. Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Italics: *text*
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 5. Inline Code: `code`
  escaped = escaped.replace(
    /`([^`]+)`/g,
    '<code class="bg-anime-dark px-1.5 py-0.5 rounded text-xs font-mono text-anime-orange border border-anime-border/20">$1</code>'
  );

  // 6. Links: [text](url)
  escaped = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, url) => {
      const isSafe = !/^(javascript|data|vbscript):/i.test(url);
      const targetUrl = isSafe ? url : '#';
      return `<a href="${targetUrl}" class="text-anime-orange hover:underline font-bold" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    }
  );

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // Code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const code = codeBlockLines.join('\n');
        codeBlockLines = [];
        elements.push(
          <pre key={`code-${idx}`} className="bg-anime-dark/80 border border-anime-border/40 p-4 rounded-xl overflow-x-auto font-mono text-xs text-anime-orange my-3">
            <code>{code}</code>
          </pre>
        );
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={idx} className="text-xl md:text-2xl font-black text-white mt-4 border-b border-anime-border/20 pb-1">{line.substring(2)}</h1>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="text-lg md:text-xl font-extrabold text-white mt-3">{line.substring(3)}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={idx} className="text-base font-extrabold text-white mt-2">{line.substring(4)}</h3>);
      return;
    }

    // Bullet Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <ul key={idx} className="list-disc list-inside ml-4 space-y-1 my-1">
          <li className="text-xs md:text-sm text-gray-200">{parseInlineFormatting(line.trim().substring(2))}</li>
        </ul>
      );
      return;
    }

    // Empty Lines
    if (!line.trim()) {
      elements.push(<div key={idx} className="h-2.5" />);
      return;
    }

    // Paragraph
    elements.push(<p key={idx} className="text-xs md:text-sm text-gray-200 leading-relaxed font-normal">{parseInlineFormatting(line)}</p>);
  });

  return <div className="space-y-2">{elements}</div>;
}

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const [thread, setThread] = useState<ThreadDetails | null>(null);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(true);

  // Spoilers reveal states
  const [revealThreadSpoiler, setRevealThreadSpoiler] = useState(false);
  const [revealedReplies, setRevealedReplies] = useState<Record<string, boolean>>({});

  // Composer state
  const [replyContent, setReplyContent] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load thread detail
  useEffect(() => {
    async function loadThread() {
      try {
        const res = await fetch(`/api/community/threads/${slug}`);
        const data = await res.json();
        if (data.thread) {
          setThread(data.thread);
          // Set initial spoiler reveal state if they created it
          if (session?.user?.id === data.thread.userId) {
            setRevealThreadSpoiler(true);
          }
        }
      } catch (err) {
        console.error('Failed to load thread', err);
      } finally {
        setLoading(false);
      }
    }
    loadThread();
  }, [slug, session]);

  // Load thread replies
  useEffect(() => {
    if (!thread) return;

    async function loadReplies() {
      setRepliesLoading(true);
      try {
        const res = await fetch(`/api/community/threads/${slug}/posts?page=${page}`);
        const data = await res.json();
        if (data.posts) {
          setReplies(data.posts);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error('Failed to load replies', err);
      } finally {
        setRepliesLoading(false);
      }
    }
    loadReplies();
  }, [slug, thread, page]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread) return;

    setError(null);
    setSubmitting(true);

    if (!replyContent.trim()) {
      setError('Reply content cannot be empty');
      setSubmitting(false);
      return;
    }

    // Hybrid Optimistic UI approach: Add a temporary pending reply
    const tempId = `temp-${Date.now()}`;
    const pendingReply: PostReply = {
      id: tempId,
      threadId: thread.id,
      content: replyContent,
      spoiler: replySpoiler,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      user: {
        id: session?.user?.id || '',
        username: session?.user?.username || 'me',
        displayName: session?.user?.name || 'Me',
        avatar: session?.user?.image || null,
      },
    };

    // Optimistically push to local replies state
    setReplies(prev => [...prev, pendingReply]);

    try {
      const res = await fetch(`/api/community/threads/${slug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent,
          spoiler: replySpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit reply');
      }

      // Replace the pending optimistic reply with the real confirmed reply
      setReplies(prev =>
        prev.map(r => (r.id === tempId ? { ...data.post, user: pendingReply.user } : r))
      );

      // Reset composer
      setReplyContent('');
      setReplySpoiler(false);
      
      // Update thread counters locally
      setThread(prev => prev ? { ...prev, replyCount: prev.replyCount + 1 } : null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      // Rollback optimistic update on error
      setReplies(prev => prev.filter(r => r.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplySpoiler = (id: string) => {
    setRevealedReplies(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="space-y-6 py-12 animate-pulse">
        <div className="h-8 bg-anime-card rounded w-2/3" />
        <div className="h-4 bg-anime-card rounded w-1/4" />
        <div className="h-32 bg-anime-card rounded" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle size={48} className="text-anime-orange mx-auto" />
        <h2 className="text-xl font-black text-white">Thread Not Found</h2>
        <p className="text-sm text-anime-muted">This thread does not exist or has been removed.</p>
        <Link href="/community" className="inline-block bg-anime-orange text-black font-extrabold px-5 py-2.5 rounded-full text-xs">
          Return to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs font-bold text-anime-muted">
        <Link href="/community" className="hover:text-anime-orange transition">
          Forum
        </Link>
        <CornerDownRight size={12} />
        <span className="hover:text-anime-orange transition uppercase text-[10px]">
          {thread.category.name}
        </span>
      </div>

      {/* Main Thread Card */}
      <div className="bg-anime-card border border-anime-border/40 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-anime-orange/5 blur-[70px] rounded-full pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-anime-dark border border-anime-border text-[9px] font-black text-anime-orange uppercase px-2 py-0.5 rounded tracking-wide">
              {thread.category.name}
            </span>
            {thread.pinned && (
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                PINNED
              </span>
            )}
            {thread.locked && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Lock size={8} /> LOCKED
              </span>
            )}
            {thread.spoiler && (
              <span className="bg-anime-orange/10 border border-anime-orange/20 text-anime-orange text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <EyeOff size={8} /> SPOILER THREAD
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-3xl font-black text-white leading-tight">
            {thread.title}
          </h1>

          <div className="flex items-center justify-between border-b border-anime-border/20 pb-4 text-xs font-semibold text-anime-muted flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              {thread.user.avatar ? (
                <img
                  src={thread.user.avatar}
                  alt={thread.user.username}
                  className="w-8 h-8 rounded-full border border-anime-border/60 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-anime-dark border border-anime-border/60 flex items-center justify-center font-bold text-anime-orange uppercase">
                  {thread.user.username[0]}
                </div>
              )}
              <div>
                <Link href={`/user/${thread.user.username}`} className="text-white hover:text-anime-orange transition font-bold">
                  {thread.user.displayName || thread.user.username}
                </Link>
                <div className="text-[10px] text-anime-muted flex items-center space-x-1.5 mt-0.5">
                  <Calendar size={10} />
                  <span>Posted on {new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Eye size={12} className="text-anime-orange" />
                <span>{thread.views} Views</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare size={12} className="text-anime-orange" />
                <span>{thread.replyCount} Replies</span>
              </div>
            </div>
          </div>

          {/* Thread Body Content */}
          {thread.spoiler && !revealThreadSpoiler ? (
            <div className="bg-anime-dark/80 border border-anime-border/40 p-8 rounded-xl text-center space-y-3">
              <EyeOff size={24} className="text-anime-orange mx-auto" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Spoiler Warning</h4>
              <p className="text-[11px] text-anime-muted max-w-sm mx-auto">
                This thread has been flagged as containing spoilers. Click reveal to read the description.
              </p>
              <button
                onClick={() => setRevealThreadSpoiler(true)}
                className="bg-anime-orange hover:bg-anime-orangeHover text-black text-[10px] font-black px-4 py-2 rounded-full transition"
              >
                Reveal Content
              </button>
            </div>
          ) : (
            <div className="pt-2 relative">
              <MarkdownRenderer content={thread.content} />
              {thread.spoiler && (
                <button
                  onClick={() => setRevealThreadSpoiler(false)}
                  className="mt-4 text-[10px] text-anime-orange hover:underline font-bold block"
                >
                  Hide Spoiler
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies Title */}
      <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-anime-border/20 pb-2 mt-8">
        Replies ({thread.replyCount})
      </h3>

      {/* Replies list */}
      {repliesLoading && replies.length === 0 ? (
        <div className="space-y-4">
          <div className="h-16 bg-anime-card rounded animate-pulse" />
          <div className="h-16 bg-anime-card rounded animate-pulse" />
        </div>
      ) : replies.length === 0 ? (
        <div className="bg-anime-card/25 border border-anime-border/20 p-8 rounded-xl text-center text-xs text-anime-muted">
          No replies yet. Be the first to start the discussion!
        </div>
      ) : (
        <div className="space-y-4">
          {replies.map((reply) => {
            const isPending = reply.id.startsWith('temp-');
            const isDeleted = !!reply.deletedAt;
            const isSpoiler = reply.spoiler && !revealedReplies[reply.id];

            return (
              <div
                key={reply.id}
                className={`bg-anime-card/70 border border-anime-border/40 rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
                  isPending ? 'opacity-60 border-anime-orange/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* User Profile Avatar */}
                  {!isDeleted && reply.user.avatar ? (
                    <img
                      src={reply.user.avatar}
                      alt={reply.user.username}
                      className="w-8 h-8 rounded-full border border-anime-border/60 object-cover mt-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-anime-dark border border-anime-border/60 flex items-center justify-center font-bold text-anime-orange uppercase mt-0.5 shrink-0 select-none">
                      {isDeleted ? 'D' : reply.user.username[0]}
                    </div>
                  )}

                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-semibold text-anime-muted">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {isDeleted ? (
                          <span className="text-anime-muted font-bold">[Deleted]</span>
                        ) : (
                          <Link href={`/user/${reply.user.username}`} className="text-white hover:text-anime-orange transition font-bold">
                            {reply.user.displayName || reply.user.username}
                          </Link>
                        )}
                        {reply.user.role === 'ADMIN' && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black px-1 rounded">
                            ADMIN
                          </span>
                        )}
                        {reply.user.role === 'MODERATOR' && (
                          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black px-1 rounded">
                            MOD
                          </span>
                        )}
                        {isPending && (
                          <span className="text-anime-orange animate-pulse text-[8px] font-black">
                            SENDING...
                          </span>
                        )}
                      </div>
                      <div>{new Date(reply.createdAt).toLocaleString()}</div>
                    </div>

                    {/* Reply content body */}
                    {isDeleted ? (
                      <p className="text-xs text-anime-muted italic">[This post has been deleted by its author or moderator]</p>
                    ) : isSpoiler ? (
                      <div className="bg-anime-dark/60 border border-anime-border/30 p-4 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-anime-muted font-bold">
                          <EyeOff size={14} className="text-anime-orange shrink-0" />
                          <span>Spoiler content hidden</span>
                        </div>
                        <button
                          onClick={() => toggleReplySpoiler(reply.id)}
                          className="bg-anime-orange hover:bg-anime-orangeHover text-black text-[9px] font-black px-3 py-1.5 rounded-full transition"
                        >
                          Reveal
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <MarkdownRenderer content={reply.content} />
                        {reply.spoiler && (
                          <button
                            onClick={() => toggleReplySpoiler(reply.id)}
                            className="mt-2 text-[9px] text-anime-orange hover:underline font-bold block"
                          >
                            Hide Spoiler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 text-xs font-bold pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-2 rounded-lg bg-anime-card border border-anime-border/40 disabled:opacity-40 text-white"
          >
            Prev
          </button>
          <span className="text-anime-muted">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-2 rounded-lg bg-anime-card border border-anime-border/40 disabled:opacity-40 text-white"
          >
            Next
          </button>
        </div>
      )}

      {/* Reply Composer */}
      {session ? (
        thread.locked ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-3">
            <Lock size={16} className="shrink-0" />
            <span className="font-bold">This discussion thread is locked. No new replies can be added.</span>
          </div>
        ) : (
          <form onSubmit={handlePostReply} className="bg-anime-card border border-anime-border/40 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <CornerDownRight size={14} className="text-anime-orange" />
                <span>Add Reply</span>
              </h4>
              <span className="text-[8px] font-bold text-anime-muted uppercase bg-anime-dark px-2 py-0.5 rounded border border-anime-border/20">
                Supports markdown
              </span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <textarea
              placeholder="Join the discussion... Mention users with @username."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="bg-anime-dark border border-anime-border text-xs rounded-lg p-3 text-gray-200 focus:outline-none focus:border-anime-orange w-full h-28 font-sans"
              required
            />

            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-anime-dark/60 border border-anime-border/30 px-3 py-2 rounded-lg">
                <input
                  type="checkbox"
                  id="replySpoiler"
                  checked={replySpoiler}
                  onChange={(e) => setReplySpoiler(e.target.checked)}
                  className="accent-anime-orange h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="replySpoiler" className="text-xs text-gray-200 font-bold select-none cursor-pointer flex items-center gap-1">
                  <EyeOff size={12} className="text-anime-orange" />
                  <span>Mark as spoiler</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-anime-orange hover:bg-anime-orangeHover disabled:opacity-50 text-black text-xs font-black px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition duration-300 ml-auto"
              >
                {submitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )
      ) : (
        <div className="bg-anime-card/50 border border-anime-border/30 p-5 rounded-xl text-center space-y-2">
          <p className="text-xs text-anime-muted">You must be logged in to participate in the discussion.</p>
          <Link href="/login" className="inline-block bg-anime-orange text-black font-extrabold px-5 py-2 rounded-full text-xs hover:bg-anime-orangeHover transition duration-300">
            Login Now
          </Link>
        </div>
      )}
    </div>
  );
}
