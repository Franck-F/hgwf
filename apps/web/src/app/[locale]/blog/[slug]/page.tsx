import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@hgwf/shared';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getArticle, getArticles } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { TEXTES_BLOG, dateLisible, jsonLdInjectable } from '@/blog/outils';
import { nettoyerHtmlArticle } from '@/blog/nettoyage';

type PageParams = { locale: string; slug: string };

// Slug réservé quand aucun article n'existe encore : l'export statique exige au
// moins un chemin pour une route dynamique. Il rend une page 404.
const SLUG_VIDE = 'aucun-article';

export async function generateStaticParams(): Promise<PageParams[]> {
  const params: PageParams[] = [];
  for (const locale of routing.locales) {
    const articles = await getArticles(locale);
    for (const a of articles) params.push({ locale, slug: a.slug });
  }
  return params.length > 0 ? params : [{ locale: routing.defaultLocale, slug: SLUG_VIDE }];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticle(locale, slug);
  if (!article) return {};
  return metadonneesPage({
    locale,
    chemin: `/blog/${slug}`,
    titre: `${article.titre} · HGWF Cargo`,
    description: article.description ?? TEXTES_BLOG[locale].seoDescription,
    seulementCetteLangue: true,
    type: 'article',
    image: article.imageUrl ? { url: article.imageUrl, alt: article.imageAlt ?? article.titre } : null,
  });
}

export default async function ArticlePage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const article = await getArticle(locale, slug);
  if (!article) notFound();
  const t = TEXTES_BLOG[locale];
  const donnees = [jsonLdInjectable(article.jsonLd), jsonLdInjectable(article.faqJsonLd)].filter((d): d is string => d !== null);

  return (
    <main>
      {donnees.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: d }} />
      ))}

      <header>
        <div className="hero-photo relative isolate overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[64px] text-creme md:px-[72px]">
          <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          <div className="hero-entree mx-auto flex max-w-[820px] flex-col gap-4">
            <Link href="/blog" className="text-xs font-medium tracking-[0.32em] text-or uppercase">
              ← {t.retour}
            </Link>
            <h1 className="m-0 text-3xl leading-[1.1] font-bold tracking-[-0.03em] md:text-[44px]">{article.titre}</h1>
            <p className="m-0 text-sm opacity-85">
              {t.publieLe} <time dateTime={article.publieLe}>{dateLisible(locale, article.publieLe)}</time>
            </p>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-[820px] px-5 pt-12 sm:px-8">
        {article.imageUrl ? (
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-[22px] bg-marine">
            <Image
              src={article.imageUrl}
              alt={article.imageAlt ?? ''}
              fill
              priority
              sizes="(min-width: 860px) 820px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        {/* HTML nettoyé deux fois : à la réception (apps/api/src/blog.js) et ici,
            à la construction, au cas où il aurait été modifié dans le Studio. */}
        <div className="contenu-article" dangerouslySetInnerHTML={{ __html: nettoyerHtmlArticle(article.contenuHtml) }} />
      </article>

      <section className="revele mx-auto max-w-[820px] px-5 pt-16 pb-22 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-marine px-6 py-10 text-creme md:px-12">
          <div className="flex max-w-[460px] flex-col gap-2">
            <h2 className="m-0 text-2xl font-bold tracking-[-0.03em]">{t.appelTitre}</h2>
            <p className="m-0 text-[15px] opacity-85">{t.appelTexte}</p>
          </div>
          <Link href="/devis" className="presse inline-flex items-center gap-2 rounded-full bg-corail px-[26px] py-3 text-sm font-medium text-marine">
            {t.appelBouton}
          </Link>
        </div>
      </section>
    </main>
  );
}
