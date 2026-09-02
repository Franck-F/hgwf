import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { metadonneesPage } from '@/seo/metadonnees';

export { generateStaticParams } from '@/i18n/staticParams';

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const fr = l !== 'en';
  return {
    ...metadonneesPage({
      locale: l,
      chemin: '/services',
      titre: fr ? 'Nos services · HGWF Cargo' : 'Our services · HGWF Cargo',
      description: fr
        ? 'Groupage, conteneur complet, véhicules, déménagement Outre-mer, fret aérien et stockage : tous les services de transport HGWF Cargo.'
        : 'Groupage, full containers, vehicles, overseas removals, air freight and storage: all HGWF Cargo transport services.',
    }),
    // Page provisoire (liste vide) : à retirer quand la liste sera publiée.
    robots: { index: false, follow: true },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-[1200px] px-8 pt-32 pb-16">
      <h1>Services</h1>
      <p>La liste des services sera disponible prochainement.</p>
    </main>
  );
}
