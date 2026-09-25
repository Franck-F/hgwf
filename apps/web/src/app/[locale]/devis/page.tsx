import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageDevis, getSiteSettings } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { FaqCiblee } from '@/components/FaqCiblee';
import { FAQ_CIBLEES } from '@/content/faqCiblees';
import { DevisWizard, type DevisWizardContent } from '@/components/devis/DevisWizard';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie de la maquette Demande de devis.dc.html (Claude Design).
const HERO_DEFAUT = {
  eyebrow: 'Devis gratuit · Réponse sous 24–48 h',
  titre: 'Votre devis en 4',
  titreAccent: 'étapes',
  description:
    "Type d'envoi, destination, volume, coordonnées : l'équipe vous répond avec un prix personnalisé et les prochaines dates de départ.",
  imageUrl: null as string | null,
};

const WIZARD_DEFAUT = {
  etapeLabels: ['Service', 'Destination', 'Volume', 'Coordonnées'],
  etapeType: { titre: 'De quel service avez-vous besoin ?' },
  etapeDestination: {
    titre: 'Vers où expédiez-vous ?',
    libelleDestination: 'Destination',
    libelleDepart: 'Port de départ',
    libelleDelai: 'DÉLAI MOYEN',
  },
  etapeVolume: {
    titre: 'Estimez votre volume.',
    texte:
      'Mesurez chaque colis au point le plus large, en centimètres (cm). Le groupage est facturé au mètre cube (m³).',
    boutonAjouter: '+ Ajouter un colis',
    legendeDims: 'Longueur × largeur × hauteur en cm, puis quantité',
    commentaireLabel: 'Commentaires sur vos colis (facultatif)',
    commentairePlaceholder: 'Nature des biens, poids approximatif, fragile, véhicule…',
  },
  etapeCoordonnees: {
    titre: 'Vos coordonnées.',
    placeholderNom: 'Nom et prénom',
    placeholderEmail: 'E-mail',
    placeholderTel: 'Téléphone / WhatsApp',
    placeholderMessage: 'Précisions : nature des biens, véhicule, dates souhaitées…',
    preferenceLabel: 'Comment souhaitez-vous être contacté ?',
    preferences: ['E-mail', 'Téléphone', 'WhatsApp'],
  },
  recap: {
    titre: 'Votre envoi',
    libelleType: 'Type',
    libelleDestination: 'Destination',
    libelleDepart: 'Départ',
    libelleVolume: 'Volume estimé',
  },
  confirmation: {
    titre: 'Demande envoyée.',
    texte:
      "Merci {nom}, votre demande est entre les mains de l'équipe. Un délai moyen de 24 à 48 h est nécessaire pour vous répondre. Votre référence :",
    boutonContact: "Parler à l'équipe",
    boutonAccueil: "Retour à l'accueil",
  },
  boutons: { precedent: '← Précédent', suivant: 'Suivant →', envoyer: 'Envoyer la demande' },
  typesEnvoi: [
    { label: 'Groupage (LCL)', description: 'Cartons, palettes, effets personnels : facturé au mètre cube.' },
    { label: 'Conteneur complet (FCL)', description: "Un conteneur 20' ou 40' réservé à votre envoi, dry ou reefer." },
    { label: 'Véhicule / bateau', description: 'Voiture, moto, bateau, jetski, remorque : conteneur ou ro-ro.' },
    { label: 'Déménagement', description: 'Mutation Outre-mer, retraite, retour au pays : tout votre foyer.' },
    { label: 'Transport de conteneur', description: 'Acheminement de votre conteneur, port à port ou porte à porte.' },
    { label: 'Fret aérien', description: 'Vos envois urgents par avion, délais raccourcis.' },
    { label: 'Entrepôt & box de stockage', description: 'Location d’espaces de stockage, courte ou longue durée.' },
  ],
  destinations: [
    { nom: 'Guadeloupe', delai: '3 À 5 SEMAINES' },
    { nom: 'Martinique', delai: '3 À 5 SEMAINES' },
    { nom: 'Guyane', delai: '3 À 5 SEMAINES' },
    { nom: 'Saint-Martin / Saint-Barthélemy', delai: '3 À 5 SEMAINES' },
    { nom: 'Haïti', delai: '4 À 6 SEMAINES' },
    { nom: 'République Dominicaine', delai: '4 À 6 SEMAINES' },
    { nom: 'États-Unis / Canada', delai: 'SELON ROTATION, NOUS CONSULTER' },
    { nom: 'Amérique du Sud', delai: 'SELON ROTATION, NOUS CONSULTER' },
    { nom: 'Afrique francophone', delai: 'VARIABLE SELON DESTINATION' },
    { nom: 'Autre destination', delai: 'NOUS CONSULTER' },
  ],
  portsDepart: ['Le Havre', 'Fos / Marseille', 'Enlèvement à domicile', 'Dépôt à Rosny-sous-Bois'],
};

// Mention RGPD : ni Sanity ni WIZARD_DEFAUT ne sont localisés par langue (le
// CMS ne connaît pas ce champ), donc on choisit la traduction ici même, à
// partir de la locale de la page — même principe que contenuLegal() pour les
// pages légales.
const MENTION_RGPD_FR = {
  texte:
    'Les informations recueillies servent uniquement à traiter votre demande de devis. Elles sont conservées trois ans et ne sont jamais cédées. Vous disposez d’un droit d’accès, de rectification et d’effacement ; voir notre',
  lienLibelle: 'politique de confidentialité',
};

const MENTION_RGPD_EN = {
  texte:
    'The information collected is used only to process your quote request. It is kept for three years and is never shared with third parties. You have a right of access, rectification and erasure; see our',
  lienLibelle: 'privacy policy',
};

const REASSURANCE_DEFAUT = [
  {
    valeur: '24–48 H',
    titre: 'Réponse rapide',
    texte: 'Chaque demande est traitée avec attention : prix personnalisé et prochaines dates de départ.',
  },
  {
    valeur: 'AU M³',
    titre: 'Prix au volume',
    texte: 'En groupage, vous ne payez que le volume que vous occupez dans le conteneur.',
  },
  {
    valeur: '0 €',
    titre: 'Devis gratuit',
    texte: "Sans engagement : l'équipe vous aide aussi à constituer le dossier douane complet.",
  },
];

const COULEURS_REASSURANCE = ['text-corail', 'text-ciel', 'text-or'];

// Noms accessibles des champs de dimensions (étape 3) et message de
// validation — même règle que l'API : un nom et un moyen de contact.
const DIMS_ARIA_FR = {
  longueur: 'Longueur (cm)',
  largeur: 'Largeur (cm)',
  hauteur: 'Hauteur (cm)',
  quantite: 'Quantité',
};
const DIMS_ARIA_EN = {
  longueur: 'Length (cm)',
  largeur: 'Width (cm)',
  hauteur: 'Height (cm)',
  quantite: 'Quantity',
};
const ERREUR_CONTACT_FR =
  'Indiquez au moins un moyen de contact (e-mail ou téléphone) pour recevoir votre devis.';
const ERREUR_CONTACT_EN =
  'Please provide at least one way to contact you (email or phone) to receive your quote.';
const ERREUR_NOM_FR = 'Indiquez votre nom : l’équipe saura à qui répondre.';
const ERREUR_NOM_EN = 'Please enter your name so the team knows who to reply to.';

// ── Étape volume, mode simple : estimation par presets. Ces textes ne sont pas
// dans le CMS (comme legendeDims ou les préférences) : traduits ici, par locale.
const PRESETS_VOLUME_FR = [
  { label: 'Quelques cartons', estimation: '≈ 1–3 m³', description: 'Cartons, valises, petits objets.' },
  { label: 'Studio / T1', estimation: '≈ 5–10 m³', description: 'L’essentiel d’un petit logement.' },
  { label: 'T2 – T3', estimation: '≈ 10–20 m³', description: 'Meubles et cartons d’un logement familial.' },
  { label: 'Maison entière', estimation: '≈ 20–40 m³', description: 'Tout le foyer, de la cave au grenier.' },
  { label: 'Véhicule', estimation: '', description: 'Voiture, moto, bateau : chiffré selon le modèle.' },
  { label: 'Je ne sais pas encore', estimation: '', description: 'Pas de souci : l’équipe estime avec vous, par téléphone ou WhatsApp.' },
];
const PRESETS_VOLUME_EN = [
  { label: 'A few boxes', estimation: '≈ 1–3 m³', description: 'Boxes, suitcases, small items.' },
  { label: 'Studio / 1-bedroom', estimation: '≈ 5–10 m³', description: 'The essentials of a small home.' },
  { label: '2–3 bedrooms', estimation: '≈ 10–20 m³', description: 'Furniture and boxes of a family home.' },
  { label: 'Whole house', estimation: '≈ 20–40 m³', description: 'The entire household, top to bottom.' },
  { label: 'Vehicle', estimation: '', description: 'Car, motorbike or boat: priced by model.' },
  { label: 'Not sure yet', estimation: '', description: 'No problem: the team will estimate it with you by phone or WhatsApp.' },
];

// Micro-textes du parcours (fil d'étapes, bascule simple/précis, champs) —
// même principe : hors CMS, choisis par locale.
const TEXTES_WIZARD_FR = {
  etapeSur: 'Étape {n} sur {total}',
  lienModePrecis: 'J’ai mes dimensions exactes →',
  lienModeSimple: '← Revenir à l’estimation rapide',
  erreurPreset: 'Choisissez l’option la plus proche — « Je ne sais pas encore » convient très bien.',
  totalLabel: 'Total',
  intro: 'Il ne nous faut que votre nom et un moyen de vous joindre — l’équipe vous répond sous 24 à 48 h.',
  exempleNom: 'Camille Martin',
  exempleEmail: 'vous@exemple.fr',
  exempleTel: '06 12 34 56 78',
  requis: 'requis',
  unDesDeux: 'au moins l’un des deux',
  optionnel: 'facultatif',
  envoiEnCours: 'Envoi en cours…',
};
const TEXTES_WIZARD_EN = {
  etapeSur: 'Step {n} of {total}',
  lienModePrecis: 'I have exact dimensions →',
  lienModeSimple: '← Back to quick estimate',
  erreurPreset: 'Pick the closest option — “Not sure yet” is perfectly fine.',
  totalLabel: 'Total',
  intro: 'We only need your name and one way to reach you — the team replies within 24–48 hours.',
  exempleNom: 'Alex Martin',
  exempleEmail: 'you@example.com',
  exempleTel: '+33 6 12 34 56 78',
  requis: 'required',
  unDesDeux: 'at least one of the two',
  optionnel: 'optional',
  envoiEnCours: 'Sending…',
};

const SEO_DEFAUT = {
  titre: 'Devis transport maritime & déménagement gratuit · HGWF Cargo',
  description:
    'Obtenez un devis gratuit en 4 étapes : type d’envoi, destination, volume estimé et coordonnées. Réponse personnalisée sous 24 à 48 h.',
};

// Version anglaise des contenus par défaut (le contenu Sanity EN prime).
const HERO_EN = {
  eyebrow: 'Free quote · Reply within 24–48 h',
  titre: 'Your quote in 4',
  titreAccent: 'steps',
  description:
    'Shipment type, destination, volume, contact details: the team replies with a personalised price and the next departure dates.',
  imageUrl: null as string | null,
};

const WIZARD_EN = {
  etapeLabels: ['Service', 'Destination', 'Volume', 'Contact details'],
  etapeType: { titre: 'Which service do you need?' },
  etapeDestination: {
    titre: 'Where are you shipping to?',
    libelleDestination: 'Destination',
    libelleDepart: 'Port of departure',
    libelleDelai: 'AVERAGE TRANSIT TIME',
  },
  etapeVolume: {
    titre: 'Estimate your volume.',
    texte:
      'Measure each parcel at its widest point, in centimetres (cm). Groupage is billed by cubic metre (m³).',
    boutonAjouter: '+ Add a parcel',
    legendeDims: 'Length × width × height in cm, then quantity',
    commentaireLabel: 'Comments about your parcels (optional)',
    commentairePlaceholder: 'Nature of the goods, approximate weight, fragile, vehicle…',
  },
  etapeCoordonnees: {
    titre: 'Your contact details.',
    placeholderNom: 'Full name',
    placeholderEmail: 'Email',
    placeholderTel: 'Phone / WhatsApp',
    placeholderMessage: 'Details: nature of the goods, vehicle, preferred dates…',
    preferenceLabel: 'How would you like to be contacted?',
    preferences: ['Email', 'Phone', 'WhatsApp'],
  },
  recap: {
    titre: 'Your shipment',
    libelleType: 'Type',
    libelleDestination: 'Destination',
    libelleDepart: 'Departure',
    libelleVolume: 'Estimated volume',
  },
  confirmation: {
    titre: 'Request sent.',
    texte:
      'Thank you {nom}, your request is in the team’s hands. Replies usually take 24 to 48 hours. Your reference:',
    boutonContact: 'Talk to the team',
    boutonAccueil: 'Back to home',
  },
  boutons: { precedent: '← Previous', suivant: 'Next →', envoyer: 'Send the request' },
  typesEnvoi: [
    { label: 'Groupage (LCL)', description: 'Boxes, pallets, personal effects: billed by cubic metre.' },
    { label: 'Full container (FCL)', description: "A 20' or 40' container reserved for your shipment, dry or reefer." },
    { label: 'Vehicle / boat', description: 'Car, motorbike, boat, jet ski, trailer: container or ro-ro.' },
    { label: 'Removal', description: 'Overseas relocation, retirement, return home: your whole household.' },
    { label: 'Container transport', description: 'Haulage of your container, port-to-port or door-to-door.' },
    { label: 'Air freight', description: 'Your urgent shipments by plane, shorter transit times.' },
    { label: 'Warehouse & storage boxes', description: 'Storage space rental, short or long term.' },
  ],
  destinations: [
    { nom: 'Guadeloupe', delai: '3 TO 5 WEEKS' },
    { nom: 'Martinique', delai: '3 TO 5 WEEKS' },
    { nom: 'French Guiana', delai: '3 TO 5 WEEKS' },
    { nom: 'Saint-Martin / Saint-Barthélemy', delai: '3 TO 5 WEEKS' },
    { nom: 'Haiti', delai: '4 TO 6 WEEKS' },
    { nom: 'Dominican Republic', delai: '4 TO 6 WEEKS' },
    { nom: 'United States / Canada', delai: 'DEPENDING ON ROTATION, CONTACT US' },
    { nom: 'South America', delai: 'DEPENDING ON ROTATION, CONTACT US' },
    { nom: 'French-speaking Africa', delai: 'VARIES BY DESTINATION' },
    { nom: 'Other destination', delai: 'CONTACT US' },
  ],
  portsDepart: ['Le Havre', 'Fos / Marseille', 'Home pick-up', 'Drop-off in Rosny-sous-Bois'],
};

const REASSURANCE_EN = [
  {
    valeur: '24–48 H',
    titre: 'Fast reply',
    texte: 'Every request is handled with care: personalised price and the next departure dates.',
  },
  {
    valeur: 'PER M³',
    titre: 'Volume-based price',
    texte: 'With groupage, you only pay for the space you use in the container.',
  },
  {
    valeur: '€0',
    titre: 'Free quote',
    texte: 'No commitment: the team also helps you put together the full customs file.',
  },
];

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const [data, settings] = await Promise.all([getPageDevis(locale), getSiteSettings()]);

  const enL = locale === 'en';
  const HERO_D = enL ? HERO_EN : HERO_DEFAUT;
  const WIZ_D = enL ? WIZARD_EN : WIZARD_DEFAUT;

  const hero = {
    eyebrow: data?.hero?.eyebrow ?? HERO_D.eyebrow,
    titre: data?.hero?.titre ?? HERO_D.titre,
    titreAccent: data?.hero?.titreAccent ?? HERO_D.titreAccent,
    description: data?.hero?.description ?? HERO_D.description,
    imageUrl: data?.hero?.imageUrl ?? HERO_D.imageUrl,
  };

  const textes = locale === 'en' ? TEXTES_WIZARD_EN : TEXTES_WIZARD_FR;

  const wizard: DevisWizardContent = {
    etapeLabels: data?.etapeLabels?.length === 4 ? data.etapeLabels : WIZ_D.etapeLabels,
    etapeSur: textes.etapeSur,
    etapeType: { titre: data?.etapeType?.titre ?? WIZ_D.etapeType.titre },
    etapeDestination: {
      titre: data?.etapeDestination?.titre ?? WIZ_D.etapeDestination.titre,
      libelleDestination:
        data?.etapeDestination?.libelleDestination ?? WIZ_D.etapeDestination.libelleDestination,
      libelleDepart: data?.etapeDestination?.libelleDepart ?? WIZ_D.etapeDestination.libelleDepart,
      libelleDelai: data?.etapeDestination?.libelleDelai ?? WIZ_D.etapeDestination.libelleDelai,
    },
    etapeVolume: {
      titre: data?.etapeVolume?.titre ?? WIZ_D.etapeVolume.titre,
      texte: data?.etapeVolume?.texte ?? WIZ_D.etapeVolume.texte,
      boutonAjouter: data?.etapeVolume?.boutonAjouter ?? WIZ_D.etapeVolume.boutonAjouter,
      // Champs absents du CMS : traduits ici même, selon la locale de la page.
      legendeDims:
        locale === 'en' ? 'Length × width × height in cm, then quantity' : WIZ_D.etapeVolume.legendeDims,
      commentaireLabel:
        locale === 'en' ? 'Comments about your parcels (optional)' : WIZ_D.etapeVolume.commentaireLabel,
      commentairePlaceholder:
        locale === 'en'
          ? 'Nature of the goods, approximate weight, fragile, vehicle…'
          : WIZ_D.etapeVolume.commentairePlaceholder,
      lienModePrecis: textes.lienModePrecis,
      lienModeSimple: textes.lienModeSimple,
      presets: locale === 'en' ? PRESETS_VOLUME_EN : PRESETS_VOLUME_FR,
      erreurPreset: textes.erreurPreset,
      totalLabel: textes.totalLabel,
    },
    etapeCoordonnees: {
      titre: data?.etapeCoordonnees?.titre ?? WIZ_D.etapeCoordonnees.titre,
      intro: textes.intro,
      exempleNom: textes.exempleNom,
      exempleEmail: textes.exempleEmail,
      exempleTel: textes.exempleTel,
      requis: textes.requis,
      unDesDeux: textes.unDesDeux,
      optionnel: textes.optionnel,
      placeholderNom: data?.etapeCoordonnees?.placeholderNom ?? WIZ_D.etapeCoordonnees.placeholderNom,
      placeholderEmail: data?.etapeCoordonnees?.placeholderEmail ?? WIZ_D.etapeCoordonnees.placeholderEmail,
      placeholderTel: data?.etapeCoordonnees?.placeholderTel ?? WIZ_D.etapeCoordonnees.placeholderTel,
      placeholderMessage:
        data?.etapeCoordonnees?.placeholderMessage ?? WIZ_D.etapeCoordonnees.placeholderMessage,
      preferenceLabel:
        locale === 'en' ? 'How would you like to be contacted?' : WIZ_D.etapeCoordonnees.preferenceLabel,
      preferences:
        locale === 'en' ? ['Email', 'Phone', 'WhatsApp'] : WIZ_D.etapeCoordonnees.preferences,
    },
    recap: {
      titre: data?.recap?.titre ?? WIZ_D.recap.titre,
      libelleType: data?.recap?.libelleType ?? WIZ_D.recap.libelleType,
      libelleDestination: data?.recap?.libelleDestination ?? WIZ_D.recap.libelleDestination,
      libelleDepart: data?.recap?.libelleDepart ?? WIZ_D.recap.libelleDepart,
      libelleVolume: data?.recap?.libelleVolume ?? WIZ_D.recap.libelleVolume,
    },
    confirmation: {
      titre: data?.confirmation?.titre ?? WIZ_D.confirmation.titre,
      texte: data?.confirmation?.texte ?? WIZ_D.confirmation.texte,
      boutonContact: data?.confirmation?.boutonContact ?? WIZ_D.confirmation.boutonContact,
      boutonAccueil: data?.confirmation?.boutonAccueil ?? WIZ_D.confirmation.boutonAccueil,
    },
    boutons: {
      precedent: data?.boutons?.precedent ?? WIZ_D.boutons.precedent,
      suivant: data?.boutons?.suivant ?? WIZ_D.boutons.suivant,
      envoyer: data?.boutons?.envoyer ?? WIZ_D.boutons.envoyer,
      envoiEnCours: textes.envoiEnCours,
    },
    typesEnvoi: data?.typesEnvoi?.length
      ? data.typesEnvoi.map((t) => ({ label: t.label ?? '', description: t.description ?? '' }))
      : WIZ_D.typesEnvoi,
    destinations: data?.destinations?.length
      ? data.destinations.map((d) => ({ nom: d.nom ?? '', delai: d.delai ?? '…' }))
      : WIZ_D.destinations,
    portsDepart: data?.portsDepart?.length ? data.portsDepart : WIZ_D.portsDepart,
    imagesEtapes: data?.imagesEtapesUrls?.length ? data.imagesEtapesUrls : [null, null, null, null],
    emailDestinataire: settings?.email ?? 'contact@hgwf-cargo.fr',
    sujetEmail: 'Demande de devis',
    mentionRgpd: locale === 'en' ? MENTION_RGPD_EN : MENTION_RGPD_FR,
    dimsAria: locale === 'en' ? DIMS_ARIA_EN : DIMS_ARIA_FR,
    erreurNom: locale === 'en' ? ERREUR_NOM_EN : ERREUR_NOM_FR,
    erreurContact: locale === 'en' ? ERREUR_CONTACT_EN : ERREUR_CONTACT_FR,
  };

  const reassurance = data?.reassurance?.length
    ? data.reassurance.map((r) => ({ valeur: r.valeur ?? '', titre: r.titre ?? '', texte: r.texte ?? '' }))
    : locale === 'en'
      ? REASSURANCE_EN
      : REASSURANCE_DEFAUT;

  const seoEn = {
    titre: 'Free sea freight & overseas removal quote · HGWF Cargo',
    description:
      'Get a free quote in 4 steps: shipment type, destination, estimated volume and contact details. Personalised reply within 24–48 h.',
  };
  const seoDefaut = locale === 'en' ? seoEn : SEO_DEFAUT;
  const seo = {
    titre: data?.seoTitre ?? seoDefaut.titre,
    description: data?.seoDescription ?? seoDefaut.description,
  };

  return { hero, wizard, reassurance, seo };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const { seo } = await getContenu(l);
  return metadonneesPage({ locale: l, chemin: '/devis', titre: seo.titre, description: seo.description });
}

export default async function DevisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { hero, wizard, reassurance } = await getContenu(resolveLocale(locale));

  return (
    <main>
      {/* Hero */}
      <header>
        <div className="hero-photo relative isolate flex flex-col overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-24 md:px-[72px]">
          {hero.imageUrl ? (
            <Image
              src={hero.imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-[center_22%]"
            />
          ) : (
            <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          )}
          <span
            className="absolute inset-0 -z-10 bg-linear-92 from-marine/90 from-0% via-marine/55 via-55% to-marine/15 to-100%"
            aria-hidden="true"
          />
          <div className="hero-entree flex flex-col gap-3.5">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{hero.eyebrow}</span>
            <h1 className="m-0 text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-creme md:text-[50px]">
              {hero.titre} <span className="text-or">{hero.titreAccent}</span>
              <span className="text-corail">.</span>
            </h1>
            <p className="m-0 max-w-[48ch] text-base leading-[1.55] text-creme/88">{hero.description}</p>
          </div>
        </div>
      </header>

      {/* Parcours */}
      <section className="relative z-[4] mx-auto -mt-14 max-w-[1200px] px-5 sm:px-8">
        <DevisWizard content={wizard} />
      </section>

      {/* Réassurance */}
      <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-18">
        <div className="revele-cascade grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {reassurance.map((r, i) => (
            <div key={r.titre} className="flex flex-col gap-2 rounded-[20px] border border-marine/12 p-6">
              {/* Pastille marine : les trois couleurs de la balise (corail, ciel,
                  or) y tiennent le contraste, ce qu'aucune ne fait sur blanc. */}
              <span
                className={`self-start rounded-full bg-marine px-3.5 py-1 font-mono text-xl ${COULEURS_REASSURANCE[i % COULEURS_REASSURANCE.length]}`}
              >
                {r.valeur}
              </span>
              <h3 className="m-0 text-base font-bold">{r.titre}</h3>
              <p className="m-0 text-[13px] leading-[1.55] text-encre-douce">{r.texte}</p>
            </div>
          ))}
        </div>
      </section>
      <FaqCiblee {...FAQ_CIBLEES.devis[resolveLocale(locale)]} className="pb-20" />
    </main>
  );
}
