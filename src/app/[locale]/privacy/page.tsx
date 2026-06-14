import React from 'react';
import { Shield, Lock, Eye, Server, RefreshCw } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            Privacy Policy
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Last Updated: June 15, 2026
          </p>
        </div>
      </div>

      {/* Intro */}
      <p className="text-sm text-text-secondary leading-relaxed">
        At Aniworld, we take your privacy seriously. This Privacy Policy details how we collect, use, and safeguard your personal information when you use our website, services, and tracker synchronization systems.
      </p>

      {/* Sections Grid */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Lock size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">1. Information We Collect</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>We collect information you provide directly to us when creating an account, updating your profile, or logging in via third-party trackers (MyAnimeList or AniList):</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Credentials:</strong> Username, email address, display name, and hashed passwords.</li>
              <li><strong>Profile Information:</strong> Custom avatars, banners, and biography metadata.</li>
              <li><strong>Streaming & Sync Logs:</strong> Access tokens for external tracker APIs to synchronize watch progress.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Eye size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">2. How We Use Your Data</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>Your information is used solely to enhance your custom streaming and tracking experience:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To store local watch progress and maintain your streaming history.</li>
              <li>To automate list completions and synchronize watch progress to your connected tracker accounts.</li>
              <li>To customize your interface (themes, avatar image rendering, custom fonts).</li>
              <li>To secure and maintain your user session.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Server size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">3. Cookies & Local Storage</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            We use secure cookies and browser local storage to persist your login sessions, video playback speed preferences, autoplay settings, and preferred audio languages. You can manage cookies directly through your web browser preferences.
          </p>
        </section>

        {/* Section 4 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <RefreshCw size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">4. Changes to This Policy</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            We may update our Privacy Policy periodically. Any amendments will be reflected by updating the "Last Updated" timestamp at the top of this document. Continued use of the platform constitutes agreement to the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
