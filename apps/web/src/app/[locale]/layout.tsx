import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Space_Grotesk, Space_Mono } from 'next/font/google';
import { VisualEditingDev } from '@/components/VisualEditingDev';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RevealScroll } from '@/components/RevealScroll';
import { HeaderScroll } from '@/components/HeaderScroll';
import { previewDynamique } from '@/sanity/preview-dynamic';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
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
        className={`${spaceGrotesk.variable} ${spaceMono.variable} bg-ivoire font-sans text-marine antialiased`}
      >
        <NextIntlClientProvider>
          <RevealScroll />
          <HeaderScroll />
          <Header locale={locale} />
          {children}
          <Footer locale={locale} />
        </NextIntlClientProvider>
        {process.env.NEXT_PUBLIC_SITE_MODE === 'preview' && <VisualEditingDev />}
      </body>
    </html>
  );
}
