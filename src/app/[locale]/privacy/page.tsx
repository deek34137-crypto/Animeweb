import React from 'react';
import { Metadata } from 'next';
import { Shield, Lock, Eye, Server, RefreshCw, ShieldAlert, Globe, Trash2, Scale, Baby } from 'lucide-react';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'プライバシーポリシー - AnimeWorld RJ' : locale === 'es' ? 'Política de Privacidad - AnimeWorld RJ' : 'Privacy Policy - AnimeWorld RJ',
    description: 'Learn how AnimeWorld RJ collects, stores, and safeguards your personal data, synchronization logs, and streaming preferences.',
    path: '/privacy',
    locale,
  });
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Privacy Policy', path: '/privacy' },
  ], locale);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            Privacy Policy
          </h1>
          <p className="text-xs text-text-muted mt-1">Last Updated: August 12, 2026</p>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        At Aniworld, we take your privacy seriously. This Privacy Policy details how we collect, use, and safeguard your personal information when you use our website, services, and tracker synchronization systems.
      </p>

      <div className="space-y-6">

        {/* 1. Information We Collect */}
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

        {/* 2. How We Use Your Data */}
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

        {/* 3. Cookies & Local Storage */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Server size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">3. Cookies & Local Storage</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-3 pl-7">
            <p>We use cookies and browser local storage organized into the following GDPR categories:</p>
            <div className="space-y-2">
              {[
                { label: 'Necessary (always active)', items: ['Session authentication tokens', 'Theme preference (dark/light)', 'Language setting', 'Kids mode flag'] },
                { label: 'Preferences (opt-in)', items: ['Video playback speed', 'Autoplay settings', 'Subtitle language preference', 'Volume level'] },
                { label: 'Analytics (opt-in)', items: ['Anonymous Vercel Analytics events for page performance (no personal data)'] },
                { label: 'Marketing (opt-in)', items: ['Reserved for future use — currently none collected'] },
              ].map((cat) => (
                <div key={cat.label} className="rounded-xl border border-border-subtle bg-bg-elevated/30 p-3">
                  <p className="font-semibold text-text-primary text-[11px] mb-1.5">{cat.label}</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {cat.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-text-muted">The <code className="bg-bg-elevated px-1 rounded text-[10px]">hentai_age_verified</code> localStorage key is stored on your device only for adult section access and is never transmitted to our servers. You can manage all cookies via the &quot;Cookie Settings&quot; link in the footer.</p>
          </div>
        </section>

        {/* 4. Adult Content & Age Verification */}
        <section className="glass-panel border border-red-500/20 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">4. Adult Content & Age Verification</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>Aniworld provides links to third-party adult content sites in a dedicated 18+ section. Regarding this section:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Access requires: (1) being logged in with a verified account, and (2) completing the age verification click-through.</li>
              <li>Age verification is stored in <code className="bg-bg-elevated px-1 rounded text-[10px]">localStorage</code> on your device only — it is never transmitted to our servers.</li>
              <li>We do not verify age against any external database; it is self-declared by the user.</li>
              <li>If you are under 18, you must not access the hentai section.</li>
              <li>Parents: enable Kids Mode from the sidebar to prevent access to adult content.</li>
            </ul>
          </div>
        </section>

        {/* 5. Third-Party Services & APIs */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Globe size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">5. Third-Party Services & APIs</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Jikan / MyAnimeList:</strong> Anime metadata (no personal data sent).</li>
              <li><strong>AniList:</strong> OAuth login and watch list synchronization.</li>
              <li><strong>HStream.moe:</strong> Public API used for hentai trending metadata (no user data sent).</li>
              <li><strong>Vercel Analytics:</strong> Anonymous, aggregated performance data with no personally identifiable information.</li>
              <li><strong>Web Push (VAPID):</strong> Opt-in push notifications. Subscription data stored on your device and our server.</li>
            </ul>
          </div>
        </section>

        {/* 6. Data Retention & Deletion */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Trash2 size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">6. Data Retention & Deletion</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Account data is retained for as long as your account is active.</li>
              <li>Watch history is retained indefinitely unless manually cleared from your account settings.</li>
              <li>Age verification data exists only in your browser localStorage and is cleared when you clear browser data.</li>
              <li>To request complete account deletion, email: <strong>animeworldrj@gmail.com</strong></li>
            </ul>
          </div>
        </section>

        {/* 7. Your Rights */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Scale size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">7. Your Rights (GDPR / CCPA)</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Right to <strong>access</strong> the personal data we hold about you.</li>
              <li>Right to <strong>correct</strong> inaccurate data (via profile settings).</li>
              <li>Right to <strong>delete</strong> your data (account deletion request).</li>
              <li>Right to <strong>withdraw consent</strong> for non-essential cookies at any time via Cookie Settings in the footer.</li>
              <li>GDPR rights for EU users and CCPA rights for California users are acknowledged and respected.</li>
              <li>Contact for privacy requests: <strong>animeworldrj@gmail.com</strong></li>
            </ul>
          </div>
        </section>

        {/* 8. Children's Privacy */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Baby size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">8. Children&apos;s Privacy (COPPA)</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Aniworld&apos;s services are not directed at children under 13.</li>
              <li>We do not knowingly collect personal information from users under 13.</li>
              <li>The Kids Zone section is available but does not collect any additional personal data beyond what is already in your account.</li>
              <li>If you believe a child has provided personal information on our platform, contact us immediately at animeworldrj@gmail.com.</li>
            </ul>
          </div>
        </section>

        {/* 9. Changes to This Policy */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <RefreshCw size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">9. Changes to This Policy</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            We may update our Privacy Policy periodically. Any amendments will be reflected by updating the &quot;Last Updated&quot; timestamp at the top of this document. Continued use of the platform constitutes agreement to the updated terms.
          </p>
        </section>

      </div>
    </div>
  );
}