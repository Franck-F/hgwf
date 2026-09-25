import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@hgwf/shared';
import { getServiceSlugs, getService } from '@/sanity/queries';
import { routing } from '@/i18n/routing';
import { metadonneesPage } from '@/seo/metadonnees';
import { Link } from '@/i18n/navigation';
import { FaqCiblee } from '@/components/FaqCiblee';
import { FAQ_CIBLEES } from '@/content/faqCiblees';
import { FICHES_SERVICES } from '@/content/fichesServices';

type PageParams = { locale: string; slug: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  const params: PageParams[] = [];
  for (const locale of routing.locales) {
    const slugs = await getServiceSlugs(locale);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const service = await getService(locale, slug);
  if (!service) return {};
  const en = locale === 'en';
  // Un titre de fiche seul (« Transport maritime ») donne une balise title de
  // ~30 caractères : on le complète par la zone desservie.
  const titre = en ? `${service.titre} to the Caribbean & worldwide` : `${service.titre} Outre-mer & international`;
  const suffixe = en
    ? ' Free quote, pick-up to delivery, from Le Havre and Fos/Marseille.'
    : ' Devis gratuit, départs du Havre et de Fos/Marseille.';
  const resume =
    service.resume ??
    (en
      ? `${service.titre}: an HGWF Cargo international transport service.`
      : `${service.titre} : un service de transport international HGWF Cargo.`);
  return metadonneesPage({
    locale,
    chemin: `/services/${slug}`,
    titre: `${titre} · HGWF Cargo`,
    // Un résumé Sanity court (< 120 caractères) est complété.
    description: resume.length < 120 ? `${resume}${suffixe}` : resume,
  });
}

export default async function ServicePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const service = await getService(locale, slug);
  if (!service) notFound();
  const fiche = FICHES_SERVICES[slug]?.[locale];
  const faq = slug === 'transport-maritime' ? FAQ_CIBLEES.transportMaritime[locale] : null;
  return (
    <main>
      <header>
        <div className="hero-photo relative isolate overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[72px] text-creme md:px-[72px]">
          <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          <div className="hero-entree flex max-w-[720px] flex-col gap-4">
            <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">{service.titre}</h1>
            {service.resume ? <p className="m-0 text-base leading-[1.55] opacity-85">{service.resume}</p> : null}
          </div>
        </div>
      </header>

      {fiche?.sections.map((section) => (
        <section key={section.titre} className="revele mx-auto max-w-[1200px] px-5 sm:px-8 pt-16">
          <h2 className="m-0 text-2xl font-bold tracking-[-0.03em] md:text-[32px]">{section.titre}</h2>
          {section.intro ? <p className="mt-3 mb-0 max-w-[70ch] text-[15px] text-encre-douce">{section.intro}</p> : null}
          <div className="mt-7 grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
            {section.rubriques.map((r) => (
              <div key={r.titre} className="flex flex-col gap-2 rounded-[20px] border border-marine/12 p-6">
                <h3 className="m-0 text-base font-bold">{r.titre}</h3>
                <p className="m-0 text-sm leading-[1.6] text-encre-douce">{r.texte}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {fiche ? (
        <section className="revele mx-auto max-w-[1200px] px-5 sm:px-8 pt-16">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-marine px-6 py-10 text-creme md:px-12">
            <div className="flex max-w-[560px] flex-col gap-2">
              <h2 className="m-0 text-2xl font-bold tracking-[-0.03em]">{fiche.appel.titre}</h2>
              <p className="m-0 text-[15px] opacity-85">{fiche.appel.texte}</p>
            </div>
            <Link
              href="/devis"
              className="presse inline-flex items-center gap-2 rounded-full bg-corail px-[26px] py-3 text-sm font-medium text-marine"
            >
              {fiche.appel.bouton}
            </Link>
          </div>
        </section>
      ) : null}

      {faq ? <FaqCiblee {...faq} className="pt-16 pb-20" /> : <div className="pb-16" />}
    </main>
  );
}
