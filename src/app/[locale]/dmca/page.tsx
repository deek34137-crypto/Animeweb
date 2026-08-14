import React from 'react';
import { Metadata } from 'next';
import { Copyright, FileX, FileCheck, Ban, ShieldAlert } from 'lucide-react';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: 'DMCA & Copyright Policy - AnimeWorld RJ',
    description: 'AnimeWorld RJ does not host content. Submit DMCA takedown requests or counter-notices here.',
    path: '/dmca',
    locale,
  });
}

export default async function DmcaPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'DMCA & Copyright', path: '/dmca' },
  ], locale);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Copyright size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display">
            DMCA &amp; Copyright Policy
          </h1>
          <p className="text-xs text-text-muted mt-1">Last Updated: August 12, 2026</p>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        AnimeWorld RJ is an anime tracker, community platform, and link aggregator. We do not upload, host, store, or serve any video content. All streaming links redirect to independent third-party websites.
      </p>

      <div className="space-y-6">

        {/* Section 1 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <Copyright size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">1. Our Position on Copyright</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Aniworld is an anime tracker and link directory — we do not upload or host any video, audio, or image content.</li>
              <li>All streaming links on this platform redirect to external third-party websites over which we have no control.</li>
              <li>We respect intellectual property rights and respond promptly to valid copyright complaints.</li>
              <li>We comply with the Digital Millennium Copyright Act (DMCA) and applicable international copyright laws.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <FileX size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">2. DMCA Takedown Request</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>If you are a copyright holder and believe that a link on Aniworld infringes your rights, please send a written notice to:</p>
            <p className="font-mono text-text-primary bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs">
              animeworldrj@gmail.com
            </p>
            <p>Your notice must include:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your name, address, telephone number, and email address.</li>
              <li>Identification of the copyrighted work you claim has been infringed.</li>
              <li>The specific URL on Aniworld that contains the allegedly infringing link.</li>
              <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner.</li>
              <li>A statement that the information is accurate, under penalty of perjury, and that you are authorized to act on behalf of the copyright owner.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
            <p className="text-text-muted">We will respond to valid notices within 48 hours and remove the infringing link from our platform.</p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-orange-400">
            <FileCheck size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">3. Counter-Notice Procedure</h2>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2 pl-7">
            <p>If you believe your content was removed in error, you may file a counter-notice. Send to:</p>
            <p className="font-mono text-text-primary bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs">
              animeworldrj@gmail.com
            </p>
            <p>Your counter-notice must include:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your name, address, telephone number, and email.</li>
              <li>Identification of the material that was removed and where it appeared.</li>
              <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="glass-panel border border-border-default rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <Ban size={18} />
            <h2 className="text-base font-bold text-text-primary font-display">4. Repeat Infringers</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed pl-7">
            Users who repeatedly post links to infringing content will have their accounts permanently terminated. Aniworld reserves the right to take legal action against parties who knowingly submit false DMCA notices.
          </p>
        </section>



      </div>
    </div>
  );
}