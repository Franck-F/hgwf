import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageAccueil } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { HouleAnimee } from '@/components/HouleAnimee';
import { GlobeDestinations } from '@/components/GlobeDestinations';

// Contenu par défaut : copie de la maquette Site HGWF Cargo.dc.html (Claude Design).
const DEFAUT = {
  hero: {
    titre: 'Le transport qui porte votre cargaison plus',
    titreAccent: 'loin',
    description:
      "Maritime, aérien ou terrestre : de l'enlèvement à la livraison, nous nous occupons de chaque étape pour que vous pensiez à la suite.",
    boutonPrincipal: 'Nous contacter',
    boutonPrincipalLien: '/devis',
    boutonSecondaire: 'Suivre un conteneur',
    boutonSecondaireLien: '/suivi',
    badge: 'AMÉRIQUE DU NORD & SUD · CARAÏBES · AFRIQUE · DEPUIS LE HAVRE & FOS/MARSEILLE',
    imageUrl: null as string | null,
  },
  services: [
    {
      titre: 'Groupage (LCL)',
      texte: 'Facturé au mètre cube, idéal particuliers & PME',
      lien: '/devis',
      imageUrl: '/photos/groupage.jpg' as string | null,
    },
    {
      titre: 'Conteneur complet (FCL)',
      texte: "20' ou 40', dry ou reefer, réservé à votre envoi",
      lien: '/devis',
      imageUrl: '/photos/conteneur-complet.jpg' as string | null,
    },
    {
      titre: 'Véhicules & bateaux',
      texte: 'Roulants ou non, en conteneur ou ro-ro',
      lien: '/devis',
      imageUrl: '/photos/vehicules-bateaux.jpg' as string | null,
    },
    {
      titre: 'Déménagement',
      texte: 'Mutation Outre-mer, retraite, retour au pays',
      lien: '/#demenagement',
      imageUrl: null as string | null,
    },
    {
      titre: 'Transport de conteneur',
      texte: 'Acheminement port à port ou porte à porte',
      lien: '/devis',
      imageUrl: '/photos/transport-conteneur.jpg' as string | null,
    },
    {
      titre: 'Fret aérien',
      texte: 'La voie des airs pour vos envois urgents',
      lien: '/devis',
      imageUrl: '/photos/fret-aerien.jpg' as string | null,
    },
    {
      titre: 'Entrepôt & box de stockage',
      texte: 'Espaces de stockage à louer, courte ou longue durée',
      lien: '/contact',
      imageUrl: '/photos/entrepot.jpg' as string | null,
    },
  ],
  promesse: {
    titre: 'Parce que vos marchandises sont',
    titreAccent: 'importantes',
    texte:
      'Vous êtes professionnel (commerçant, industriel) ou particulier : nous trouverons la meilleure option pour vos marchandises, véhicules et effets personnels.',
  },
  zones: {
    titre: 'Où nous',
    titreAccent: 'livrons',
    badge: 'SERVICES RÉGULIERS & SÉCURISÉS',
    bouton: 'Obtenir un devis gratuit',
    boutonLien: '/devis',
    imageUrl: null as string | null,
    cartes: [
      {
        titre: 'Amérique du Nord',
        texte: 'États-Unis et Canada, selon rotation : nous consulter',
      },
      { titre: 'Antilles françaises', texte: 'Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy' },
      { titre: 'Guyane', texte: 'Dégrad des Cannes et livraisons intérieures' },
      { titre: 'Caraïbes', texte: 'Haïti, République Dominicaine et toutes destinations caribéennes' },
      { titre: 'Afrique', texte: "Les principaux ports d'Afrique francophone" },
      { titre: 'Amérique du Sud', texte: 'Principaux ports sud-américains, et autres destinations sur devis' },
    ],
  },
  demenagement: {
    eyebrow: 'Mutation en Outre-mer',
    titre: 'Déménagez',
    titreAccent: 'serein',
    titreFin: ", on s'occupe de tout.",
    texte:
      'Militaires, fonctionnaires, salariés et cadres du privé, départ en retraite ou retour au pays : nous gérons toutes les étapes pour un départ en toute sérénité vers votre nouvelle aventure.',
    points: [
      'Effets personnels, meubles, électroménagers',
      'Véhicules, motos, bateaux, jetskis, remorques',
      'Transport rapide, sécurisé et dédié',
    ],
    bouton: 'Infos et devis gratuit',
    boutonLien: '/devis',
    imageUrl: null as string | null,
    badgeValeur: '24–48 H',
    badgeTexte: 'réponse à votre demande de devis',
  },
  delais: {
    titre: 'Expédier aux quatre coins du',
    titreAccent: 'globe',
    texte:
      "Délais moyens d'acheminement par nos transporteurs maritimes partenaires, au départ du Havre ou de Fos/Marseille. Dates de départ et de clôture communiquées à chaque devis.",
    lienFaq: 'Tout savoir sur les délais',
    barres: [
      { destination: 'Antilles & Guyane', delai: '3–5 SEMAINES', pourcentage: 34, couleur: 'corail' },
      { destination: 'Caraïbes (Haïti, Rép. Dominicaine)', delai: '4–6 SEMAINES', pourcentage: 46, couleur: 'ciel' },
      { destination: 'Amérique du Nord', delai: 'SELON ROTATION', pourcentage: 58, couleur: 'ciel' },
      { destination: 'Amérique du Sud', delai: 'SELON ROTATION', pourcentage: 72, couleur: 'or' },
      { destination: 'Afrique & Océan indien', delai: 'SELON DESTINATION', pourcentage: 50, couleur: 'marine' },
    ],
  },
  conteneurs: {
    eyebrow: 'Vente de conteneurs maritimes',
    titre: 'Un conteneur « dernier voyage », mille',
    titreAccent: 'usages',
    texte:
      "Conteneurs d'occasion à prix compétitifs, formats 20 et 40 pieds. Idéal pour du stockage de marchandises ou la création d'espaces modulaires : foodtruck, paillotte de plage, base vie de chantier…",
    chips: ['20 PIEDS', '40 PIEDS', 'PRIX COMPÉTITIFS'],
    bouton: 'Demander un prix',
    boutonLien: '/contact',
    imageUrl: '/photos/conteneurs.jpg' as string | null,
  },
  faqCourte: {
    titre: 'Vos questions, nos',
    titreAccent: 'réponses',
    texte: "L'essentiel sur le transport longue distance ; pour le reste, consultez",
    lienTexte: 'toutes les questions fréquentes sur nos envois',
    bouton: 'Voir toutes les questions',
    items: [
      {
        question: 'Quels types de marchandises pouvez-vous expédier ?',
        reponse:
          'Une large gamme de marchandises, du colis personnel aux équipements professionnels : effets personnels, véhicules, palettes, groupage, conteneurs complets (FCL) ou partiels (LCL).',
      },
      {
        question: 'Quelle est la différence entre le groupage et le conteneur complet ?',
        reponse:
          'Groupage (LCL) : plusieurs clients dans un même conteneur, facturation au volume (mètre cube). Conteneur complet (FCL) : tout le conteneur est réservé à votre envoi.',
      },
      {
        question: 'Comment est calculé le prix en groupage maritime (LCL) ?',
        reponse:
          'Au volume (mètre cube) : additionnez la taille de chacun de vos colis (longueur × largeur × hauteur). Astuce : mesurez au point le plus large, comme les cartons bombés ou les palettes.',
      },
      {
        question: 'Comment suivre mon envoi ?',
        reponse:
          'Un suivi personnalisé est assuré par nos équipes, et vous pouvez suivre votre conteneur à tout moment depuis la page Suivi.',
      },
    ],
  },
  ctaSuivi: {
    eyebrow: "Suivi d'envoi",
    titre: "Suivez chaque conteneur, jusqu'au",
    titreAccent: 'lagon',
    texte:
      'Référence dossier ou numéro de conteneur : statut, position, navire et ETA. Une équipe joignable à tout moment.',
    boutonPrincipal: 'Suivre mon envoi',
    boutonSecondaire: "Parler à l'équipe",
    imageUrl: null as string | null,
  },
  seo: {
    titre: 'Transport maritime Outre-mer & international · HGWF Cargo',
    description:
      'Transport maritime, aérien et terrestre vers les Amériques, les Caraïbes et l’Afrique : groupage, conteneur complet, véhicules et déménagement Outre-mer.',
  },
};

// Version anglaise complète des contenus par défaut (le contenu Sanity EN prime).
const DEFAUT_EN = {
  hero: {
    titre: 'Shipping that carries your cargo',
    titreAccent: 'further',
    description:
      'Sea, air or road: from pick-up to delivery, we take care of every step so you can think about what comes next.',
    boutonPrincipal: 'Contact us',
    boutonPrincipalLien: '/devis',
    boutonSecondaire: 'Track a container',
    boutonSecondaireLien: '/suivi',
    badge: 'NORTH & SOUTH AMERICA · CARIBBEAN · AFRICA · FROM LE HAVRE & FOS/MARSEILLE',
    imageUrl: null as string | null,
  },
  services: [
    {
      titre: 'Groupage (LCL)',
      texte: 'Billed by cubic metre, ideal for individuals & SMEs',
      lien: '/devis',
      imageUrl: '/photos/groupage.jpg' as string | null,
    },
    {
      titre: 'Full container (FCL)',
      texte: "20' or 40', dry or reefer, reserved for your shipment",
      lien: '/devis',
      imageUrl: '/photos/conteneur-complet.jpg' as string | null,
    },
    {
      titre: 'Vehicles & boats',
      texte: 'Running or not, in container or ro-ro',
      lien: '/devis',
      imageUrl: '/photos/vehicules-bateaux.jpg' as string | null,
    },
    {
      titre: 'Removals',
      texte: 'Overseas relocation, retirement, return home',
      lien: '/#demenagement',
      imageUrl: null as string | null,
    },
    {
      titre: 'Container transport',
      texte: 'Port-to-port or door-to-door haulage',
      lien: '/devis',
      imageUrl: '/photos/transport-conteneur.jpg' as string | null,
    },
    {
      titre: 'Air freight',
      texte: 'The fast lane for your urgent shipments',
      lien: '/devis',
      imageUrl: '/photos/fret-aerien.jpg' as string | null,
    },
    {
      titre: 'Warehouse & storage boxes',
      texte: 'Storage space for rent, short or long term',
      lien: '/contact',
      imageUrl: '/photos/entrepot.jpg' as string | null,
    },
  ],
  promesse: {
    titre: 'Because your goods',
    titreAccent: 'matter',
    texte:
      'Whether you are a professional (trader, manufacturer) or an individual: we will find the best option for your goods, vehicles and personal effects.',
  },
  zones: {
    titre: 'Where we',
    titreAccent: 'deliver',
    badge: 'REGULAR & SECURE SERVICES',
    bouton: 'Get a free quote',
    boutonLien: '/devis',
    imageUrl: null as string | null,
    cartes: [
      {
        titre: 'North America',
        texte: 'United States and Canada, depending on rotation: contact us',
      },
      { titre: 'French Caribbean', texte: 'Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy' },
      { titre: 'French Guiana', texte: 'Dégrad des Cannes and inland deliveries' },
      { titre: 'Caribbean', texte: 'Haiti, Dominican Republic and all Caribbean destinations' },
      { titre: 'Africa', texte: 'The main ports of French-speaking Africa' },
      { titre: 'South America', texte: 'Main South American ports, other destinations on request' },
    ],
  },
  demenagement: {
    eyebrow: 'Overseas relocation',
    titre: 'Move with',
    titreAccent: 'peace of mind',
    titreFin: ', we handle everything.',
    texte:
      'Military and civil servants, private-sector employees and executives, retirement or return home: we manage every step for a serene departure towards your new adventure.',
    points: [
      'Personal effects, furniture, appliances',
      'Vehicles, motorbikes, boats, jet skis, trailers',
      'Fast, secure, dedicated transport',
    ],
    bouton: 'Info and free quote',
    boutonLien: '/devis',
    imageUrl: null as string | null,
    badgeValeur: '24–48 H',
    badgeTexte: 'reply to your quote request',
  },
  delais: {
    titre: 'Ship to the four corners of the',
    titreAccent: 'globe',
    texte:
      'Average transit times with our partner shipping lines, departing from Le Havre or Fos/Marseille. Departure and cut-off dates provided with every quote.',
    lienFaq: 'Everything about transit times',
    barres: [
      { destination: 'French Caribbean & Guiana', delai: '3–5 WEEKS', pourcentage: 34, couleur: 'corail' },
      { destination: 'Caribbean (Haiti, Dominican Rep.)', delai: '4–6 WEEKS', pourcentage: 46, couleur: 'ciel' },
      { destination: 'North America', delai: 'BY ROTATION', pourcentage: 58, couleur: 'ciel' },
      { destination: 'South America', delai: 'BY ROTATION', pourcentage: 72, couleur: 'or' },
      { destination: 'Africa & Indian Ocean', delai: 'BY DESTINATION', pourcentage: 50, couleur: 'marine' },
    ],
  },
  conteneurs: {
    eyebrow: 'Shipping containers for sale',
    titre: 'One « last voyage » container, a thousand',
    titreAccent: 'uses',
    texte:
      'Used containers at competitive prices, 20 and 40 foot formats. Ideal for storing goods or creating modular spaces: food truck, beach hut, site office…',
    chips: ['20 FEET', '40 FEET', 'COMPETITIVE PRICES'],
    bouton: 'Ask for a price',
    boutonLien: '/contact',
    imageUrl: '/photos/conteneurs.jpg' as string | null,
  },
  faqCourte: {
    titre: 'Your questions, our',
    titreAccent: 'answers',
    texte: 'The essentials of long-distance shipping; for everything else, read',
    lienTexte: 'all the frequently asked questions about shipping',
    bouton: 'See all the questions',
    items: [
      {
        question: 'What kinds of goods can you ship?',
        reponse:
          'A wide range of goods, from personal parcels to professional equipment: personal effects, vehicles, pallets, groupage, full (FCL) or shared (LCL) containers.',
      },
      {
        question: 'What is the difference between groupage and a full container?',
        reponse:
          'Groupage (LCL): several customers share one container, billed by volume (cubic metre). Full container (FCL): the whole container is reserved for your shipment.',
      },
      {
        question: 'How is the price calculated for sea groupage (LCL)?',
        reponse:
          'By volume (cubic metre): add up the size of each of your parcels (length × width × height). Tip: measure at the widest point, such as bulging boxes or pallets.',
      },
      {
        question: 'How do I track my shipment?',
        reponse:
          'Our teams provide personalised follow-up, and you can track your container at any time from the Tracking page.',
      },
    ],
  },
  ctaSuivi: {
    eyebrow: 'Shipment tracking',
    titre: 'Track every container, all the way to the',
    titreAccent: 'lagoon',
    texte:
      'File reference or container number: status, position, vessel and ETA. A team you can reach at any time.',
    boutonPrincipal: 'Track my shipment',
    boutonSecondaire: 'Talk to the team',
    imageUrl: null as string | null,
  },
  seo: {
    titre: 'Sea freight to the Caribbean, Americas & Africa · HGWF Cargo',
    description:
      'Sea, air and road freight to North & South America, the Caribbean and Africa: LCL groupage, full containers, vehicles and overseas removals.',
  },
};

const COULEURS_BARRES: Record<string, string> = {
  corail: 'bg-corail',
  ciel: 'bg-ciel',
  or: 'bg-or',
  marine: 'bg-marine',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const d = await getPageAccueil(locale);
  const DEFAUT_L = locale === 'en' ? DEFAUT_EN : DEFAUT;

  return {
    hero: {
      titre: d?.hero?.titre ?? DEFAUT_L.hero.titre,
      titreAccent: d?.hero?.titreAccent ?? DEFAUT_L.hero.titreAccent,
      description: d?.hero?.description ?? DEFAUT_L.hero.description,
      boutonPrincipal: d?.hero?.boutonPrincipal ?? DEFAUT_L.hero.boutonPrincipal,
      boutonPrincipalLien: d?.hero?.boutonPrincipalLien ?? DEFAUT_L.hero.boutonPrincipalLien,
      boutonSecondaire: d?.hero?.boutonSecondaire ?? DEFAUT_L.hero.boutonSecondaire,
      boutonSecondaireLien: d?.hero?.boutonSecondaireLien ?? DEFAUT_L.hero.boutonSecondaireLien,
      badge: d?.hero?.badge ?? DEFAUT_L.hero.badge,
      imageUrl: d?.hero?.imageUrl ?? DEFAUT_L.hero.imageUrl,
    },
    services: d?.services?.length
      ? d.services.map((s, i) => ({
          titre: s.titre ?? DEFAUT_L.services[i]?.titre ?? '',
          texte: s.texte ?? DEFAUT_L.services[i]?.texte ?? '',
          lien: s.lien ?? DEFAUT_L.services[i]?.lien ?? '/devis',
          // Images locales forcées (prioritaires sur Sanity) — voir DEFAUT_L.services.
          // À rebasculer sur Sanity (`s.imageUrl ?? …`) lors de la passe finale.
          imageUrl: DEFAUT_L.services[i]?.imageUrl ?? s.imageUrl ?? null,
        }))
      : DEFAUT_L.services,
    promesse: {
      titre: d?.promesse?.titre ?? DEFAUT_L.promesse.titre,
      titreAccent: d?.promesse?.titreAccent ?? DEFAUT_L.promesse.titreAccent,
      texte: d?.promesse?.texte ?? DEFAUT_L.promesse.texte,
    },
    zones: {
      titre: d?.zones?.titre ?? DEFAUT_L.zones.titre,
      titreAccent: d?.zones?.titreAccent ?? DEFAUT_L.zones.titreAccent,
      badge: d?.zones?.badge ?? DEFAUT_L.zones.badge,
      bouton: d?.zones?.bouton ?? DEFAUT_L.zones.bouton,
      boutonLien: d?.zones?.boutonLien ?? DEFAUT_L.zones.boutonLien,
      imageUrl: d?.zones?.imageUrl ?? DEFAUT_L.zones.imageUrl,
      cartes: d?.zones?.cartes?.length
        ? d.zones.cartes.map((c) => ({ titre: c.titre ?? '', texte: c.texte ?? '' }))
        : DEFAUT_L.zones.cartes,
    },
    demenagement: {
      eyebrow: d?.demenagement?.eyebrow ?? DEFAUT_L.demenagement.eyebrow,
      titre: d?.demenagement?.titre ?? DEFAUT_L.demenagement.titre,
      titreAccent: d?.demenagement?.titreAccent ?? DEFAUT_L.demenagement.titreAccent,
      titreFin: d?.demenagement?.titreFin ?? DEFAUT_L.demenagement.titreFin,
      texte: d?.demenagement?.texte ?? DEFAUT_L.demenagement.texte,
      points: d?.demenagement?.points?.length ? d.demenagement.points : DEFAUT_L.demenagement.points,
      bouton: d?.demenagement?.bouton ?? DEFAUT_L.demenagement.bouton,
      boutonLien: d?.demenagement?.boutonLien ?? DEFAUT_L.demenagement.boutonLien,
      imageUrl: d?.demenagement?.imageUrl ?? DEFAUT_L.demenagement.imageUrl,
      badgeValeur: d?.demenagement?.badgeValeur ?? DEFAUT_L.demenagement.badgeValeur,
      badgeTexte: d?.demenagement?.badgeTexte ?? DEFAUT_L.demenagement.badgeTexte,
    },
    delais: {
      titre: d?.delais?.titre ?? DEFAUT_L.delais.titre,
      titreAccent: d?.delais?.titreAccent ?? DEFAUT_L.delais.titreAccent,
      texte: d?.delais?.texte ?? DEFAUT_L.delais.texte,
      lienFaq: d?.delais?.lienFaq ?? DEFAUT_L.delais.lienFaq,
      barres: d?.delais?.barres?.length
        ? d.delais.barres.map((b) => ({
            destination: b.destination ?? '',
            delai: b.delai ?? '',
            pourcentage: b.pourcentage ?? 50,
            couleur: b.couleur ?? 'ciel',
          }))
        : DEFAUT_L.delais.barres,
    },
    conteneurs: {
      eyebrow: d?.conteneurs?.eyebrow ?? DEFAUT_L.conteneurs.eyebrow,
      titre: d?.conteneurs?.titre ?? DEFAUT_L.conteneurs.titre,
      titreAccent: d?.conteneurs?.titreAccent ?? DEFAUT_L.conteneurs.titreAccent,
      texte: d?.conteneurs?.texte ?? DEFAUT_L.conteneurs.texte,
      chips: d?.conteneurs?.chips?.length ? d.conteneurs.chips : DEFAUT_L.conteneurs.chips,
      bouton: d?.conteneurs?.bouton ?? DEFAUT_L.conteneurs.bouton,
      boutonLien: d?.conteneurs?.boutonLien ?? DEFAUT_L.conteneurs.boutonLien,
      // Image locale forcée (prioritaire sur Sanity) — voir DEFAUT_L.conteneurs.imageUrl.
      // À rebasculer sur Sanity (`d?.conteneurs?.imageUrl ?? …`) lors de la passe finale.
      imageUrl: DEFAUT_L.conteneurs.imageUrl,
    },
    faqCourte: {
      titre: d?.faqCourte?.titre ?? DEFAUT_L.faqCourte.titre,
      titreAccent: d?.faqCourte?.titreAccent ?? DEFAUT_L.faqCourte.titreAccent,
      texte: d?.faqCourte?.texte ?? DEFAUT_L.faqCourte.texte,
      lienTexte: d?.faqCourte?.lienTexte ?? DEFAUT_L.faqCourte.lienTexte,
      bouton: d?.faqCourte?.bouton ?? DEFAUT_L.faqCourte.bouton,
      items: d?.faqCourte?.items?.length
        ? d.faqCourte.items.map((i) => ({ question: i.question ?? '', reponse: i.reponse ?? '' }))
        : DEFAUT_L.faqCourte.items,
    },
    ctaSuivi: {
      eyebrow: d?.ctaSuivi?.eyebrow ?? DEFAUT_L.ctaSuivi.eyebrow,
      titre: d?.ctaSuivi?.titre ?? DEFAUT_L.ctaSuivi.titre,
      titreAccent: d?.ctaSuivi?.titreAccent ?? DEFAUT_L.ctaSuivi.titreAccent,
      texte: d?.ctaSuivi?.texte ?? DEFAUT_L.ctaSuivi.texte,
      boutonPrincipal: d?.ctaSuivi?.boutonPrincipal ?? DEFAUT_L.ctaSuivi.boutonPrincipal,
      boutonSecondaire: d?.ctaSuivi?.boutonSecondaire ?? DEFAUT_L.ctaSuivi.boutonSecondaire,
      imageUrl: d?.ctaSuivi?.imageUrl ?? DEFAUT_L.ctaSuivi.imageUrl,
    },
    seo: {
      // Titre local forcé (prioritaire sur Sanity) — voir DEFAUT_L.seo.titre.
      titre: DEFAUT_L.seo.titre,
      description: d?.seoDescription ?? DEFAUT_L.seo.description,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const { seo } = await getContenu(l);
  return metadonneesPage({ locale: l, chemin: '', titre: seo.titre, description: seo.description });
}

function FlecheDroite({ taille = 14 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Coche() {
  return (
    <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-corail/14">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#b44224" strokeWidth="3" aria-hidden="true">
        <path d="M4 12l5 5L20 6" />
      </svg>
    </span>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const contenu = await getContenu(resolveLocale(locale));
  const { hero, services, promesse, zones, demenagement, delais, conteneurs, faqCourte, ctaSuivi } = contenu;

  return (
    <main>
      {/* Hero plein écran */}
      <header>
        <div className="hero-photo hero-photo-vivant relative flex min-h-[560px] flex-col overflow-hidden bg-marine sm:min-h-[680px]">
          {hero.imageUrl && (
            <Image src={hero.imageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
          )}
          <span
            className="pointer-events-none absolute inset-0 bg-linear-92 from-marine/88 from-0% via-marine/58 via-46% to-marine/30 to-100%"
            aria-hidden="true"
          />
          <HouleAnimee />
          <div className="hero-entree relative z-[2] flex max-w-[800px] flex-1 flex-col justify-center gap-5 px-5 py-28 sm:gap-6 sm:px-8 sm:py-[120px] md:px-[72px]">
            <h1 className="m-0 text-[clamp(2.1rem,8.5vw,3.375rem)] leading-[1.06] font-bold tracking-[-0.035em] text-creme">
              {hero.titre} <span className="text-or">{hero.titreAccent}</span>
              <span className="text-corail">.</span>
            </h1>
            <p className="m-0 max-w-[44ch] text-[15px] leading-[1.55] text-creme/88 sm:text-[17px]">{hero.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
              <Link
                href={hero.boutonPrincipalLien}
                className="presse inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-corail px-[30px] py-3.5 text-[15px] font-medium text-marine hover:bg-or sm:w-auto"
              >
                {hero.boutonPrincipal}
                <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-creme/25">
                  <FlecheDroite taille={12} />
                </span>
              </Link>
              <Link
                href={hero.boutonSecondaireLien}
                className="presse w-full rounded-full border-[1.5px] border-creme/50 px-[30px] py-3.5 text-center text-[15px] font-medium text-creme hover:bg-creme/12 sm:w-auto"
              >
                {hero.boutonSecondaire}
              </Link>
            </div>
            <span className="self-start rounded-full bg-marine/55 px-4 py-2 font-mono text-xs tracking-[0.05em] text-creme backdrop-blur-xs">
              {hero.badge}
            </span>
          </div>
        </div>
      </header>

      {/* Cartes services */}
      <section id="services" className="relative z-[4] mx-auto -mt-22 max-w-[1200px] px-5 sm:px-8">
        {/* 7 cartes : rangée de 4 puis rangée de 3 étirée sur toute la largeur,
            pour éviter le trou en bout de seconde rangée. Sur tablette, la
            dernière carte s'élargit pour ne pas rester orpheline. */}
        <div className="revele-cascade grid grid-cols-1 gap-[18px] sm:grid-cols-2 sm:[&>a:last-child]:col-span-2 lg:grid-cols-12 lg:[&>a]:col-span-3 lg:[&>a:nth-child(n+5)]:col-span-4 lg:[&>a:last-child]:col-span-4">
          {services.map((s) => (
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

      {/* Promesse */}
      <section className="revele mx-auto max-w-[820px] px-5 sm:px-8 pt-16 sm:pt-24 text-center">
        <h2 className="m-0 text-[32px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[42px]">
          {promesse.titre} <span className="text-corail-texte">{promesse.titreAccent}</span>.
        </h2>
        <p className="mx-auto mt-[18px] mb-0 max-w-[58ch] text-base leading-[1.55] text-encre-douce">
          {promesse.texte}
        </p>
      </section>

      {/* Zones */}
      <section id="zones" className="mx-auto mt-14 max-w-[1200px] px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-marine px-5 sm:px-8 py-16 md:px-14">
          {zones.imageUrl && (
            <Image src={zones.imageUrl} alt="" fill sizes="100vw" className="object-cover" />
          )}
          <span className="absolute inset-0 bg-marine/55" aria-hidden="true" />
          <div className="relative z-[2] flex flex-col gap-8">
            <div className="revele flex flex-wrap items-baseline justify-between gap-6">
              <h2 className="m-0 text-3xl font-bold tracking-[-0.03em] text-creme md:text-[38px]">
                {zones.titre} <span className="text-or">{zones.titreAccent}</span>.
              </h2>
              <span className="rounded-full bg-marine/55 px-4 py-2 font-mono text-xs tracking-[0.05em] text-creme backdrop-blur-xs">
                {zones.badge}
              </span>
            </div>
            <div className="revele-cascade grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {zones.cartes.map((z) => (
                <div
                  key={z.titre}
                  className="carte-zone flex flex-col gap-2 rounded-[18px] border border-creme/30 bg-creme/14 p-[22px] text-creme backdrop-blur-lg"
                >
                  <span className="text-[17px] font-bold">{z.titre}</span>
                  <span className="text-[13px] leading-normal opacity-90">{z.texte}</span>
                </div>
              ))}
            </div>
            <div className="revele flex justify-center">
              <Link
                href={zones.boutonLien}
                className="presse rounded-full bg-corail px-[30px] py-[13px] text-[15px] font-medium text-marine hover:bg-or"
              >
                {zones.bouton}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Déménagement */}
      <section id="demenagement" className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div className="revele flex flex-col gap-[18px]">
            <span className="text-xs font-medium tracking-[0.32em] text-corail-texte uppercase">
              {demenagement.eyebrow}
            </span>
            <h2 className="m-0 text-[32px] leading-[1.08] font-bold tracking-[-0.03em] md:text-[40px]">
              {demenagement.titre} <span className="text-corail-texte">{demenagement.titreAccent}</span>
              {demenagement.titreFin}
            </h2>
            <p className="m-0 text-[15px] leading-[1.6] text-encre-douce">{demenagement.texte}</p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
              {demenagement.points.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <Coche />
                  {p}
                </li>
              ))}
            </ul>
            <Link
              href={demenagement.boutonLien}
              className="presse self-start rounded-full bg-corail px-[30px] py-3.5 text-[15px] font-medium text-marine hover:bg-or"
            >
              {demenagement.bouton}
            </Link>
          </div>
          <div className="revele-image relative h-[420px] min-w-0 overflow-hidden rounded-[28px] bg-marine">
            {demenagement.imageUrl && (
              <Image src={demenagement.imageUrl} alt={demenagement.eyebrow} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            )}
            <span className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-0.5 rounded-[14px] bg-marine/85 px-[18px] py-3 text-creme backdrop-blur-xs">
              <span className="font-mono text-lg text-or">{demenagement.badgeValeur}</span>
              <span className="text-xs opacity-85">{demenagement.badgeTexte}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Délais */}
      <section className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.3fr]">
          <div className="revele flex flex-col gap-4">
            <h2 className="m-0 text-[32px] leading-[1.08] font-bold tracking-[-0.03em] md:text-[40px]">
              {delais.titre} <span className="text-corail-texte">{delais.titreAccent}</span>.
            </h2>
            <p className="m-0 text-[15px] leading-[1.6] text-encre-douce">{delais.texte}</p>
            <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-medium text-corail-texte transition hover:text-marine">
              {delais.lienFaq}
              <FlecheDroite />
            </Link>
            {/* Le réseau en vrai : globe interactif (glisser pour tourner), ports
                de départ en or, destinations en ciel, routes maritimes en arc. */}
            <GlobeDestinations
              className="mt-2 max-w-[340px] self-center lg:self-start"
              label={
                locale === 'en'
                  ? 'Interactive globe of served destinations: departure ports in gold, destinations in blue, maritime routes drawn as arcs'
                  : 'Globe interactif des destinations desservies : ports de départ en or, destinations en bleu, routes maritimes en arc'
              }
            />
          </div>
          <div className="revele flex flex-col gap-4">
            {delais.barres.map((b) => (
              <div key={b.destination} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium">{b.destination}</span>
                  <span className="font-mono text-encre-douce">{b.delai}</span>
                </div>
                <div className="h-2.5 rounded-full border border-marine/10 bg-creme">
                  <div
                    className={`barre-delai h-full rounded-full ${COULEURS_BARRES[b.couleur] ?? 'bg-ciel'}`}
                    style={{ width: `${b.pourcentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conteneurs */}
      <section className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 sm:pt-24">
        <div className="grid items-stretch overflow-hidden rounded-[36px] border border-marine/12 bg-creme lg:grid-cols-[1.1fr_1fr]">
          <div className="revele-image relative min-h-[280px] min-w-0 bg-marine lg:min-h-[440px]">
            {conteneurs.imageUrl && (
              <Image src={conteneurs.imageUrl} alt="Conteneurs maritimes 20 et 40 pieds empilés sur un terminal portuaire" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            )}
          </div>
          <div className="revele flex flex-col gap-4 p-8 md:p-14">
            <span className="text-xs font-medium tracking-[0.32em] text-corail-texte uppercase">
              {conteneurs.eyebrow}
            </span>
            <h2 className="m-0 text-[30px] leading-[1.1] font-bold tracking-[-0.02em] md:text-4xl">
              {conteneurs.titre} <span className="text-corail-texte">{conteneurs.titreAccent}</span>.
            </h2>
            <p className="m-0 text-[15px] leading-[1.6] text-encre-douce">{conteneurs.texte}</p>
            <div className="flex flex-wrap gap-2.5">
              {conteneurs.chips.map((chip) => (
                <span key={chip} className="rounded-full border border-marine/14 bg-ivoire px-3.5 py-1.5 font-mono text-xs">
                  {chip}
                </span>
              ))}
            </div>
            <Link
              href={conteneurs.boutonLien}
              className="presse self-start rounded-full border-[1.5px] border-marine px-7 py-[13px] text-[15px] font-medium text-marine hover:bg-marine hover:text-creme"
            >
              {conteneurs.bouton}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ courte */}
      <section id="faq" className="mx-auto max-w-[860px] px-5 sm:px-8 pt-16 sm:pt-24">
        <div className="revele flex flex-col gap-3 text-center">
          <h2 className="m-0 text-3xl font-bold tracking-[-0.03em] md:text-[38px]">
            {faqCourte.titre} <span className="text-corail-texte">{faqCourte.titreAccent}</span>.
          </h2>
          <p className="m-0 text-[15px] text-encre-douce">
            {faqCourte.texte}{' '}
            <Link href="/faq" className="font-medium underline">
              {faqCourte.lienTexte}
            </Link>
            .
          </p>
        </div>
        <div className="revele-cascade mt-8 flex flex-col">
          {faqCourte.items.map((item) => (
            <details key={item.question} className="group border-t border-marine/14 px-1 py-[18px] last:border-b">
              <summary className="flex cursor-pointer list-none justify-between gap-4 text-base font-bold transition-colors duration-200 hover:text-corail-texte [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="font-normal text-corail-texte transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 mb-0 text-sm leading-[1.6] text-encre-douce">{item.reponse}</p>
            </details>
          ))}
        </div>
        <div className="revele mt-7 flex justify-center">
          <Link
            href="/faq"
            className="presse inline-flex items-center gap-2 rounded-full border-[1.5px] border-marine px-[26px] py-3 text-sm font-medium text-marine hover:bg-marine hover:text-creme"
          >
            {faqCourte.bouton}
            <FlecheDroite taille={15} />
          </Link>
        </div>
      </section>

      {/* Bandeau suivi */}
      <section className="pt-24">
        <div className="relative overflow-hidden bg-marine px-5 sm:px-8 py-16 sm:py-22 md:px-[72px]">
          {ctaSuivi.imageUrl && (
            <Image src={ctaSuivi.imageUrl} alt="" fill sizes="100vw" className="object-cover" />
          )}
          <span
            className="absolute inset-0 bg-linear-180 from-marine/85 from-0% via-marine/70 via-50% to-marine/90 to-100%"
            aria-hidden="true"
          />
          <div className="revele relative z-[2] mx-auto flex max-w-[580px] flex-col items-center gap-[18px] text-center">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{ctaSuivi.eyebrow}</span>
            <h2 className="m-0 text-3xl leading-[1.08] font-bold tracking-[-0.03em] text-creme md:text-[38px]">
              {ctaSuivi.titre} <span className="text-or">{ctaSuivi.titreAccent}</span>.
            </h2>
            <p className="m-0 text-[15px] leading-[1.55] text-creme/88">{ctaSuivi.texte}</p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <Link
                href="/suivi"
                className="presse rounded-full bg-corail px-[30px] py-3.5 text-[15px] font-medium text-marine hover:bg-or"
              >
                {ctaSuivi.boutonPrincipal}
              </Link>
              <Link
                href="/contact"
                className="presse rounded-full border-[1.5px] border-creme/50 px-[30px] py-3.5 text-[15px] font-medium text-creme hover:bg-creme/12"
              >
                {ctaSuivi.boutonSecondaire}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
