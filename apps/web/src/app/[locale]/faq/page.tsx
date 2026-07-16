import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getFaqItems, getPageFaq, type FaqItemData, type PortableBlock } from '@/sanity/queries';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie de la maquette FAQ.dc.html (Claude Design),
// elle-même reprise du contenu du site actuel.
const HERO_DEFAUT = {
  eyebrow: 'Foire aux questions',
  titre: 'Questions fréquentes.',
  description:
    'Toutes les réponses sur nos offres et le transport de marchandises longue distance. Une autre question ?',
  lienContact: 'Contactez-nous',
  imageUrl: null as string | null,
};

const CATEGORIES_DEFAUT = [
  { cle: 'expeditions', titre: 'Expéditions' },
  { cle: 'tarifs', titre: 'Tarifs & délais' },
  { cle: 'conteneurs', titre: 'Conteneurs d’occasion' },
];

const CTA_DEFAUT = {
  titre: 'Vous n’avez pas trouvé votre réponse ?',
  sousTitre: 'RÉPONSE SOUS 24–48 H',
  bouton: 'Nous contacter',
  lien: '/contact',
};

const SEO_DEFAUT = {
  titre: 'Questions fréquentes (FAQ) — HGWF Cargo',
  description:
    'Expéditions, tarifs, délais, groupage, conteneurs d’occasion : toutes les réponses sur le transport de marchandises avec HGWF Cargo.',
};

function texte(bloc: PortableBlock): string {
  return (bloc.children ?? []).map((c) => c.text ?? '').join('');
}

// Rendu minimal du portable text : paragraphes et listes à puces.
function ReponseFaq({ blocs }: { blocs: PortableBlock[] }) {
  const rendu: React.ReactNode[] = [];
  let puces: string[] = [];

  const viderPuces = (cle: string) => {
    if (puces.length) {
      rendu.push(
        <ul key={cle} className="m-0 mt-2.5 flex list-disc flex-col gap-1.5 pl-[18px]">
          {puces.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>,
      );
      puces = [];
    }
  };

  blocs.forEach((bloc, i) => {
    if (bloc.listItem === 'bullet') {
      puces.push(texte(bloc));
      return;
    }
    viderPuces(`ul-${i}`);
    const contenu = texte(bloc);
    if (contenu) {
      rendu.push(
        <p key={`p-${i}`} className="m-0 mt-2.5 first:mt-0">
          {contenu}
        </p>,
      );
    }
  });
  viderPuces('ul-fin');

  return <div className="mt-3 text-sm leading-[1.6] text-encre-douce">{rendu}</div>;
}

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const [data, items] = await Promise.all([getPageFaq(locale), getFaqItems(locale)]);

  return {
    hero: {
      eyebrow: data?.hero?.eyebrow ?? HERO_DEFAUT.eyebrow,
      titre: data?.hero?.titre ?? HERO_DEFAUT.titre,
      description: data?.hero?.description ?? HERO_DEFAUT.description,
      lienContact: data?.hero?.lienContact ?? HERO_DEFAUT.lienContact,
      imageUrl: data?.hero?.imageUrl ?? HERO_DEFAUT.imageUrl,
    },
    categories: data?.categories?.length
      ? data.categories.map((c) => ({ cle: c.cle ?? '', titre: c.titre ?? '' }))
      : CATEGORIES_DEFAUT,
    items,
    cta: {
      titre: data?.cta?.titre ?? CTA_DEFAUT.titre,
      sousTitre: data?.cta?.sousTitre ?? CTA_DEFAUT.sousTitre,
      bouton: data?.cta?.bouton ?? CTA_DEFAUT.bouton,
      lien: data?.cta?.lien ?? CTA_DEFAUT.lien,
    },
    seo: {
      titre: data?.seoTitre ?? SEO_DEFAUT.titre,
      description: data?.seoDescription ?? SEO_DEFAUT.description,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { seo } = await getContenu(resolveLocale(locale));
  return { title: seo.titre, description: seo.description };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { hero, categories, items, cta } = await getContenu(resolveLocale(locale));

  const parCategorie = (cle: string): FaqItemData[] => items.filter((i) => (i.categorie ?? 'expeditions') === cle);

  return (
    <main>
      {/* En-tête */}
      <header>
        <div className="hero-photo relative isolate flex flex-wrap items-end justify-between gap-8 overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[72px] text-creme md:px-[72px]">
          {hero.imageUrl ? (
            <Image src={hero.imageUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          ) : (
            <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          )}
          <span
            className="absolute inset-0 -z-10 bg-linear-92 from-marine/92 from-0% via-marine/60 via-55% to-marine/25 to-100%"
            aria-hidden="true"
          />
          <div className="hero-entree flex max-w-[640px] flex-col gap-4">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{hero.eyebrow}</span>
            <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
              {hero.titre}
            </h1>
            <p className="m-0 text-base leading-[1.55] opacity-85">
              {hero.description}{' '}
              <Link href="/contact" className="text-or underline">
                {hero.lienContact}
              </Link>
              .
            </p>
          </div>
          <svg viewBox="0 0 400 30" className="block h-6 w-[280px] shrink-0" aria-hidden="true">
            <circle cx="12" cy="20" r="4" fill="#FBF4E6" />
            <circle cx="108" cy="17" r="5" fill="#FBF4E6" />
            <circle cx="204" cy="14" r="6" fill="#4EA8DE" />
            <circle cx="300" cy="11" r="7" fill="#4EA8DE" />
            <path d="M396 4 L372 18 L384 23 Z" fill="#FFB23E" />
          </svg>
        </div>
      </header>

      {/* Sections par catégorie */}
      {categories.map((cat, ci) => {
        const questions = parCategorie(cat.cle);
        if (!questions.length) return null;
        return (
          <section key={cat.cle} className={`revele mx-auto max-w-[860px] px-5 sm:px-8 ${ci === 0 ? 'pt-16' : 'pt-14'}`}>
            <span className="text-xs font-medium tracking-[0.32em] text-encre-douce uppercase">{cat.titre}</span>
            <div className="mt-4 flex flex-col">
              {questions.map((q, qi) => (
                <details
                  key={q.question}
                  open={ci === 0 && qi === 0}
                  className="group border-t border-marine/14 px-1 py-[18px] last:border-b"
                >
                  <summary className="flex cursor-pointer list-none justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden">
                    {q.question}
                    <span className="font-normal text-corail transition group-open:rotate-45">+</span>
                  </summary>
                  <ReponseFaq blocs={q.reponse ?? []} />
                </details>
              ))}
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="mx-auto max-w-[860px] px-5 sm:px-8 pt-16 pb-22">
        <div className="revele flex flex-wrap items-center justify-between gap-8 rounded-3xl bg-marine px-5 sm:px-8 py-10 text-creme md:px-12">
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-[26px] font-bold tracking-[-0.03em] uppercase">{cta.titre}</h2>
            <span className="font-mono text-[13px] text-ciel">{cta.sousTitre}</span>
          </div>
          <Link
            href={cta.lien}
            className="rounded-full bg-corail px-6 py-3 text-[15px] font-medium text-creme transition hover:bg-corail-fonce"
          >
            {cta.bouton}
          </Link>
        </div>
      </section>
    </main>
  );
}
