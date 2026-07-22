import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageSuivi } from '@/sanity/queries';
import { SuiviTracker, type SuiviTrackerContent } from '@/components/suivi/SuiviTracker';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie exacte de la maquette Suivi.dc.html (Claude Design).
// Chaque champ est remplaçable depuis le Studio Sanity (document « Page Suivi »).
const HERO_DEFAUT = {
  eyebrow: "Suivi d'envoi en temps réel",
  titre: 'Où est votre',
  titreAccent: 'colis',
  description:
    "Référence dossier ou numéro de conteneur : statut, position, navire et ETA — du quai du Havre jusqu'au lagon.",
  placeholderRecherche: 'HGWF-2026-4815 ou MSKU 907 214 3',
  boutonRecherche: 'Suivre',
  noteDemo: 'DONNÉES DE DÉMONSTRATION',
  imageUrl: null as string | null,
};

const RESULTAT_DEFAUT = {
  libelleLatitude: 'LATITUDE',
  libelleLongitude: 'LONGITUDE',
  libelleSignal: 'SIGNAL',
  cartePosition: 'Position',
  carteNavire: 'Navire',
  carteProgression: 'Progression',
  carteEta: 'ETA',
  noteContact: 'Une question sur cet acheminement ?',
  noteContactLien: "Contactez l'équipe — suivi personnalisé par téléphone ou WhatsApp, à tout moment.",
  positionAvantDepart: "LE HAVRE · QUAI DE L'EURE",
  navireAttente: "EN ATTENTE D'EMBARQUEMENT",
  suffixeDebarque: '(DÉBARQUÉ)',
  libelleVitesse: 'VITESSE',
  libelleCap: 'CAP',
};

const ETAPES_DEFAUT = [
  {
    jalon: 'Pris en charge',
    statut: 'PRIS EN CHARGE',
    position: 'Au centre logistique — Rosny-sous-Bois',
    chipA: 'EMPOTAGE EN COURS',
    chipB: '10 RUE DIDEROT',
  },
  {
    jalon: 'Au port du Havre',
    statut: 'AU PORT',
    position: 'À quai — Le Havre',
    chipA: 'ATTENTE EMBARQUEMENT',
    chipB: "QUAI DE L'EURE",
  },
  {
    jalon: 'En mer',
    statut: 'EN MER',
    position: 'Position en direct — en mer',
    chipA: null,
    chipB: null,
  },
  {
    jalon: "Port d'arrivée",
    statut: 'ARRIVÉ AU PORT',
    position: "À quai — port d'arrivée",
    chipA: 'DÉDOUANEMENT',
    chipB: 'TERMINAL CONTENEURS',
  },
  {
    jalon: 'Livré',
    statut: 'LIVRÉ',
    position: 'Livré à destination',
    chipA: 'LIVRÉ LE 11/07',
    chipB: 'SIGNATURE REÇUE',
  },
];

const TRAJETS_DEFAUT = [
  {
    destination: 'Pointe-à-Pitre, Guadeloupe',
    destinationCourt: 'POINTE-À-PITRE',
    navire: 'CMA CGM FORT ROYAL',
    positionMer: "ATLANTIQUE · 32°10'N 045°30'W",
    latMer: 32.17,
    lonMer: -45.5,
    latArrivee: 16.24,
    lonArrivee: -61.53,
    cap: 247,
  },
  {
    destination: 'Fort-de-France, Martinique',
    destinationCourt: 'FORT-DE-FRANCE',
    navire: "CMA CGM FORT FLEUR D'ÉPÉE",
    positionMer: "ATLANTIQUE · 28°42'N 052°06'W",
    latMer: 28.7,
    lonMer: -52.1,
    latArrivee: 14.6,
    lonArrivee: -61.07,
    cap: 243,
  },
  {
    destination: 'Nouméa, Nouvelle-Calédonie',
    destinationCourt: 'NOUMÉA',
    navire: 'MARFRET NIOLON',
    positionMer: "PACIFIQUE · 12°08'S 168°44'E",
    latMer: -12.13,
    lonMer: 168.73,
    latArrivee: -22.27,
    lonArrivee: 166.44,
    cap: 192,
  },
  {
    destination: 'Papeete, Tahiti',
    destinationCourt: 'PAPEETE',
    navire: 'ARANUI 5',
    positionMer: "PACIFIQUE · 08°55'S 140°06'W",
    latMer: -8.92,
    lonMer: -140.1,
    latArrivee: -17.53,
    lonArrivee: -149.57,
    cap: 218,
  },
  {
    destination: 'Mata-Utu, Wallis-et-Futuna',
    destinationCourt: 'MATA-UTU',
    navire: 'SOUTHERN MOANA',
    positionMer: "PACIFIQUE · 13°17'S 176°11'W",
    latMer: -13.28,
    lonMer: -176.18,
    latArrivee: -13.28,
    lonArrivee: -176.17,
    cap: 205,
  },
  {
    destination: 'Dégrad des Cannes, Guyane',
    destinationCourt: 'DÉGRAD DES CANNES',
    navire: 'CMA CGM AMAZONE',
    positionMer: "ATLANTIQUE · 10°02'N 048°21'W",
    latMer: 10.03,
    lonMer: -48.35,
    latArrivee: 4.85,
    lonArrivee: -52.3,
    cap: 232,
  },
];

const VOYAGE_DEFAUT = {
  titre: 'Le voyage de votre',
  titreAccent: 'conteneur',
  etapes: [
    {
      titre: 'Prise en charge',
      texte: 'Dépôt à Rosny-sous-Bois ou enlèvement à domicile, empotage et dossier douane.',
      imageUrl: null as string | null,
    },
    {
      titre: 'En mer',
      texte: 'Embarquement au Havre ou à Fos, traversée suivie position par position.',
      imageUrl: null as string | null,
    },
    {
      titre: 'Livraison',
      texte: 'Débarquement, dédouanement et remise à destination — jusqu’au lagon.',
      imageUrl: null as string | null,
    },
  ],
};

const CTA_DEFAUT = {
  titre: 'Un envoi à préparer ?',
  sousTitre: 'DEVIS GRATUIT · RÉPONSE SOUS 24–48 H',
  bouton: 'Demander un devis',
  lien: '/contact',
  imageUrl: null as string | null,
};

const SEO_DEFAUT = {
  titre: "Suivi d'envoi — HGWF Cargo",
  description:
    "Suivez votre envoi HGWF Cargo : statut, position, navire et date d'arrivée estimée, du départ à la livraison.",
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const data = await getPageSuivi(locale);

  const etapes = ETAPES_DEFAUT.map((def, i) => {
    const cms = data?.etapes?.[i];
    return {
      jalon: cms?.jalon ?? def.jalon,
      statut: cms?.statut ?? def.statut,
      position: cms?.position ?? def.position,
      chipA: cms?.chipA ?? def.chipA,
      chipB: cms?.chipB ?? def.chipB,
      imageUrl: cms?.imageUrl ?? null,
    };
  });

  const trajets = data?.trajetsDemo?.length
    ? data.trajetsDemo.map((t, i) => {
        // Modulo borné par la longueur du tableau : l'entrée existe toujours.
        const def = TRAJETS_DEFAUT[i % TRAJETS_DEFAUT.length]!;
        return {
          destination: t.destination ?? def.destination,
          destinationCourt: t.destinationCourt ?? def.destinationCourt,
          navire: t.navire ?? def.navire,
          positionMer: t.positionMer ?? def.positionMer,
          latMer: t.latMer ?? def.latMer,
          lonMer: t.lonMer ?? def.lonMer,
          latArrivee: t.latArrivee ?? def.latArrivee,
          lonArrivee: t.lonArrivee ?? def.lonArrivee,
          cap: t.cap ?? def.cap,
        };
      })
    : TRAJETS_DEFAUT;

  const tracker: SuiviTrackerContent = {
    hero: {
      eyebrow: data?.hero?.eyebrow ?? HERO_DEFAUT.eyebrow,
      titre: data?.hero?.titre ?? HERO_DEFAUT.titre,
      titreAccent: data?.hero?.titreAccent ?? HERO_DEFAUT.titreAccent,
      description: data?.hero?.description ?? HERO_DEFAUT.description,
      placeholderRecherche: data?.hero?.placeholderRecherche ?? HERO_DEFAUT.placeholderRecherche,
      boutonRecherche: data?.hero?.boutonRecherche ?? HERO_DEFAUT.boutonRecherche,
      noteDemo: data?.hero?.noteDemo ?? HERO_DEFAUT.noteDemo,
      imageUrl: data?.hero?.imageUrl ?? HERO_DEFAUT.imageUrl,
    },
    resultat: {
      libelleLatitude: data?.resultat?.libelleLatitude ?? RESULTAT_DEFAUT.libelleLatitude,
      libelleLongitude: data?.resultat?.libelleLongitude ?? RESULTAT_DEFAUT.libelleLongitude,
      libelleSignal: data?.resultat?.libelleSignal ?? RESULTAT_DEFAUT.libelleSignal,
      cartePosition: data?.resultat?.cartePosition ?? RESULTAT_DEFAUT.cartePosition,
      carteNavire: data?.resultat?.carteNavire ?? RESULTAT_DEFAUT.carteNavire,
      carteProgression: data?.resultat?.carteProgression ?? RESULTAT_DEFAUT.carteProgression,
      carteEta: data?.resultat?.carteEta ?? RESULTAT_DEFAUT.carteEta,
      noteContact: data?.resultat?.noteContact ?? RESULTAT_DEFAUT.noteContact,
      noteContactLien: data?.resultat?.noteContactLien ?? RESULTAT_DEFAUT.noteContactLien,
      positionAvantDepart: data?.resultat?.positionAvantDepart ?? RESULTAT_DEFAUT.positionAvantDepart,
      navireAttente: data?.resultat?.navireAttente ?? RESULTAT_DEFAUT.navireAttente,
      suffixeDebarque: data?.resultat?.suffixeDebarque ?? RESULTAT_DEFAUT.suffixeDebarque,
      libelleVitesse: data?.resultat?.libelleVitesse ?? RESULTAT_DEFAUT.libelleVitesse,
      libelleCap: data?.resultat?.libelleCap ?? RESULTAT_DEFAUT.libelleCap,
    },
    etapes,
    trajets,
    portDepart: data?.portDepart ?? 'Le Havre',
    contactHref: '/contact',
    numeroDefaut: 'HGWF-2026-4815',
  };

  const voyage = {
    titre: data?.voyage?.titre ?? VOYAGE_DEFAUT.titre,
    titreAccent: data?.voyage?.titreAccent ?? VOYAGE_DEFAUT.titreAccent,
    etapes: VOYAGE_DEFAUT.etapes.map((def, i) => {
      const cms = data?.voyage?.etapes?.[i];
      return {
        titre: cms?.titre ?? def.titre,
        texte: cms?.texte ?? def.texte,
        imageUrl: cms?.imageUrl ?? def.imageUrl,
      };
    }),
  };

  const cta = {
    titre: data?.cta?.titre ?? CTA_DEFAUT.titre,
    sousTitre: data?.cta?.sousTitre ?? CTA_DEFAUT.sousTitre,
    bouton: data?.cta?.bouton ?? CTA_DEFAUT.bouton,
    lien: data?.cta?.lien ?? CTA_DEFAUT.lien,
    imageUrl: data?.cta?.imageUrl ?? CTA_DEFAUT.imageUrl,
  };

  const seo = {
    titre: data?.seoTitre ?? SEO_DEFAUT.titre,
    description: data?.seoDescription ?? SEO_DEFAUT.description,
  };

  return { tracker, voyage, cta, seo };
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

export default async function SuiviPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tracker, voyage, cta } = await getContenu(resolveLocale(locale));

  return (
    <main>
      <SuiviTracker content={tracker} />

      {/* Le voyage en images */}
      <section className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-22">
        <h2 className="revele m-0 text-center text-4xl font-bold tracking-[-0.03em]">
          {voyage.titre} <span className="text-corail-texte">{voyage.titreAccent}</span>.
        </h2>
        <div className="revele-cascade mt-9 grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {voyage.etapes.map((e, i) => (
            <div key={e.titre} className="carte-zoom relative h-[300px] overflow-hidden rounded-3xl bg-marine">
              {e.imageUrl && (
                <Image src={e.imageUrl} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
              )}
              <span
                className="absolute inset-0 bg-linear-180 from-marine/5 from-30% to-marine/90 to-100%"
                aria-hidden="true"
              />
              <span className="absolute top-4 left-4 rounded-full bg-creme px-3.5 py-1.5 font-mono text-[13px] text-marine">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="absolute right-5 bottom-[18px] left-5 flex flex-col gap-1 text-creme">
                <span className="text-[19px] font-bold">{e.titre}</span>
                <span className="text-[13px] opacity-85">{e.texte}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Bandeau CTA */}
      <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-22">
        <div className="relative isolate flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[36px] bg-marine px-5 sm:px-8 py-14 md:px-16">
          {cta.imageUrl && (
            <Image src={cta.imageUrl} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          )}
          <span
            className="absolute inset-0 -z-10 bg-linear-92 from-marine/90 from-0% via-marine/50 via-60% to-marine/15 to-100%"
            aria-hidden="true"
          />
          <div className="revele flex flex-col gap-2.5 text-creme">
            <h2 className="m-0 text-3xl font-bold tracking-[-0.03em]">{cta.titre}</h2>
            <span className="font-mono text-[13px] text-ciel">{cta.sousTitre}</span>
          </div>
          <Link
            href={cta.lien}
            className="rounded-full bg-corail px-5 sm:px-8 py-[15px] text-base font-medium text-marine transition hover:bg-or"
          >
            {cta.bouton}
          </Link>
        </div>
      </section>
    </main>
  );
}
