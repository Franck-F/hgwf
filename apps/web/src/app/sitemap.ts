import type { MetadataRoute } from 'next';
import { locales } from '@hgwf/shared';
import { getServiceSlugs } from '@/sanity/queries';
import { SITE_URL } from '@/seo/metadonnees';

export const dynamic = 'force-static';

// La liste /services est volontairement absente : page provisoire en noindex
// tant que la liste des services n'est pas publiée.
const CHEMINS = [
  '',
  '/devis',
  '/contact',
  '/faq',
  '/suivi',
  '/mentions-legales',
  '/cgv',
  '/confidentialite',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entrees: MetadataRoute.Sitemap = [];

  for (const chemin of CHEMINS) {
    for (const locale of locales) {
      entrees.push({
        url: `${SITE_URL}/${locale}${chemin}/`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${chemin}/`]),
          ),
        },
      });
    }
  }

  // Pages service issues de Sanity (mêmes slugs que generateStaticParams).
  for (const locale of locales) {
    const slugs = await getServiceSlugs(locale).catch(() => []);
    for (const slug of slugs) {
      entrees.push({
        url: `${SITE_URL}/${locale}/services/${slug}/`,
        lastModified: new Date(),
      });
    }
  }

  return entrees;
}
