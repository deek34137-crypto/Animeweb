'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldAlert, AlertTriangle, Check, X, Lock, Unlock, Eye, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reporter: {
    username: string;
    displayName: string | null;
  };
}

interface FlaggedItem {
  id: string;
  targetType: string;
  targetId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  claimedBy: string | null;
  claimedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  reports: Report[];
  reportsCount: number;
  claimant: {
    username: string;
    displayName: string | null;
  } | null;
  resolver: {
    username: string;
    displayName: string | null;
  } | null;
}

export default function AdminModeration() {
  const { data: session } = useSession();
  const [flags, setFlags] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Resolution modal state
  const [resolvingFlag, setResolvingFlag] = useState<FlaggedItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionSeverity, setResolutionSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');

  // Details expander state
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/flags');
      if (!res.ok) throw new Error('Failed to load moderation queue');
      const data = await res.json();
      setFlags(data.flags);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleClaim = async (flagId: string) => {
    setProcessingId(flagId);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, action: 'CLAIM' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to claim flag');
      } else {
        fetchFlags();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRelease = async (flagId: string) => {
    setProcessingId(flagId);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, action: 'RELEASE' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to release claim');
      } else {
        fetchFlags();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (flagId: string) => {
    setProcessingId(flagId);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, action: 'DISMISS', resolutionNote: 'Dismissed by moderator' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to dismiss flag');
      } else {
        fetchFlags();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolvingFlag) return;
    setProcessingId(resolvingFlag.id);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId: resolvingFlag.id,
          action: 'RESOLVE',
          resolutionNote,
          severity: resolutionSeverity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to resolve flag');
      } else {
        fetchFlags();
        setResolvingFlag(null);
        setResolutionNote('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'IN_REVIEW':
        return 'bg-blue-600/15 text-blue-400 border border-blue-500/20';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'DISMISSED':
        return 'bg-white/5 text-text-secondary border border-white/10';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  const isClaimStale = (claimedAtStr: string | null) => {
    if (!claimedAtStr) return false;
    const claimedAt = new Date(claimedAtStr);
    const now = new Date();
    return now.getTime() - claimedAt.getTime() > 30 * 60 * 1000; // 30 minutes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Moderation Queue</h2>
        <button
          onClick={fetchFlags}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition animate-none"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      </div>

      {loading && flags.length === 0 ? (
        <div className="p-12 text-center text-text-secondary animate-pulse">Loading moderation queue...</div>
      ) : error ? (
        <div className="p-12 text-center text-red-400 border border-red-500/10 rounded-2xl bg-red-500/5">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" />
          <p>{error}</p>
        </div>
      ) : flags.length === 0 ? (
        <div className="p-12 text-center text-text-secondary bg-white/[0.01] border border-white/5 rounded-2xl">
          No reports found. The queue is clean!
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => {
            const isExpanded = expandedFlagId === flag.id;
            const currentUserId = session?.user?.id;
            const isClaimedByMe = flag.status === 'IN_REVIEW' && flag.claimedBy === currentUserId;
            const isStale = isClaimStale(flag.claimedAt);
            const isProcessing = processingId === flag.id;

            return (
              <div
                key={flag.id}
                className={`bg-white/[0.02] border rounded-2xl transition-all duration-300 ${
                  isClaimedByMe ? 'border-purple-500/35 bg-purple-500/[0.01]' : 'border-white/5'
                }`}
              >
                {/* Flag Header Info */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">
                        {flag.targetType}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getSeverityStyle(flag.severity)}`}>
                        {flag.severity}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusStyle(flag.status)}`}>
                        {flag.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary font-medium">Target ID:</span>
                      <code className="text-xs text-purple-400 bg-purple-500/5 px-1.5 py-0.5 rounded">{flag.targetId}</code>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Reported {flag.reportsCount} {flag.reportsCount === 1 ? 'time' : 'times'} • Created {new Date(flag.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions Grid */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Expand Details Button */}
                    <button
                      onClick={() => setExpandedFlagId(isExpanded ? null : flag.id)}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-text-secondary hover:text-text-primary transition"
                      title="View Report Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Claim/Release/Resolve actions */}
                    {flag.status === 'PENDING' && (
                      <button
                        onClick={() => handleClaim(flag.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Claim Report
                      </button>
                    )}

                    {flag.status === 'IN_REVIEW' && (
                      <>
                        {isClaimedByMe ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setResolvingFlag(flag)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Resolve
                            </button>
                            <button
                              onClick={() => handleDismiss(flag.id)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleRelease(flag.id)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Release
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary italic">
                              Claimed by {flag.claimant?.displayName || flag.claimant?.username || 'Moderator'}
                            </span>
                            {(isStale || currentUserId === flag.claimedBy) && (
                              <button
                                onClick={() => handleClaim(flag.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition"
                                title="Claim was made more than 30 minutes ago. You can re-claim it."
                              >
                                Reclaim Stale
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {(flag.status === 'RESOLVED' || flag.status === 'DISMISSED') && (
                      <span className="text-xs text-text-secondary italic">
                        {flag.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'} by {flag.resolver?.displayName || flag.resolver?.username || 'Moderator'}
                        {flag.resolvedAt && ` on ${new Date(flag.resolvedAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsible Details & Reports */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-white/[0.01] rounded-b-2xl space-y-4">
                    {flag.resolutionNote && (
                      <div className="p-3.5 bg-purple-500/5 border border-purple-500/15 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-purple-400">Resolution Note:</span>
                        <p className="text-text-secondary">{flag.resolutionNote}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Detailed User Reports ({flag.reports.length})
                      </h4>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {flag.reports.map((report) => (
                          <div key={report.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-text-primary">
                                {report.reporter.displayName || report.reporter.username}
                              </span>
                              <span className="text-[10px] text-text-secondary">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-medium">
                                {report.reason}
                              </span>
                            </div>
                            {report.details && (
                              <p className="text-xs text-text-secondary mt-1 bg-black/20 p-2 rounded border border-white/5 italic">
                                "{report.details}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Input Overlay Modal */}
      {resolvingFlag && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-6 h-6" />
              <h3 className="text-lg font-bold text-text-primary">Resolve Flag</h3>
            </div>
            
            <p className="text-sm text-text-secondary">
              Reviewing target type <span className="font-semibold text-text-primary">{resolvingFlag.targetType}</span>. Resolving this will delete the content or apply a suspension to the author.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Adjust Flag Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setResolutionSeverity(sev)}
                      className={`py-2 text-xs font-bold border rounded-xl transition ${
                        resolutionSeverity === sev
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                          : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Resolution Note</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Enter details of the action taken (e.g. Spam links removed, user warned)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-emerald-500 h-24 resize-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setResolvingFlag(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={!resolutionNote.trim() || processingId === resolvingFlag.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
