/**
 * Seed des pages Accueil, Contact, FAQ, Devis, Mentions légales + singletons.
 * Upload les photos de la maquette et crée les documents FR pré-remplis.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/seed-site.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';
import { createReadStream } from 'node:fs';
import path from 'node:path';

const client = getCliClient({ apiVersion: '2024-10-01' });
const PHOTOS_DIR = path.resolve(__dirname, '../../../assets/photos');

type ImageRef = { _type: 'image'; asset: { _type: 'reference'; _ref: string } };

async function uploadImage(filename: string): Promise<ImageRef> {
  const asset = await client.assets.upload('image', createReadStream(path.join(PHOTOS_DIR, filename)), {
    filename,
  });
  console.log(`  ✓ ${filename} → ${asset._id}`);
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

let keyCounter = 0;
function k(prefix: string): string {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

function bloc(texte: string, listItem?: 'bullet'): Record<string, unknown> {
  return {
    _type: 'block',
    _key: k('bloc'),
    style: 'normal',
    ...(listItem ? { listItem, level: 1 } : {}),
    markDefs: [],
    children: [{ _type: 'span', _key: k('span'), text: texte, marks: [] }],
  };
}

async function main() {
  console.log(`Projet : ${client.config().projectId} / dataset : ${client.config().dataset}`);
  console.log('Upload des images…');

  const [contactSupport, demenagementFamille, devisConseil, portCaraibes, cargoPort, entrepot, lagonPacifique] =
    await Promise.all([
      uploadImage('contact-support.png'),
      uploadImage('demenagement-famille.png'),
      uploadImage('devis-conseil.png'),
      uploadImage('port-caraibes.png'),
      uploadImage('cargo-port.png'),
      uploadImage('entrepot.png'),
      uploadImage('lagon-pacifique.png'),
    ]);

  // ── Page Contact ──
  await client.createOrReplace({
    _id: 'pageContact-fr',
    _type: 'pageContact',
    language: 'fr',
    titre: 'Nous contacter',
    hero: {
      eyebrow: 'Par mail, téléphone ou WhatsApp',
      titre: 'Nous contacter.',
      description:
        'Vous êtes nombreux à nous contacter, et nous en sommes ravis ! Toutes vos demandes sont traitées avec la plus grande attention. Un délai moyen de 24 à 48 h est souvent nécessaire pour répondre à vos demandes de devis.',
      image: contactSupport,
    },
    coordonnees: [
      { _key: k('coord'), libelle: 'E-mail', valeur: 'contact@hgwf-cargo.fr', type: 'email' },
      { _key: k('coord'), libelle: 'Marie', valeur: '+33 6 27 05 69 34', type: 'tel' },
      { _key: k('coord'), libelle: 'Fabrice', valeur: '+33 7 64 16 90 82', type: 'tel' },
      { _key: k('coord'), libelle: 'Malia / Fuka', valeur: '+33 6 13 37 71 14', type: 'tel' },
    ],
    formulaire: {
      titre: 'Écrivez-nous.',
      placeholderNom: 'Nom et prénom',
      placeholderTel: 'Téléphone / WhatsApp',
      placeholderEmail: 'E-mail',
      placeholderMessage: 'Votre message — destination, nature des biens, dates souhaitées…',
      sujets: [
        'Demande de devis',
        "Suivi d'un envoi",
        "Conteneur d'occasion",
        'Déménagement Outre-mer',
        'Autre question',
      ],
      boutonEnvoyer: 'Envoyer le message',
      confirmationTitre: 'Message envoyé.',
      confirmationTexte:
        "Merci {nom} — votre message est bien parti. L'équipe vous répond sous 24 à 48 h, par mail ou téléphone.",
      boutonReinitialiser: 'Envoyer un autre message',
    },
    centre: {
      eyebrow: 'Sur RDV uniquement',
      titre: 'Nous rendre visite, ou faire livrer vos colis.',
      texte:
        'Notre centre logistique vous accueille sur rendez-vous pour le dépôt de vos colis, cartons et effets personnels.',
      adresse: '10 RUE DIDEROT\n93110 ROSNY-SOUS-BOIS',
      noteFaq: 'Des questions sur nos offres et le transport longue distance ? Les réponses sont dans la',
      noteFaqLien: 'Foire aux questions',
      image: entrepot,
    },
    seoTitre: 'Nous contacter — HGWF Cargo',
    seoDescription:
      'Contactez HGWF Cargo par mail, téléphone ou WhatsApp : devis gratuit, suivi d’envoi, conteneurs et déménagement Outre-mer. Réponse sous 24 à 48 h.',
  });
  console.log('  ✓ pageContact-fr');

  // ── Page FAQ + questions ──
  await client.createOrReplace({
    _id: 'pageFaq-fr',
    _type: 'pageFaq',
    language: 'fr',
    titre: 'Questions fréquentes',
    hero: {
      eyebrow: 'Foire aux questions',
      titre: 'Questions fréquentes.',
      description:
        'Toutes les réponses sur nos offres et le transport de marchandises longue distance. Une autre question ?',
      lienContact: 'Contactez-nous',
      image: lagonPacifique,
    },
    categories: [
      { _key: k('cat'), cle: 'expeditions', titre: 'Expéditions' },
      { _key: k('cat'), cle: 'tarifs', titre: 'Tarifs & délais' },
      { _key: k('cat'), cle: 'conteneurs', titre: 'Conteneurs d’occasion' },
    ],
    cta: {
      titre: 'Vous n’avez pas trouvé votre réponse ?',
      sousTitre: 'RÉPONSE SOUS 24–48 H',
      bouton: 'Nous contacter',
      lien: '/contact',
    },
    seoTitre: 'Questions fréquentes (FAQ) — HGWF Cargo',
    seoDescription:
      'Expéditions, tarifs, délais, groupage, conteneurs d’occasion : toutes les réponses sur le transport de marchandises avec HGWF Cargo.',
  });
  console.log('  ✓ pageFaq-fr');

  const faqItems: { question: string; blocs: Record<string, unknown>[]; categorie: string; ordre: number }[] = [
    {
      categorie: 'expeditions',
      ordre: 1,
      question: 'Quels types de marchandises pouvez-vous expédier ?',
      blocs: [
        bloc(
          'Nous transportons une large gamme de marchandises, du colis personnel aux équipements professionnels. Cela inclut les effets personnels, véhicules, palettes, groupage, conteneurs complets (FCL) ou partiels (LCL).',
        ),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 2,
      question: 'Dans quelles zones géographiques livrez-vous ?',
      blocs: [
        bloc(
          "Nous desservons notamment : le Pacifique Sud (Wallis-et-Futuna, Nouvelle-Calédonie, Tahiti…), les Antilles françaises (Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy), la Guyane, Haïti ainsi que de nombreux pays d'Afrique francophone. Nous pouvons également livrer vers d'autres destinations — contactez-nous pour un devis gratuit.",
        ),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 3,
      question: 'Puis-je expédier un véhicule ou un bateau ?',
      blocs: [
        bloc(
          "Oui, HGWF Cargo propose l'expédition de véhicules roulants ou non roulants, engins de chantier et bateaux (en conteneur ou en ro-ro). Nous vous conseillons sur la procédure et les formalités douanières.",
        ),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 4,
      question: 'Proposez-vous un service de retrait à domicile ?',
      blocs: [
        bloc("Oui, nous pouvons organiser l'enlèvement à domicile partout en France métropolitaine, sur demande."),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 5,
      question: 'Comment suivre mon envoi ?',
      blocs: [
        bloc(
          "Un suivi personnalisé est assuré par nos équipes. Vous pouvez nous contacter à tout moment pour obtenir des informations actualisées sur l'acheminement.",
        ),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 6,
      question: 'Quels documents dois-je fournir pour expédier un colis ou conteneur ?',
      blocs: [
        bloc(
          "Vous devez généralement fournir : une pièce d'identité, une facture ou déclaration de valeur, et un inventaire pour les effets personnels. Nos équipes vous assistent pour constituer le dossier complet.",
        ),
      ],
    },
    {
      categorie: 'expeditions',
      ordre: 7,
      question: 'Y a-t-il des marchandises interdites ?',
      blocs: [
        bloc(
          "Oui, certaines marchandises sont réglementées ou interdites : explosifs, gaz, produits radioactifs, certains produits chimiques, armes, espèces protégées, déchets… avec des restrictions locales possibles. Contactez-nous avant l'expédition, nous vérifions la faisabilité.",
        ),
      ],
    },
    {
      categorie: 'tarifs',
      ordre: 1,
      question: 'Quels sont les délais de livraison moyens ?',
      blocs: [
        bloc("Les délais d'acheminement par nos transporteurs maritimes partenaires varient selon la destination :"),
        bloc('Antilles et Guyane : environ 3 à 5 semaines au départ du Havre ou de Fos/Marseille', 'bullet'),
        bloc('Tahiti : 41 jours en moyenne entre Le Havre et Tahiti', 'bullet'),
        bloc('Nouvelle-Calédonie (Nouméa) : 41 jours en moyenne entre Le Havre et Nouméa', 'bullet'),
        bloc('Wallis-et-Futuna : 60 jours en moyenne vers Wallis, 70 jours vers Futuna', 'bullet'),
        bloc('Afrique et Océan indien : variable selon les destinations', 'bullet'),
        bloc('Nous vous informons des prochaines dates de départ et de clôture à chaque devis.'),
      ],
    },
    {
      categorie: 'tarifs',
      ordre: 2,
      question: 'Quelle est la différence entre le groupage et le conteneur complet ?',
      blocs: [
        bloc(
          'Groupage (LCL) : plusieurs clients dans un même conteneur, facturation au volume (mètre cube). Conteneur complet (FCL) : tout le conteneur est réservé à votre envoi — vous payez le conteneur complet.',
        ),
      ],
    },
    {
      categorie: 'tarifs',
      ordre: 3,
      question: 'Faites-vous du groupage ?',
      blocs: [
        bloc(
          "Oui, nous proposons du groupage maritime pour mutualiser les frais d'envoi — idéal pour les particuliers ou PME n'ayant pas un volume suffisant pour remplir un conteneur complet.",
        ),
      ],
    },
    {
      categorie: 'tarifs',
      ordre: 4,
      question: 'Comment est calculé le prix en groupage maritime (LCL) ?',
      blocs: [
        bloc(
          'Le coût du transport est calculé au volume (mètre cube). Il faut additionner la taille de chacun de vos colis (longueur × largeur × hauteur). Astuce : mesurez au point le plus large — cartons bombés, palettes.',
        ),
      ],
    },
    {
      categorie: 'tarifs',
      ordre: 5,
      question: 'Quels sont les tarifs ?',
      blocs: [
        bloc(
          'Nos tarifs sont personnalisés selon le volume, la nature des biens et la destination. Vous pouvez obtenir un devis rapide et gratuit via notre adresse mail.',
        ),
      ],
    },
    {
      categorie: 'conteneurs',
      ordre: 1,
      question: "Qu'est-ce qu'un conteneur « dernier voyage » ?",
      blocs: [
        bloc(
          "Un conteneur « dernier voyage » est un conteneur en fin de carrière maritime que l'on revend souvent pour du stockage. Vous pouvez le réutiliser pour du rangement personnel ou professionnel, de la construction d'habitation ou de locaux commerciaux…",
        ),
      ],
    },
    {
      categorie: 'conteneurs',
      ordre: 2,
      question: "Est-ce que je peux acheter un conteneur d'occasion ?",
      blocs: [
        bloc(
          "Bien sûr ! Nous vous proposons des conteneurs d'occasion à l'achat. Demandez-nous un devis en précisant la taille souhaitée et l'adresse de livraison.",
        ),
      ],
    },
  ];

  for (const [i, item] of faqItems.entries()) {
    await client.createOrReplace({
      _id: `faqItem-fr-${i + 1}`,
      _type: 'faqItem',
      language: 'fr',
      question: item.question,
      reponse: item.blocs,
      categorie: item.categorie,
      ordre: item.ordre,
    });
  }
  console.log(`  ✓ ${faqItems.length} questions FAQ`);

  // ── Page Devis ──
  await client.createOrReplace({
    _id: 'pageDevis-fr',
    _type: 'pageDevis',
    language: 'fr',
    titre: 'Demande de devis',
    hero: {
      eyebrow: 'Devis gratuit · Réponse sous 24–48 h',
      titre: 'Votre devis en 4',
      titreAccent: 'étapes',
      description:
        "Type d'envoi, destination, volume, coordonnées — l'équipe vous répond avec un prix personnalisé et les prochaines dates de départ.",
      image: devisConseil,
    },
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
      { _key: k('type'), label: 'Groupage (LCL)', description: 'Cartons, palettes, effets personnels — facturé au mètre cube.' },
      { _key: k('type'), label: 'Conteneur complet (FCL)', description: "Un conteneur 20' ou 40' réservé à votre envoi, dry ou reefer." },
      { _key: k('type'), label: 'Véhicule / bateau', description: 'Voiture, moto, bateau, jetski, remorque — conteneur ou ro-ro.' },
      { _key: k('type'), label: 'Déménagement', description: 'Mutation Outre-mer, retraite, retour au pays : tout votre foyer.' },
    ],
    destinations: [
      { _key: k('dest'), nom: 'Guadeloupe', delai: '3 À 5 SEMAINES' },
      { _key: k('dest'), nom: 'Martinique', delai: '3 À 5 SEMAINES' },
      { _key: k('dest'), nom: 'Guyane', delai: '3 À 5 SEMAINES' },
      { _key: k('dest'), nom: 'Saint-Martin / Saint-Barthélemy', delai: '3 À 5 SEMAINES' },
      { _key: k('dest'), nom: 'Haïti', delai: '4 À 6 SEMAINES' },
      { _key: k('dest'), nom: 'République Dominicaine', delai: '4 À 6 SEMAINES' },
      { _key: k('dest'), nom: 'Nouvelle-Calédonie', delai: '41 JOURS EN MOYENNE' },
      { _key: k('dest'), nom: 'Tahiti / Polynésie', delai: '41 JOURS EN MOYENNE' },
      { _key: k('dest'), nom: 'Wallis-et-Futuna', delai: '60 À 70 JOURS' },
      { _key: k('dest'), nom: 'Vanuatu / Fidji / Samoa', delai: 'SELON ROTATION — NOUS CONSULTER' },
      { _key: k('dest'), nom: 'Australie / Nouvelle-Zélande', delai: 'SELON ROTATION — NOUS CONSULTER' },
      { _key: k('dest'), nom: 'Afrique francophone', delai: 'VARIABLE SELON DESTINATION' },
      { _key: k('dest'), nom: 'Autre destination', delai: 'NOUS CONSULTER' },
    ],
    portsDepart: ['Le Havre', 'Fos / Marseille', 'Enlèvement à domicile', 'Dépôt à Rosny-sous-Bois'],
    imagesEtapes: [
      { ...demenagementFamille, _key: k('img') },
      { ...lagonPacifique, _key: k('img') },
      { ...entrepot, _key: k('img') },
      { ...cargoPort, _key: k('img') },
    ],
    reassurance: [
      {
        _key: k('rea'),
        valeur: '24–48 H',
        titre: 'Réponse rapide',
        texte: 'Chaque demande est traitée avec attention — prix personnalisé et prochaines dates de départ.',
      },
      {
        _key: k('rea'),
        valeur: 'AU M³',
        titre: 'Prix au volume',
        texte: 'En groupage, vous ne payez que le volume que vous occupez dans le conteneur.',
      },
      {
        _key: k('rea'),
        valeur: '0 €',
        titre: 'Devis gratuit',
        texte: "Sans engagement — l'équipe vous aide aussi à constituer le dossier douane complet.",
      },
    ],
    seoTitre: 'Demande de devis — HGWF Cargo',
    seoDescription:
      'Obtenez un devis gratuit en 4 étapes : type d’envoi, destination, volume estimé et coordonnées. Réponse personnalisée sous 24 à 48 h.',
  });
  console.log('  ✓ pageDevis-fr');

  // ── Page Mentions légales ──
  await client.createOrReplace({
    _id: 'pageMentions-fr',
    _type: 'pageMentions',
    language: 'fr',
    titre: 'Mentions légales',
    eyebrow: 'Informations légales',
    titrePage: 'Mentions légales.',
    sections: [
      {
        _key: k('sec'),
        titre: 'Éditeur du site',
        corps: 'HGWF SOLUTIONS TRANSPORTS LOGISTIQUES\n29 avenue Nollet, 93420 Villepinte',
      },
      { _key: k('sec'), titre: 'Immatriculation', corps: '940 048 051 R.C.S. Bobigny\nNuméro de TVA : FR18940048051' },
      { _key: k('sec'), titre: 'Direction', corps: 'Dirigeante : Marie Bagassien' },
      { _key: k('sec'), titre: 'Contact', corps: 'contact@hgwf-cargo.fr\n+33 6 27 05 69 34' },
    ],
    seoTitre: 'Mentions légales — HGWF Cargo',
    seoDescription: 'Mentions légales du site HGWF Cargo — HGWF Solutions Transports Logistiques.',
  });
  console.log('  ✓ pageMentions-fr');

  // ── Page Accueil ──
  await client.createOrReplace({
    _id: 'pageAccueil-fr',
    _type: 'pageAccueil',
    language: 'fr',
    titre: 'Accueil',
    hero: {
      titre: 'Le transport qui porte votre cargaison plus',
      titreAccent: 'loin',
      description:
        "Maritime, aérien ou terrestre : de l'enlèvement à la livraison, nous nous occupons de chaque étape pour que vous pensiez à la suite.",
      boutonPrincipal: 'Nous contacter',
      boutonPrincipalLien: '/devis',
      boutonSecondaire: 'Suivre un conteneur',
      boutonSecondaireLien: '/suivi',
      badge: 'PACIFIQUE · CARAÏBES · AFRIQUE — DEPUIS LE HAVRE & FOS/MARSEILLE',
      image: cargoPort,
    },
    services: [
      {
        _key: k('svc'),
        titre: 'Groupage (LCL)',
        texte: 'Facturé au mètre cube, idéal particuliers & PME',
        lien: '/devis',
        image: cargoPort,
      },
      {
        _key: k('svc'),
        titre: 'Conteneur complet (FCL)',
        texte: "20' ou 40', dry ou reefer, réservé à votre envoi",
        lien: '/devis',
        image: portCaraibes,
      },
      {
        _key: k('svc'),
        titre: 'Véhicules & bateaux',
        texte: 'Roulants ou non, en conteneur ou ro-ro',
        lien: '/devis',
        image: cargoPort,
      },
      {
        _key: k('svc'),
        titre: 'Déménagement',
        texte: 'Mutation Outre-mer, retraite, retour au pays',
        lien: '/#demenagement',
        image: demenagementFamille,
      },
    ],
    promesse: {
      titre: 'Parce que vos marchandises sont',
      titreAccent: 'importantes',
      texte:
        'Vous êtes professionnel — commerçant, industriel — ou particulier : nous trouverons la meilleure option pour vos marchandises, véhicules et effets personnels.',
    },
    zones: {
      titre: 'Où nous',
      titreAccent: 'livrons',
      badge: 'SERVICES RÉGULIERS & SÉCURISÉS',
      bouton: 'Obtenir un devis gratuit',
      boutonLien: '/devis',
      image: portCaraibes,
      cartes: [
        {
          _key: k('zone'),
          titre: 'Pacifique Sud',
          texte: 'Nouvelle-Calédonie, Wallis-et-Futuna, Tahiti · Marquises · Polynésie, Vanuatu, Fidji, Samoa',
        },
        { _key: k('zone'), titre: 'Antilles françaises', texte: 'Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy' },
        { _key: k('zone'), titre: 'Guyane', texte: 'Dégrad des Cannes et livraisons intérieures' },
        { _key: k('zone'), titre: 'Caraïbes', texte: 'Haïti, République Dominicaine et toutes destinations caribéennes' },
        { _key: k('zone'), titre: 'Afrique', texte: "Les principaux ports d'Afrique francophone" },
        { _key: k('zone'), titre: 'Océanie & au-delà', texte: 'Australie, Nouvelle-Zélande — et autres destinations sur devis' },
      ],
    },
    demenagement: {
      eyebrow: 'Mutation en Outre-mer',
      titre: 'Déménagez',
      titreAccent: 'serein',
      titreFin: ", on s'occupe de tout.",
      texte:
        'Militaires, fonctionnaires, salariés et cadres du privé — départ en retraite, retour au pays. Nous gérons toutes les étapes pour un départ en toute sérénité vers votre nouvelle aventure.',
      points: [
        'Effets personnels, meubles, électroménagers',
        'Véhicules, motos, bateaux, jetskis, remorques',
        'Transport rapide, sécurisé et dédié',
      ],
      bouton: 'Infos et devis gratuit',
      boutonLien: '/devis',
      image: demenagementFamille,
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
        { _key: k('barre'), destination: 'Antilles & Guyane', delai: '3–5 SEMAINES', pourcentage: 34, couleur: 'corail' },
        { _key: k('barre'), destination: 'Tahiti · Polynésie', delai: '41 JOURS', pourcentage: 58, couleur: 'ciel' },
        { _key: k('barre'), destination: 'Nouvelle-Calédonie (Nouméa)', delai: '41 JOURS', pourcentage: 58, couleur: 'ciel' },
        { _key: k('barre'), destination: 'Wallis', delai: '60 JOURS', pourcentage: 78, couleur: 'or' },
        { _key: k('barre'), destination: 'Futuna', delai: '70 JOURS', pourcentage: 90, couleur: 'or' },
        { _key: k('barre'), destination: 'Afrique & Océan indien', delai: 'SELON DESTINATION', pourcentage: 46, couleur: 'marine' },
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
      image: portCaraibes,
    },
    faqCourte: {
      titre: 'Vos questions, nos',
      titreAccent: 'réponses',
      texte: "L'essentiel sur le transport longue distance — la FAQ complète est",
      lienTexte: 'ici',
      bouton: 'Voir toutes les questions',
      items: [
        {
          _key: k('faq'),
          question: 'Quels types de marchandises pouvez-vous expédier ?',
          reponse:
            'Une large gamme de marchandises, du colis personnel aux équipements professionnels : effets personnels, véhicules, palettes, groupage, conteneurs complets (FCL) ou partiels (LCL).',
        },
        {
          _key: k('faq'),
          question: 'Quelle est la différence entre le groupage et le conteneur complet ?',
          reponse:
            'Groupage (LCL) : plusieurs clients dans un même conteneur, facturation au volume (mètre cube). Conteneur complet (FCL) : tout le conteneur est réservé à votre envoi.',
        },
        {
          _key: k('faq'),
          question: 'Comment est calculé le prix en groupage maritime (LCL) ?',
          reponse:
            'Au volume (mètre cube) : additionnez la taille de chacun de vos colis (longueur × largeur × hauteur). Astuce : mesurez au point le plus large — cartons bombés, palettes.',
        },
        {
          _key: k('faq'),
          question: 'Comment suivre mon envoi ?',
          reponse:
            'Un suivi personnalisé est assuré par nos équipes — et vous pouvez suivre votre conteneur à tout moment depuis la page Suivi.',
        },
      ],
    },
    ctaSuivi: {
      eyebrow: "Suivi d'envoi",
      titre: "Suivez chaque conteneur, jusqu'au",
      titreAccent: 'lagon',
      texte:
        'Référence dossier ou numéro de conteneur : statut, position, navire et ETA — et une équipe joignable à tout moment.',
      boutonPrincipal: 'Suivre mon envoi',
      boutonSecondaire: "Parler à l'équipe",
      image: lagonPacifique,
    },
    seoTitre: 'HGWF Cargo — Transport de marchandises dans le monde entier',
    seoDescription:
      'Transport maritime, aérien et terrestre vers le Pacifique, les Caraïbes et l’Afrique : groupage, conteneur complet, véhicules et déménagement Outre-mer.',
  });
  console.log('  ✓ pageAccueil-fr');

  // ── Singletons (créés uniquement s'ils n'existent pas — ne touche pas l'existant) ──
  await client.createIfNotExists({
    _id: 'navigation',
    _type: 'navigation',
    liens: [
      { _key: k('nav'), libelleFr: 'Destinations', libelleEn: 'Destinations', href: '/#zones' },
      { _key: k('nav'), libelleFr: 'Services', libelleEn: 'Services', href: '/#services' },
      { _key: k('nav'), libelleFr: 'Déménagement', libelleEn: 'Removals', href: '/#demenagement' },
      { _key: k('nav'), libelleFr: 'Suivi', libelleEn: 'Tracking', href: '/suivi' },
      { _key: k('nav'), libelleFr: 'Nous contacter', libelleEn: 'Contact us', href: '/contact' },
    ],
    cta: { libelleFr: 'Demander un devis', libelleEn: 'Request a quote', href: '/devis' },
  });

  await client.createIfNotExists({
    _id: 'footer',
    _type: 'footer',
    texteFr: 'Transport de marchandises dans le monde entier.',
    texteEn: 'Freight transport all over the world.',
    ligneLegale:
      'HGWF CARGO · AVENUE FAIDHERBE\n93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051',
    colonnes: [
      {
        _key: k('col'),
        titreFr: 'Navigation',
        titreEn: 'Navigation',
        liens: [
          { _key: k('lien'), libelleFr: 'Destinations', libelleEn: 'Destinations', href: '/#zones' },
          { _key: k('lien'), libelleFr: 'Déménagement', libelleEn: 'Removals', href: '/#demenagement' },
          { _key: k('lien'), libelleFr: 'Demander un devis', libelleEn: 'Request a quote', href: '/devis' },
          { _key: k('lien'), libelleFr: "Suivi d'envoi", libelleEn: 'Shipment tracking', href: '/suivi' },
        ],
      },
      {
        _key: k('col'),
        titreFr: 'Aide',
        titreEn: 'Help',
        liens: [
          { _key: k('lien'), libelleFr: 'Questions fréquentes (FAQ)', libelleEn: 'FAQ', href: '/faq' },
          { _key: k('lien'), libelleFr: 'Nous contacter', libelleEn: 'Contact us', href: '/contact' },
        ],
      },
    ],
    copyrightFr: '© 2026 HGWF Cargo — Tous droits réservés.',
    copyrightEn: '© 2026 HGWF Cargo — All rights reserved.',
    liensLegaux: [
      { _key: k('legal'), libelleFr: 'Mentions légales', libelleEn: 'Legal notice', href: '/mentions-legales' },
      {
        _key: k('legal'),
        libelleFr: 'Politique de confidentialité',
        libelleEn: 'Privacy policy',
        href: '/confidentialite',
      },
      { _key: k('legal'), libelleFr: 'CGV', libelleEn: 'Terms of sale', href: '/cgv' },
    ],
  });

  await client.createIfNotExists({
    _id: 'siteSettings',
    _type: 'siteSettings',
    raisonSociale: 'HGWF CARGO',
    nomCommercial: 'HGWF Cargo',
    baseline: 'Transport de marchandises dans le monde entier.',
    email: 'contact@hgwf-cargo.fr',
    telephones: [
      { _key: k('tel'), contact: 'Marie', numero: '+33 6 27 05 69 34' },
      { _key: k('tel'), contact: 'Fabrice', numero: '+33 7 64 16 90 82' },
      { _key: k('tel'), contact: 'Malia / Fuka', numero: '+33 6 13 37 71 14' },
    ],
    adresseSiege: 'Avenue Faidherbe, 93110 Rosny-sous-Bois',
    adresseLogistique: '10 rue Diderot, 93110 Rosny-sous-Bois',
  });
  console.log('  ✓ singletons (navigation, footer, siteSettings)');

  console.log('Seed terminé.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
