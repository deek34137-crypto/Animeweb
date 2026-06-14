import React from 'react';
import { BookOpen, UserCheck, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            Terms of Service
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Last Updated: June 15, 2026
          </p>
        </div>
      </div>

      {/* Intro */}
      <p className="text-sm text-text-secondary leading-relaxed">
        Welcome to Aniworld. By accessing our platform, website, and sync features, you agree to comply with and be bound by the following Terms of Service. If you do not agree to these terms, please do not use the services.
      </p>

      {/* Sections Grid */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <UserCheck size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">1. Use of Services</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>To use our services, you must comply with standard guidelines:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must provide accurate information when registering an account.</li>
              <li>You are responsible for safeguarding your credentials and session.</li>
              <li>You may not use our trackers or streaming integrations to scrape, harvest, or compromise platform integrity.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <ShieldAlert size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">2. Intellectual Property</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            All original content on this website (including branding, layouts, designs, custom components, and UI stylesheets) is the intellectual property of Aniworld. We do not claim ownership over the external metadata (such as anime records provided by Jikan/MyAnimeList APIs) or third-party video feeds.
          </p>
        </section>

        {/* Section 3 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Cpu size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">3. Third-Party Links & API Content</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            Aniworld integrates with external tracking APIs (MyAnimeList, AniList) and web scraping endpoints to resolve database lists and stream feeds. We do not host, control, or endorse any content served by external websites. Your interactions with these providers are subject to their respective terms and privacy policies.
          </p>
        </section>

        {/* Section 4 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <AlertTriangle size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">4. Limitation of Liability</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            Our platform is provided "as is" and "as available". Aniworld makes no warranties regarding uninterrupted service, stream availability, or complete data consistency. We are not liable for any direct, indirect, or incidental damages resulting from your use of the platform.
          </p>
        </section>
      </div>
    </div>
  );
}
