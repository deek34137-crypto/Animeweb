import React from 'react';
import { Metadata } from 'next';
import { FileText, CheckCircle, AlertOctagon, ExternalLink, ShieldAlert, Ban, UserX, ShieldCheck } from 'lucide-react';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? '利用規約 - AnimeWorld RJ' : locale === 'es' ? 'Términos de Servicio - AnimeWorld RJ' : 'Terms of Service - AnimeWorld RJ',
    description: 'Read the terms of service and acceptable use guidelines governing your use of AnimeWorld RJ.',
    path: '/terms',
    locale,
  });
}

export default async function TermsOfServicePage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Terms of Service', path: '/terms' },
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
          <FileText size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            Terms of Service
          </h1>
          <p className="text-xs text-text-muted mt-1">Last Updated: August 12, 2026</p>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        By accessing or using Aniworld, you agree to be bound by these Terms of Service. If you do not agree to all terms, please discontinue your use of our website immediately.
      </p>

      <div className="space-y-6">

        {/* 1. Use of Services */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <CheckCircle size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">1. Use of Services</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>Aniworld provides an anime tracking, discovery, and link aggregation platform for personal, non-commercial use only:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must create an account to access sync features, watch history, and restricted content sections.</li>
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>You agree not to use the service for any unlawful purpose or in violation of local laws.</li>
            </ul>
          </div>
        </section>

        {/* 2. Intellectual Property */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <ShieldCheck size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">2. Intellectual Property</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>All Aniworld interface designs, logos, custom CSS tokens, and application code are property of Aniworld:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Anime metadata, poster art, character information, and titles belong to their respective copyright holders (Jikan / MyAnimeList / AniList).</li>
              <li>You may not scrape, clone, or redistribute platform assets without prior consent.</li>
            </ul>
          </div>
        </section>

        {/* 3. Third-Party Links & API Content */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <ExternalLink size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">3. Third-Party Links &amp; API Content</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>Aniworld aggregates metadata and provides links to external websites and APIs:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Aniworld does not host, upload, or stream video content directly on its servers.</li>
              <li>All video streams redirect to external third-party servers over which we exert no control.</li>
              <li>We are not responsible for the availability, content, privacy practices, or accuracy of third-party platforms.</li>
            </ul>
          </div>
        </section>


        {/* 5. Acceptable Use Policy */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Ban size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">5. Acceptable Use Policy</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>You agree NOT to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Automated scraping, crawling, or bot access of platform routes or APIs.</li>
              <li>Account sharing, selling, or creating duplicate automated accounts.</li>
              <li>Posting illegal, defamatory, harassing, or hate speech content in community areas.</li>
              <li>Circumventing age verification, authentication, or parental control systems (Kids Mode).</li>
            </ul>
          </div>
        </section>

        {/* 6. Account Termination */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <UserX size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">6. Account Termination</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>We reserve the right to suspend or terminate user accounts at our sole discretion, without prior notice, for conduct that violates these Terms:</p>
            <ul className="list-disc pl-5 space-y-1.5">

              <li>Termination for repeat copyright infringement or abusive behavior.</li>
              <li>Account deletion requests or appeals can be submitted to: <strong>animeworldrj@gmail.com</strong></li>
            </ul>
          </div>
        </section>

        {/* 7. Limitation of Liability */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <AlertOctagon size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">7. Limitation of Liability</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            Aniworld is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind. Under no circumstances shall Aniworld or its operators be liable for direct, indirect, incidental, or consequential damages resulting from your use or inability to use the service or external third-party links.
          </p>
        </section>

      </div>
    </div>
  );
}