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
import { DonneesStructurees } from '@/components/DonneesStructurees';
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
          {/* Lien d'évitement : invisible jusqu'au premier Tab, il permet de
              sauter la navigation. Au-dessus de tout (le header est à z-60,
              le bandeau cookies à z-70). */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-marine focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-creme"
          >
            {locale === 'en' ? 'Skip to content' : 'Aller au contenu'}
          </a>
          <DonneesStructurees />
          <RevealScroll />
          <HeaderScroll />
          <Header locale={locale} />
          <div id="contenu">{children}</div>
          <Footer locale={locale} />
          <ConsentementCookies locale={locale} />
        </NextIntlClientProvider>
        {process.env.NEXT_PUBLIC_SITE_MODE === 'preview' && <VisualEditingDev />}
      </body>
    </html>
  );
}
