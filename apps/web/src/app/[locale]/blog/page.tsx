import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getArticles } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { TEXTES_BLOG, dateLisible } from '@/blog/outils';

export { generateStaticParams } from '@/i18n/staticParams';

const langue = (locale: string): Locale => (isLocale(locale) ? locale : defaultLocale);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const l = langue((await params).locale);
  const t = TEXTES_BLOG[l];
  return metadonneesPage({ locale: l, chemin: '/blog', titre: t.seoTitre, description: t.seoDescription });
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = langue(locale);
  const t = TEXTES_BLOG[l];
  const articles = await getArticles(l);

  return (
    <main>
      <header>
        <div className="hero-photo relative isolate overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[72px] text-creme md:px-[72px]">
          <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          <div className="hero-entree flex max-w-[720px] flex-col gap-4">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{t.eyebrow}</span>
            <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">{t.titre}</h1>
            <p className="m-0 text-base leading-[1.55] opacity-85">{t.description}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-5 pt-14 pb-22 sm:px-8">
        {articles.length === 0 ? (
          <p className="m-0 text-[15px] text-encre-douce">{t.vide}</p>
        ) : (
          <ul className="revele-cascade m-0 grid list-none grid-cols-1 gap-[22px] p-0 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/blog/${a.slug}`}
                  className="carte-zoom group flex h-full flex-col overflow-hidden rounded-[22px] border border-marine/12 bg-ivoire"
                >
                  <span className="relative block aspect-[16/9] overflow-hidden bg-marine">
                    {a.imageUrl ? (
                      <Image
                        src={a.imageUrl}
                        alt={a.imageAlt ?? ''}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="flex flex-1 flex-col gap-2 p-6">
                    <time dateTime={a.publieLe} className="text-xs font-medium tracking-[0.12em] text-encre-douce uppercase">
                      {dateLisible(l, a.publieLe)}
                    </time>
                    <h2 className="m-0 text-lg leading-[1.3] font-bold">{a.titre}</h2>
                    {a.description ? <p className="m-0 text-sm leading-[1.6] text-encre-douce">{a.description}</p> : null}
                    <span className="mt-auto pt-2 text-sm font-medium text-corail-texte">
                      {t.lire} <span className="inline-block transition group-hover:translate-x-1">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
