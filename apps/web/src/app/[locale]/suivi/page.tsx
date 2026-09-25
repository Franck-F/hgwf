import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageSuivi } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { FaqCiblee } from '@/components/FaqCiblee';
import { FAQ_CIBLEES } from '@/content/faqCiblees';
import { SuiviTracker, type SuiviTrackerContent } from '@/components/suivi/SuiviTracker';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie exacte de la maquette Suivi.dc.html (Claude Design).
// Chaque champ est remplaçable depuis le Studio Sanity (document « Page Suivi »).
const HERO_DEFAUT = {
  eyebrow: "Suivi d'envoi en temps réel",
  titre: 'Où est votre',
  titreAccent: 'colis',
  description:
    "Référence dossier ou numéro de conteneur : statut, position, navire et ETA, du quai du Havre jusqu'au lagon.",
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
  noteContactLien: "Contactez l'équipe : suivi personnalisé par téléphone ou WhatsApp, à tout moment.",
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
    position: 'Au centre logistique, Rosny-sous-Bois',
    chipA: 'EMPOTAGE EN COURS',
    chipB: '10 RUE DIDEROT',
  },
  {
    jalon: 'Au port du Havre',
    statut: 'AU PORT',
    position: 'À quai, Le Havre',
    chipA: 'ATTENTE EMBARQUEMENT',
    chipB: "QUAI DE L'EURE",
  },
  {
    jalon: 'En mer',
    statut: 'EN MER',
    position: 'Position en direct, en mer',
    chipA: null,
    chipB: null,
  },
  {
    jalon: "Port d'arrivée",
    statut: 'ARRIVÉ AU PORT',
    position: "À quai, port d'arrivée",
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
      texte: 'Débarquement, dédouanement et remise à destination, jusqu’au lagon.',
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
  titre: "Suivi d'envoi et de conteneur en ligne · HGWF Cargo",
  description:
    "Suivez votre envoi HGWF Cargo avec votre référence : statut, position, navire et date d'arrivée estimée, du départ à la livraison.",
};

// Version anglaise des contenus par défaut (le contenu Sanity EN prime).
// Les trajets de démonstration restent partagés : noms de navires et
// coordonnées identiques, seule la mention d'océan est traduite ci-dessous.
const HERO_EN = {
  eyebrow: 'Real-time shipment tracking',
  titre: 'Where is your',
  titreAccent: 'parcel',
  description:
    'File reference or container number: status, position, vessel and ETA, from the quay in Le Havre all the way to the lagoon.',
  placeholderRecherche: 'HGWF-2026-4815 or MSKU 907 214 3',
  boutonRecherche: 'Track',
  noteDemo: 'DEMO DATA',
  imageUrl: null as string | null,
};

const RESULTAT_EN = {
  libelleLatitude: 'LATITUDE',
  libelleLongitude: 'LONGITUDE',
  libelleSignal: 'SIGNAL',
  cartePosition: 'Position',
  carteNavire: 'Vessel',
  carteProgression: 'Progress',
  carteEta: 'ETA',
  noteContact: 'A question about this shipment?',
  noteContactLien: 'Contact the team: personalised follow-up by phone or WhatsApp, at any time.',
  positionAvantDepart: "LE HAVRE · QUAI DE L'EURE",
  navireAttente: 'AWAITING LOADING',
  suffixeDebarque: '(UNLOADED)',
  libelleVitesse: 'SPEED',
  libelleCap: 'HEADING',
};

const ETAPES_EN = [
  {
    jalon: 'Picked up',
    statut: 'PICKED UP',
    position: 'At the logistics centre, Rosny-sous-Bois',
    chipA: 'STUFFING IN PROGRESS',
    chipB: '10 RUE DIDEROT',
  },
  {
    jalon: 'At the port of Le Havre',
    statut: 'AT THE PORT',
    position: 'At the quay, Le Havre',
    chipA: 'AWAITING LOADING',
    chipB: "QUAI DE L'EURE",
  },
  {
    jalon: 'At sea',
    statut: 'AT SEA',
    position: 'Live position, at sea',
    chipA: null,
    chipB: null,
  },
  {
    jalon: 'Port of arrival',
    statut: 'ARRIVED AT PORT',
    position: 'At the quay, port of arrival',
    chipA: 'CUSTOMS CLEARANCE',
    chipB: 'CONTAINER TERMINAL',
  },
  {
    jalon: 'Delivered',
    statut: 'DELIVERED',
    position: 'Delivered to destination',
    chipA: 'DELIVERED ON 11/07',
    chipB: 'SIGNATURE RECEIVED',
  },
];

const VOYAGE_EN = {
  titre: 'The journey of your',
  titreAccent: 'container',
  etapes: [
    {
      titre: 'Pick-up',
      texte: 'Drop-off in Rosny-sous-Bois or home collection, stuffing and customs file.',
      imageUrl: null as string | null,
    },
    {
      titre: 'At sea',
      texte: 'Loading in Le Havre or Fos, crossing tracked position by position.',
      imageUrl: null as string | null,
    },
    {
      titre: 'Delivery',
      texte: 'Unloading, customs clearance and hand-over at destination, all the way to the lagoon.',
      imageUrl: null as string | null,
    },
  ],
};

const CTA_EN = {
  titre: 'A shipment to prepare?',
  sousTitre: 'FREE QUOTE · REPLY WITHIN 24–48 H',
  bouton: 'Request a quote',
  lien: '/contact',
  imageUrl: null as string | null,
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const data = await getPageSuivi(locale);

  const enL = locale === 'en';
  const HERO_D = enL ? HERO_EN : HERO_DEFAUT;
  const RESULTAT_D = enL ? RESULTAT_EN : RESULTAT_DEFAUT;
  const VOYAGE_D = enL ? VOYAGE_EN : VOYAGE_DEFAUT;
  const CTA_D = enL ? CTA_EN : CTA_DEFAUT;
  const ETAPES_D = enL ? ETAPES_EN : ETAPES_DEFAUT;
  // Trajets démo : données partagées, mention d'océan traduite à la volée.
  const TRAJETS_D = enL
    ? TRAJETS_DEFAUT.map((t) => ({
        ...t,
        positionMer: t.positionMer.replace('ATLANTIQUE', 'ATLANTIC').replace('PACIFIQUE', 'PACIFIC'),
      }))
    : TRAJETS_DEFAUT;

  const etapes = ETAPES_D.map((def, i) => {
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
        const def = TRAJETS_D[i % TRAJETS_D.length]!;
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
    : TRAJETS_D;

  const tracker: SuiviTrackerContent = {
    hero: {
      eyebrow: data?.hero?.eyebrow ?? HERO_D.eyebrow,
      titre: data?.hero?.titre ?? HERO_D.titre,
      titreAccent: data?.hero?.titreAccent ?? HERO_D.titreAccent,
      description: data?.hero?.description ?? HERO_D.description,
      placeholderRecherche: data?.hero?.placeholderRecherche ?? HERO_D.placeholderRecherche,
      boutonRecherche: data?.hero?.boutonRecherche ?? HERO_D.boutonRecherche,
      noteDemo: data?.hero?.noteDemo ?? HERO_D.noteDemo,
      imageUrl: data?.hero?.imageUrl ?? HERO_D.imageUrl,
    },
    resultat: {
      libelleLatitude: data?.resultat?.libelleLatitude ?? RESULTAT_D.libelleLatitude,
      libelleLongitude: data?.resultat?.libelleLongitude ?? RESULTAT_D.libelleLongitude,
      libelleSignal: data?.resultat?.libelleSignal ?? RESULTAT_D.libelleSignal,
      cartePosition: data?.resultat?.cartePosition ?? RESULTAT_D.cartePosition,
      carteNavire: data?.resultat?.carteNavire ?? RESULTAT_D.carteNavire,
      carteProgression: data?.resultat?.carteProgression ?? RESULTAT_D.carteProgression,
      carteEta: data?.resultat?.carteEta ?? RESULTAT_D.carteEta,
      noteContact: data?.resultat?.noteContact ?? RESULTAT_D.noteContact,
      noteContactLien: data?.resultat?.noteContactLien ?? RESULTAT_D.noteContactLien,
      positionAvantDepart: data?.resultat?.positionAvantDepart ?? RESULTAT_D.positionAvantDepart,
      navireAttente: data?.resultat?.navireAttente ?? RESULTAT_D.navireAttente,
      suffixeDebarque: data?.resultat?.suffixeDebarque ?? RESULTAT_D.suffixeDebarque,
      libelleVitesse: data?.resultat?.libelleVitesse ?? RESULTAT_D.libelleVitesse,
      libelleCap: data?.resultat?.libelleCap ?? RESULTAT_D.libelleCap,
    },
    etapes,
    trajets,
    portDepart: data?.portDepart ?? 'Le Havre',
    contactHref: '/contact',
    numeroDefaut: 'HGWF-2026-4815',
  };

  const voyage = {
    titre: data?.voyage?.titre ?? VOYAGE_D.titre,
    titreAccent: data?.voyage?.titreAccent ?? VOYAGE_D.titreAccent,
    etapes: VOYAGE_D.etapes.map((def, i) => {
      const cms = data?.voyage?.etapes?.[i];
      return {
        titre: cms?.titre ?? def.titre,
        texte: cms?.texte ?? def.texte,
        imageUrl: cms?.imageUrl ?? def.imageUrl,
      };
    }),
  };

  const cta = {
    titre: data?.cta?.titre ?? CTA_D.titre,
    sousTitre: data?.cta?.sousTitre ?? CTA_D.sousTitre,
    bouton: data?.cta?.bouton ?? CTA_D.bouton,
    lien: data?.cta?.lien ?? CTA_D.lien,
    imageUrl: data?.cta?.imageUrl ?? CTA_D.imageUrl,
  };

  const seoEn = {
    titre: 'Track your shipment and container online · HGWF Cargo',
    description:
      'Track your HGWF Cargo shipment with your reference: status, position, vessel and estimated arrival date, from departure to delivery.',
  };
  const seoDefaut = locale === 'en' ? seoEn : SEO_DEFAUT;
  const seo = {
    titre: data?.seoTitre ?? seoDefaut.titre,
    description: data?.seoDescription ?? seoDefaut.description,
  };

  return { tracker, voyage, cta, seo };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const { seo } = await getContenu(l);
  return metadonneesPage({ locale: l, chemin: '/suivi', titre: seo.titre, description: seo.description });
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
                <Image src={e.imageUrl} alt={e.titre} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
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

      <FaqCiblee {...FAQ_CIBLEES.suivi[resolveLocale(locale)]} className="pt-4" />

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
