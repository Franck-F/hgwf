import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageDevis, getSiteSettings } from '@/sanity/queries';
import { DevisWizard, type DevisWizardContent } from '@/components/devis/DevisWizard';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie de la maquette Demande de devis.dc.html (Claude Design).
const HERO_DEFAUT = {
  eyebrow: 'Devis gratuit · Réponse sous 24–48 h',
  titre: 'Votre devis en 4',
  titreAccent: 'étapes',
  description:
    "Type d'envoi, destination, volume, coordonnées — l'équipe vous répond avec un prix personnalisé et les prochaines dates de départ.",
  imageUrl: null as string | null,
};

const WIZARD_DEFAUT = {
  etapeLabels: ['Envoi', 'Destination', 'Volume', 'Coordonnées'],
  etapeType: { titre: 'Que souhaitez-vous expédier ?' },
  etapeDestination: {
    titre: 'Vers où expédiez-vous ?',
    libelleDestination: 'Destination',
    libelleDepart: 'Port de départ',
    libelleDelai: 'DÉLAI MOYEN',
  },
  etapeVolume: {
    titre: 'Estimez votre volume.',
    texte: 'Mesurez chaque colis au point le plus large, en centimètres. Le groupage est facturé au mètre cube.',
    boutonAjouter: '+ Ajouter un colis',
  },
  etapeCoordonnees: {
    titre: 'Vos coordonnées.',
    placeholderNom: 'Nom et prénom',
    placeholderEmail: 'E-mail',
    placeholderTel: 'Téléphone / WhatsApp',
    placeholderMessage: 'Précisions — nature des biens, véhicule, dates souhaitées…',
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
      "Merci {nom} — votre demande est entre les mains de l'équipe. Un délai moyen de 24 à 48 h est nécessaire pour vous répondre. Votre référence :",
    boutonContact: "Parler à l'équipe",
    boutonAccueil: "Retour à l'accueil",
  },
  boutons: { precedent: '← Précédent', suivant: 'Suivant →', envoyer: 'Envoyer la demande' },
  typesEnvoi: [
    { label: 'Groupage (LCL)', description: 'Cartons, palettes, effets personnels — facturé au mètre cube.' },
    { label: 'Conteneur complet (FCL)', description: "Un conteneur 20' ou 40' réservé à votre envoi, dry ou reefer." },
    { label: 'Véhicule / bateau', description: 'Voiture, moto, bateau, jetski, remorque — conteneur ou ro-ro.' },
    { label: 'Déménagement', description: 'Mutation Outre-mer, retraite, retour au pays : tout votre foyer.' },
  ],
  destinations: [
    { nom: 'Guadeloupe', delai: '3 À 5 SEMAINES' },
    { nom: 'Martinique', delai: '3 À 5 SEMAINES' },
    { nom: 'Guyane', delai: '3 À 5 SEMAINES' },
    { nom: 'Saint-Martin / Saint-Barthélemy', delai: '3 À 5 SEMAINES' },
    { nom: 'Haïti', delai: '4 À 6 SEMAINES' },
    { nom: 'République Dominicaine', delai: '4 À 6 SEMAINES' },
    { nom: 'Nouvelle-Calédonie', delai: '41 JOURS EN MOYENNE' },
    { nom: 'Tahiti / Polynésie', delai: '41 JOURS EN MOYENNE' },
    { nom: 'Wallis-et-Futuna', delai: '60 À 70 JOURS' },
    { nom: 'Vanuatu / Fidji / Samoa', delai: 'SELON ROTATION — NOUS CONSULTER' },
    { nom: 'Australie / Nouvelle-Zélande', delai: 'SELON ROTATION — NOUS CONSULTER' },
    { nom: 'Afrique francophone', delai: 'VARIABLE SELON DESTINATION' },
    { nom: 'Autre destination', delai: 'NOUS CONSULTER' },
  ],
  portsDepart: ['Le Havre', 'Fos / Marseille', 'Enlèvement à domicile', 'Dépôt à Rosny-sous-Bois'],
};

const REASSURANCE_DEFAUT = [
  {
    valeur: '24–48 H',
    titre: 'Réponse rapide',
    texte: 'Chaque demande est traitée avec attention — prix personnalisé et prochaines dates de départ.',
  },
  {
    valeur: 'AU M³',
    titre: 'Prix au volume',
    texte: 'En groupage, vous ne payez que le volume que vous occupez dans le conteneur.',
  },
  {
    valeur: '0 €',
    titre: 'Devis gratuit',
    texte: "Sans engagement — l'équipe vous aide aussi à constituer le dossier douane complet.",
  },
];

const COULEURS_REASSURANCE = ['text-corail', 'text-ciel', 'text-or'];

const SEO_DEFAUT = {
  titre: 'Demande de devis — HGWF Cargo',
  description:
    'Obtenez un devis gratuit en 4 étapes : type d’envoi, destination, volume estimé et coordonnées. Réponse personnalisée sous 24 à 48 h.',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const [data, settings] = await Promise.all([getPageDevis(locale), getSiteSettings()]);

  const hero = {
    eyebrow: data?.hero?.eyebrow ?? HERO_DEFAUT.eyebrow,
    titre: data?.hero?.titre ?? HERO_DEFAUT.titre,
    titreAccent: data?.hero?.titreAccent ?? HERO_DEFAUT.titreAccent,
    description: data?.hero?.description ?? HERO_DEFAUT.description,
    imageUrl: data?.hero?.imageUrl ?? HERO_DEFAUT.imageUrl,
  };

  const wizard: DevisWizardContent = {
    etapeLabels: data?.etapeLabels?.length === 4 ? data.etapeLabels : WIZARD_DEFAUT.etapeLabels,
    etapeType: { titre: data?.etapeType?.titre ?? WIZARD_DEFAUT.etapeType.titre },
    etapeDestination: {
      titre: data?.etapeDestination?.titre ?? WIZARD_DEFAUT.etapeDestination.titre,
      libelleDestination:
        data?.etapeDestination?.libelleDestination ?? WIZARD_DEFAUT.etapeDestination.libelleDestination,
      libelleDepart: data?.etapeDestination?.libelleDepart ?? WIZARD_DEFAUT.etapeDestination.libelleDepart,
      libelleDelai: data?.etapeDestination?.libelleDelai ?? WIZARD_DEFAUT.etapeDestination.libelleDelai,
    },
    etapeVolume: {
      titre: data?.etapeVolume?.titre ?? WIZARD_DEFAUT.etapeVolume.titre,
      texte: data?.etapeVolume?.texte ?? WIZARD_DEFAUT.etapeVolume.texte,
      boutonAjouter: data?.etapeVolume?.boutonAjouter ?? WIZARD_DEFAUT.etapeVolume.boutonAjouter,
    },
    etapeCoordonnees: {
      titre: data?.etapeCoordonnees?.titre ?? WIZARD_DEFAUT.etapeCoordonnees.titre,
      placeholderNom: data?.etapeCoordonnees?.placeholderNom ?? WIZARD_DEFAUT.etapeCoordonnees.placeholderNom,
      placeholderEmail: data?.etapeCoordonnees?.placeholderEmail ?? WIZARD_DEFAUT.etapeCoordonnees.placeholderEmail,
      placeholderTel: data?.etapeCoordonnees?.placeholderTel ?? WIZARD_DEFAUT.etapeCoordonnees.placeholderTel,
      placeholderMessage:
        data?.etapeCoordonnees?.placeholderMessage ?? WIZARD_DEFAUT.etapeCoordonnees.placeholderMessage,
    },
    recap: {
      titre: data?.recap?.titre ?? WIZARD_DEFAUT.recap.titre,
      libelleType: data?.recap?.libelleType ?? WIZARD_DEFAUT.recap.libelleType,
      libelleDestination: data?.recap?.libelleDestination ?? WIZARD_DEFAUT.recap.libelleDestination,
      libelleDepart: data?.recap?.libelleDepart ?? WIZARD_DEFAUT.recap.libelleDepart,
      libelleVolume: data?.recap?.libelleVolume ?? WIZARD_DEFAUT.recap.libelleVolume,
    },
    confirmation: {
      titre: data?.confirmation?.titre ?? WIZARD_DEFAUT.confirmation.titre,
      texte: data?.confirmation?.texte ?? WIZARD_DEFAUT.confirmation.texte,
      boutonContact: data?.confirmation?.boutonContact ?? WIZARD_DEFAUT.confirmation.boutonContact,
      boutonAccueil: data?.confirmation?.boutonAccueil ?? WIZARD_DEFAUT.confirmation.boutonAccueil,
    },
    boutons: {
      precedent: data?.boutons?.precedent ?? WIZARD_DEFAUT.boutons.precedent,
      suivant: data?.boutons?.suivant ?? WIZARD_DEFAUT.boutons.suivant,
      envoyer: data?.boutons?.envoyer ?? WIZARD_DEFAUT.boutons.envoyer,
    },
    typesEnvoi: data?.typesEnvoi?.length
      ? data.typesEnvoi.map((t) => ({ label: t.label ?? '', description: t.description ?? '' }))
      : WIZARD_DEFAUT.typesEnvoi,
    destinations: data?.destinations?.length
      ? data.destinations.map((d) => ({ nom: d.nom ?? '', delai: d.delai ?? '—' }))
      : WIZARD_DEFAUT.destinations,
    portsDepart: data?.portsDepart?.length ? data.portsDepart : WIZARD_DEFAUT.portsDepart,
    imagesEtapes: data?.imagesEtapesUrls?.length ? data.imagesEtapesUrls : [null, null, null, null],
    emailDestinataire: settings?.email ?? 'contact@hgwf-cargo.fr',
    sujetEmail: 'Demande de devis',
  };

  const reassurance = data?.reassurance?.length
    ? data.reassurance.map((r) => ({ valeur: r.valeur ?? '', titre: r.titre ?? '', texte: r.texte ?? '' }))
    : REASSURANCE_DEFAUT;

  const seo = {
    titre: data?.seoTitre ?? SEO_DEFAUT.titre,
    description: data?.seoDescription ?? SEO_DEFAUT.description,
  };

  return { hero, wizard, reassurance, seo };
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
              <span className={`font-mono text-xl ${COULEURS_REASSURANCE[i % COULEURS_REASSURANCE.length]}`}>
                {r.valeur}
              </span>
              <span className="text-base font-bold">{r.titre}</span>
              <p className="m-0 text-[13px] leading-[1.55] text-encre-douce">{r.texte}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
