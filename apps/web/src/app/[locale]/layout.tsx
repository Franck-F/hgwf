import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Saira_Condensed, Barlow } from 'next/font/google';
import { VisualEditingDev } from '@/components/VisualEditingDev';
import { ConsentementCookies } from '@/components/consentement/ConsentementCookies';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RevealScroll } from '@/components/RevealScroll';
import { HeaderScroll } from '@/components/HeaderScroll';
import { previewDynamique } from '@/sanity/preview-dynamic';

// Charte : Saira Condensed (titrage) + Barlow (texte courant).
const saira = Saira_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-saira',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Préversion SSR : rend toutes les pages dynamiques (brouillons en direct).
  await previewDynamique();

  return (
    <html lang={locale}>
      <body
        className={`${saira.variable} ${barlow.variable} bg-ivoire font-sans text-marine antialiased`}
      >
        <NextIntlClientProvider>
          <RevealScroll />
          <HeaderScroll />
          <Header locale={locale} />
          {children}
          <Footer locale={locale} />
          <ConsentementCookies locale={locale} />
        </NextIntlClientProvider>
        {process.env.NEXT_PUBLIC_SITE_MODE === 'preview' && <VisualEditingDev />}
      </body>
    </html>
  );
}
