import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageAccueil, getServices } from '@/sanity/queries';
import { FaqCiblee } from '@/components/FaqCiblee';
import { FAQ_CIBLEES } from '@/content/faqCiblees';
import { metadonneesPage } from '@/seo/metadonnees';

export { generateStaticParams } from '@/i18n/staticParams';

// Cartes par défaut : mêmes services que la section « Cartes services » de
// l'accueil (src/app/[locale]/page.tsx, DEFAUT.services), avec version anglaise.
const SERVICES_DEFAUT: Record<
  Locale,
  { titre: string; texte: string; lien: string; imageUrl: string | null }[]
> = {
  fr: [
    { titre: 'Groupage (LCL)', texte: 'Facturé au mètre cube, idéal particuliers & PME', lien: '/devis', imageUrl: '/photos/groupage.jpg' },
    { titre: 'Conteneur complet (FCL)', texte: "20' ou 40', dry ou reefer, réservé à votre envoi", lien: '/devis', imageUrl: '/photos/conteneur-complet.jpg' },
    { titre: 'Véhicules & bateaux', texte: 'Roulants ou non, en conteneur ou ro-ro', lien: '/devis', imageUrl: '/photos/vehicules-bateaux.jpg' },
    { titre: 'Déménagement', texte: 'Mutation Outre-mer, retraite, retour au pays', lien: '/#demenagement', imageUrl: null },
    { titre: 'Transport de conteneur', texte: 'Acheminement port à port ou porte à porte', lien: '/devis', imageUrl: '/photos/transport-conteneur.jpg' },
    { titre: 'Fret aérien', texte: 'La voie des airs pour vos envois urgents', lien: '/devis', imageUrl: '/photos/fret-aerien.jpg' },
    { titre: 'Entrepôt & box de stockage', texte: 'Espaces de stockage à louer, courte ou longue durée', lien: '/contact', imageUrl: '/photos/entrepot.jpg' },
  ],
  en: [
    { titre: 'Groupage (LCL)', texte: 'Billed by cubic metre, ideal for individuals & SMEs', lien: '/devis', imageUrl: '/photos/groupage.jpg' },
    { titre: 'Full container (FCL)', texte: "20' or 40', dry or reefer, reserved for your shipment", lien: '/devis', imageUrl: '/photos/conteneur-complet.jpg' },
    { titre: 'Vehicles & boats', texte: 'Running or not, in container or ro-ro', lien: '/devis', imageUrl: '/photos/vehicules-bateaux.jpg' },
    { titre: 'Removals', texte: 'Overseas relocation, retirement, return home', lien: '/#demenagement', imageUrl: null },
    { titre: 'Container transport', texte: 'Port-to-port or door-to-door haulage', lien: '/devis', imageUrl: '/photos/transport-conteneur.jpg' },
    { titre: 'Air freight', texte: 'The fast lane for your urgent shipments', lien: '/devis', imageUrl: '/photos/fret-aerien.jpg' },
    { titre: 'Warehouse & storage boxes', texte: 'Storage space for rent, short or long term', lien: '/contact', imageUrl: '/photos/entrepot.jpg' },
  ],
};

const TEXTES = {
  fr: {
    eyebrow: 'Nos services',
    titre: 'Un service pour chaque cargaison.',
    description:
      'Maritime, aérien ou terrestre : groupage, conteneur complet, véhicules, déménagement Outre-mer, fret aérien et stockage.',
    lienDevis: 'Demander un devis',
    fiches: 'Fiches détaillées',
    seoTitre: 'Nos services de fret maritime, aérien & routier · HGWF Cargo',
    seoDescription:
      'Groupage, conteneur complet, véhicules, déménagement Outre-mer, fret aérien et stockage : tous les services de transport HGWF Cargo.',
  },
  en: {
    eyebrow: 'Our services',
    titre: 'A service for every cargo.',
    description:
      'Sea, air or road: groupage, full containers, vehicles, overseas removals, air freight and storage.',
    lienDevis: 'Request a quote',
    fiches: 'Detailed pages',
    seoTitre: 'Sea, air & road freight services worldwide · HGWF Cargo',
    seoDescription:
      'Groupage, full containers, vehicles, overseas removals, air freight and storage: all HGWF Cargo transport services to the Caribbean and beyond.',
  },
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getCartes(locale: Locale) {
  const d = await getPageAccueil(locale);
  const defaut = SERVICES_DEFAUT[locale];
  return d?.services?.length
    ? d.services.map((s, i) => ({
        titre: s.titre ?? defaut[i]?.titre ?? '',
        texte: s.texte ?? defaut[i]?.texte ?? '',
        lien: s.lien ?? defaut[i]?.lien ?? '/devis',
        // Images locales forcées, comme sur l'accueil — voir DEFAUT.services.
        imageUrl: defaut[i]?.imageUrl ?? s.imageUrl ?? null,
      }))
    : defaut;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = TEXTES[l];
  return metadonneesPage({
    locale: l,
    chemin: '/services',
    titre: t.seoTitre,
    description: t.seoDescription,
  });
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = resolveLocale(locale);
  const t = TEXTES[l];
  const [cartes, fiches] = await Promise.all([getCartes(l), getServices(l)]);

  return (
    <main>
      {/* En-tête */}
      <header>
        <div className="hero-photo relative isolate flex flex-wrap items-end justify-between gap-8 overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[72px] text-creme md:px-[72px]">
          <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          <div className="hero-entree flex max-w-[640px] flex-col gap-4">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{t.eyebrow}</span>
            <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
              {t.titre}
            </h1>
            <p className="m-0 text-base leading-[1.55] opacity-85">
              {t.description}{' '}
              <Link href="/devis" className="text-or underline">
                {t.lienDevis}
              </Link>
              .
            </p>
          </div>
        </div>
      </header>

      {/* Cartes services — même grille que l'accueil */}
      <section className="mx-auto mt-14 max-w-[1200px] px-5 sm:px-8">
        <div className="revele-cascade grid grid-cols-1 gap-[18px] sm:grid-cols-2 sm:[&>a:last-child]:col-span-2 lg:grid-cols-12 lg:[&>a]:col-span-3 lg:[&>a:nth-child(n+5)]:col-span-4 lg:[&>a:last-child]:col-span-4">
          {cartes.map((s) => (
            <Link key={s.titre} href={s.lien} className="carte-zoom group relative block h-[250px] overflow-hidden rounded-[22px] bg-marine">
              {s.imageUrl && (
                <Image src={s.imageUrl} alt={s.titre} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              )}
              <span
                className="absolute inset-0 bg-linear-180 from-marine/0 from-30% to-marine/88 to-100%"
                aria-hidden="true"
              />
              <div className="absolute right-[18px] bottom-4 left-[18px] flex flex-col gap-1 text-creme">
                <h3 className="m-0 text-[17px] font-bold">{s.titre}</h3>
                <span className="text-xs opacity-85">{s.texte}</span>
              </div>
              <span className="fleche-carte absolute top-3.5 right-3.5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-corail text-marine">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Fiches détaillées (documents Sanity « service ») */}
      {fiches.length > 0 && (
        <section className="revele mx-auto max-w-[860px] px-5 sm:px-8 pt-16 pb-4">
          <h2 className="m-0 text-xs font-medium tracking-[0.32em] text-encre-douce uppercase">{t.fiches}</h2>
          <div className="mt-4 flex flex-col">
            {fiches.map((f) => (
              <Link
                key={f.slug}
                href={`/services/${f.slug}`}
                className="group flex items-center justify-between gap-4 border-t border-marine/14 px-1 py-[18px] last:border-b"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-base font-bold">{f.titre}</span>
                  {f.resume ? <span className="text-sm text-encre-douce">{f.resume}</span> : null}
                </span>
                <span className="font-normal text-corail-texte transition group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="pb-22" />
      <FaqCiblee {...FAQ_CIBLEES.services[l]} className="pt-16 pb-20" />
    </main>
  );
}
