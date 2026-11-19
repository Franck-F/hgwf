import type { Metadata } from 'next';
import { locales, type Locale } from '@hgwf/shared';

export const SITE_URL = 'https://hgwf-cargo.fr';

// Métadonnées communes à toutes les pages : canonical, hreflang et Open Graph.
// `chemin` est le chemin sans préfixe de locale ni slash final ('' pour
// l'accueil, '/faq', '/services/groupage'…) — `trailingSlash: true` impose le
// slash final dans les URL publiées.
export function metadonneesPage({
  locale,
  chemin,
  titre,
  description,
  seulementCetteLangue = false,
  image,
  type = 'website',
}: {
  locale: Locale;
  chemin: string;
  titre: string;
  description: string;
  /** Page qui n'existe que dans `locale` (article de blog) : pas d'hreflang vers une traduction absente. */
  seulementCetteLangue?: boolean;
  image?: { url: string; alt: string } | null;
  type?: 'website' | 'article';
}): Metadata {
  const url = (l: string) => `${SITE_URL}/${l}${chemin}/`;

  return {
    metadataBase: new URL(SITE_URL),
    title: titre,
    description,
    alternates: seulementCetteLangue
      ? { canonical: url(locale) }
      : {
          canonical: url(locale),
          languages: {
            ...Object.fromEntries(locales.map((l) => [l, url(l)])),
            'x-default': url('fr'),
          },
        },
    openGraph: {
      type,
      siteName: 'HGWF Cargo',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      url: url(locale),
      title: titre,
      description,
      images: [image ?? { url: `${SITE_URL}/photos/conteneurs.jpg`, alt: 'HGWF Cargo' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titre,
      description,
    },
  };
}
