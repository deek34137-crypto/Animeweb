'use client';

import React, { useState, useEffect } from 'react';
import { Search, Ban, Check, UserMinus, UserCheck, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  suspendedUntil: string | null;
  suspensionReason: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Suspension Modal State
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        role: roleFilter,
        page: page.toString(),
        limit: '15',
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit) || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update role');
      } else {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingUser) return;
    setUpdatingUserId(suspendingUser.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: suspendingUser.id,
          suspendDays,
          suspensionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to suspend user');
      } else {
        fetchUsers();
        setSuspendingUser(null);
        setSuspensionReason('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, unsuspend: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to unsuspend user');
      } else {
        fetchUsers();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getStatus = (user: User) => {
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return {
        suspended: true,
        label: `Suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}`,
        reason: user.suspensionReason,
      };
    }
    return { suspended: false, label: 'Active' };
  };

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by username, email, display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-purple-500 transition-colors cursor-pointer w-full md:w-48 animate-none"
          >
            <option value="" className="bg-bg-primary">All Roles</option>
            <option value="USER" className="bg-bg-primary">Users</option>
            <option value="MODERATOR" className="bg-bg-primary">Moderators</option>
            <option value="ADMIN" className="bg-bg-primary">Admins</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-text-secondary animate-pulse">Loading user directory...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">No users matched your query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs font-bold text-text-secondary uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const status = getStatus(user);
                  const isPendingUpdate = updatingUserId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              user.username[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{user.displayName || user.username}</p>
                            <p className="text-xs text-text-secondary">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Allocation */}
                      <td className="p-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={isPendingUpdate}
                          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-purple-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="USER" className="bg-bg-primary">User</option>
                          <option value="MODERATOR" className="bg-bg-primary">Moderator</option>
                          <option value="ADMIN" className="bg-bg-primary">Admin</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {status.suspended ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                              <Ban className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                            {status.reason && (
                              <span className="text-[11px] text-text-secondary italic max-w-xs truncate">
                                Reason: {status.reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="p-4 text-xs text-text-secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        {status.suspended ? (
                          <button
                            onClick={() => handleUnsuspend(user.id)}
                            disabled={isPendingUpdate}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendingUser(user)}
                            disabled={isPendingUpdate}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex justify-between items-center p-4 border-t border-white/5 bg-white/[0.01]">
          <span className="text-xs text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(page - 1, 1))}
              disabled={page === 1 || loading}
              className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(page + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Suspension Overlay Dialog */}
      {suspendingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-text-primary">Suspend User</h3>
            </div>
            
            <p className="text-sm text-text-secondary">
              Configure temporary suspension for <span className="font-semibold text-text-primary">{suspendingUser.displayName || suspendingUser.username}</span>. This will revoke current session tokens immediately.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Suspension Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 7, 30, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSuspendDays(days)}
                      className={`py-2 text-xs font-bold border rounded-xl transition ${
                        suspendDays === days
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      {days} {days === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Reason for Suspension</label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Enter reason (e.g. spam, harassment, terms violation)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-red-500 h-24 resize-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSuspendingUser(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={!suspensionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
