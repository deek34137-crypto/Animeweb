'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, UserCheck, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  targetUsername: string;
  initialIsFollowing: boolean;
  initialFollowersCount: number;
  initialFollowingCount: number;
  requestorId: string | null | undefined;
  profileUserId: string;
  accentColor?: string;
}

export default function FollowButton({
  targetUsername,
  initialIsFollowing,
  initialFollowersCount,
  initialFollowingCount,
  requestorId,
  profileUserId,
  accentColor = '#7c3aed',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [loading, setLoading] = useState(false);

  // Sync state if initial props change
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowersCount(initialFollowersCount);
    setFollowingCount(initialFollowingCount);
  }, [initialIsFollowing, initialFollowersCount, initialFollowingCount]);

  const isMe = requestorId && requestorId === profileUserId;

  const handleFollowToggle = async () => {
    if (!requestorId) {
      alert('You must be logged in to follow users');
      return;
    }

    if (loading) return;

    const previousIsFollowing = isFollowing;
    const previousFollowersCount = followersCount;

    // Optimistic UI updates
    setIsFollowing(!previousIsFollowing);
    setFollowersCount(previousIsFollowing ? previousFollowersCount - 1 : previousFollowersCount + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/user/${targetUsername}/follow`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle follow status');
      }

      // Sync with confirmed server counts
      setIsFollowing(data.isFollowing);
      setFollowersCount(data.followersCount);
      setFollowingCount(data.followingCount);
    } catch (err) {
      console.error(err);
      // Revert optimistic updates on failure
      setIsFollowing(previousIsFollowing);
      setFollowersCount(previousFollowersCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center md:items-start gap-4">
      {/* Counters display */}
      <div className="flex items-center justify-center md:justify-start gap-x-4 text-xs font-semibold text-text-secondary select-none">
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-white">{followersCount}</span>
          <span className="text-text-muted">Followers</span>
        </div>
        <div className="border-l border-border-subtle h-3" />
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-white">{followingCount}</span>
          <span className="text-text-muted">Following</span>
        </div>
      </div>

      {/* Action Button */}
      {!isMe && requestorId && (
        <button
          onClick={handleFollowToggle}
          style={{
            backgroundColor: isFollowing ? 'transparent' : accentColor,
            borderColor: isFollowing ? 'rgba(255,255,255,0.15)' : accentColor,
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all duration-300 shadow-md ${
            isFollowing
              ? 'text-white bg-white/5 hover:bg-white/10 hover:border-white/30'
              : 'text-black hover:opacity-90'
          }`}
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin text-inherit" />
          ) : isFollowing ? (
            <>
              <UserCheck size={13} />
              <span>Following</span>
            </>
          ) : (
            <>
              <UserPlus size={13} />
              <span>Follow</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
