import React from 'react';
import { Metadata } from 'next';
import ContactClient from './ContactClient';
import { getSeoMetadata, getBreadcrumbSchema } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return getSeoMetadata({
    title: locale === 'ja' ? 'お問い合わせ - AnimeWorld RJ' : locale === 'es' ? 'Contáctanos - AnimeWorld RJ' : 'Contact Us - Feedback & Support - AnimeWorld RJ',
    description: locale === 'ja' ? 'AnimeWorld RJチームに連絡してサポート、機能のリクエスト、バグの報告、またはパートナーシップについて問い合わせます。' : locale === 'es' ? 'Póngase en contacto con el equipo de AnimeWorld RJ para obtener asistencia, solicitar funciones, informar de fallos o realizar consultas.' : 'Get in touch with the AnimeWorld RJ team for support, feature requests, bug reports, or partnership inquiries.',
    path: '/contact',
    locale,
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;

  const breadcrumbJson = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Contact Us', path: '/contact' },
  ], locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJson).replace(/</g, '\\u003c'),
        }}
      />
      <ContactClient />
    </>
  );
}
