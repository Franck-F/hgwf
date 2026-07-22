import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageLegale } from '@/sanity/queries';
import { PageLegale } from './PageLegale';
import { fusionner } from '@/content/legal/fusion';
import { contenuLegal, type SlugLegal } from '@/content/legal';

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

// Les trois pages légales ne diffèrent que par leur slug et leur SEO : la
// mécanique de chargement, de repli et de rendu est écrite une seule fois.
export function creerPageLegale(slug: SlugLegal, seo: { titre: string; description: string }) {
  async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    const data = await getPageLegale(resolveLocale(locale), slug);
    return {
      title: data?.seoTitre || seo.titre,
      description: data?.seoDescription || seo.description,
    };
  }

  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const data = await getPageLegale(resolveLocale(locale), slug);
    const defaut = contenuLegal(slug, resolveLocale(locale));
    return <PageLegale contenu={fusionner(defaut, data)} locale={locale} />;
  }

  return { generateMetadata, Page };
}
