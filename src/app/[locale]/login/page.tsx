'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from '@/navigation';
import { Link } from '@/navigation';
import { Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 rounded-2xl glass-panel shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-accent-violet/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-accent-sakura/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center">
          <h2 className="text-3xl font-black text-text-primary tracking-tight font-display">
            Welcome <span className="text-accent-violet">Back</span>
          </h2>
          <p className="mt-2 text-xs text-text-muted">
            Log in to manage your anime lists, track watch history, and sync progress.
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition text-sm text-text-primary"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition text-sm text-text-primary"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-accent-violet hover:bg-[#6b4ae6] text-white font-extrabold text-sm py-3 rounded-xl transition duration-300 shadow-lg shadow-accent-violet/15 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-border-subtle text-xs text-text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent-sakura hover:underline font-semibold">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
