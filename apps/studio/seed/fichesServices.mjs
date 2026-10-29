  // Fiches services de départ (dataset « operations », type ficheService).
//
// Rédigées le 29/10/2026 à partir de ce que le site, la FAQ, les CGV et le
// back-office disent déjà — rien d'autre. AUCUN TARIF RÉEL n'existait alors :
// toutes les grilles ont leurs lignes, sans prix. Ce qui n'est écrit nulle part
// est listé dans « aCompleter », pour l'équipe.
//
// Semis : scripts/semer-fiches.cjs (createIfNotExists : une fiche déjà
// modifiée par l'équipe n'est jamais écrasée).

const DELAIS_MARITIMES = [
  { zone: 'Guadeloupe, Martinique, Guyane, Saint-Martin / Saint-Barthélemy', delai: 'environ 3 à 5 semaines' },
  { zone: 'Haïti, République Dominicaine', delai: 'environ 4 à 6 semaines' },
  { zone: 'États-Unis / Canada, Amérique du Sud', delai: 'selon rotation, nous consulter' },
  { zone: 'Afrique francophone', delai: 'variable selon la destination' },
];

// CGV, « Devis et commande » : non compris sauf mention au devis.
const NON_INCLUS_CGV = [
  'Droits de douane, taxes et redevances exigibles à destination',
  'Frais de stationnement, de magasinage ou d’immobilisation non imputables à HGWF Cargo',
  'Manutention exceptionnelle non prévue au devis',
  'Assurance ad valorem : jamais souscrite d’office, sur demande écrite du client avant l’enlèvement',
];

const DOCUMENTS_BASE = [
  'Pièce d’identité',
  'Facture ou déclaration de valeur',
  'Inventaire détaillé pour les effets personnels',
];

const VIGILANCE_COMMUNE = [
  'Marchandises interdites ou réglementées (explosifs, gaz, armes, produits chimiques, denrées périssables non réfrigérées, espèces, objets de valeur…) : vérifier avant d’accepter',
  'Les délais sont indicatifs (CGV) : ne jamais promettre une date sans l’écrire comme garantie',
  'Toute modification de poids, dimensions, nature ou destination entraîne la révision du prix (CGV)',
  'Proposer l’assurance ad valorem : les indemnités légales sont souvent très inférieures à la valeur réelle',
];

export const FICHES = [
  {
    _id: 'fiche-groupage',
    titre: 'Groupage maritime (LCL)',
    ordre: 1,
    libellesFormulaire: ['Groupage (LCL)', 'Groupage', 'Groupage maritime'],
    resume:
      'Plusieurs clients partagent un même conteneur : le client ne paie que le volume occupé, au mètre cube. Pour les particuliers et les PME (cartons, palettes, effets personnels).',
    methodeTarif:
      'Au mètre cube (m³). Volume = somme des colis, longueur × largeur × hauteur, mesurés au point le plus large (cartons bombés et palettes compris). Un écart de volume constaté au chargement entraîne la révision du prix.',
    // 400 €/m³ : tarif annoncé par Franck le 29/10/2026 (scripts/tarif-groupage.cjs
    // l'a posé dans Sanity). Ligne générale tant qu'on ignore s'il varie selon
    // la destination.
    grille: [
      {
        designation: 'Fret groupage maritime',
        unite: 'm³',
        prixHT: 400,
        note: 'tarif général annoncé le 29/10/2026 ; préciser s’il varie selon la destination',
      },
    ],
    fraisAnnexes: [
      { designation: 'Enlèvement à domicile', unite: 'envoi', note: 'France métropolitaine, sur demande' },
      { designation: 'Assurance ad valorem', note: 'sur demande écrite, selon la valeur déclarée' },
    ],
    tauxTVADefaut: 0,
    delais: DELAIS_MARITIMES,
    inclus: [
      'Organisation de l’acheminement maritime, en qualité de commissionnaire de transport',
      'Aide à la constitution du dossier douane',
      'Suivi de l’envoi par l’équipe, avec la référence HGWF',
    ],
    nonInclus: NON_INCLUS_CGV,
    documents: DOCUMENTS_BASE,
    infosAObtenir: [
      'Nombre de colis et dimensions de chacun (L × l × h)',
      'Nature des biens et valeur déclarée',
      'Port de départ (Le Havre, Fos/Marseille), dépôt à Rosny-sous-Bois ou enlèvement à domicile (adresse)',
      'Ville de destination précise',
      'Date à laquelle les colis sont prêts',
    ],
    vigilance: VIGILANCE_COMMUNE,
    modeleDescription:
      'Transport en groupage maritime (LCL) de vos marchandises au départ du Havre ou de Fos/Marseille, à destination de {destination}. Le prix est établi sur le volume déclaré, au mètre cube : vos colis voyagent dans un conteneur partagé et sont suivis par notre équipe jusqu’à leur arrivée.',
    modeleMessage:
      'Votre envoi voyage en groupage : vos colis partagent un conteneur avec d’autres expéditions vers {destination}, et vous ne payez que le volume qu’ils occupent. Pour que le prix reste juste, mesurez chaque colis au point le plus large ; un écart constaté au chargement entraîne un ajustement. Merci de nous transmettre l’inventaire de vos colis et leur valeur.',
    modeleNote:
      '- Volume et nombre de colis confirmés\n- Inventaire et valeur reçus\n- Enlèvement, ou dépôt à Rosny-sous-Bois sur rendez-vous, convenu\n- Prochaine clôture vérifiée (rotations)\n- Assurance proposée',
    aCompleter: [
      'Le tarif de 400 €/m³ varie-t-il selon la destination (Antilles, Haïti, Amériques, Afrique) ?',
      'Minimum facturable',
      'Règle poids / volume éventuelle',
      'Supplément palette',
      'Coût de l’enlèvement à domicile (zone, créneaux)',
      'Tarif de l’assurance ad valorem',
      'Emballage exigé',
    ],
  },
  {
    _id: 'fiche-fcl',
    titre: 'Conteneur complet (FCL)',
    ordre: 2,
    libellesFormulaire: ['Conteneur complet (FCL)', 'Full container (FCL)', 'Conteneur complet'],
    resume:
      'Un conteneur 20 ou 40 pieds, dry ou reefer, réservé au seul envoi du client. Adapté aux déménagements complets, aux marchandises professionnelles et aux véhicules.',
    methodeTarif:
      'Le client paie le conteneur entier, quel que soit son remplissage. Prix selon le format (20’ ou 40’), le type (dry ou reefer) et la destination.',
    grille: [
      { designation: 'Conteneur 20’ dry — Antilles et Guyane', unite: 'conteneur' },
      { designation: 'Conteneur 40’ dry — Antilles et Guyane', unite: 'conteneur' },
      { designation: 'Conteneur 20’ dry — Haïti / République Dominicaine', unite: 'conteneur' },
      { designation: 'Conteneur 40’ dry — Haïti / République Dominicaine', unite: 'conteneur' },
      { designation: 'Conteneur reefer (réfrigéré)', unite: 'conteneur', note: 'conditions à préciser' },
    ],
    fraisAnnexes: [
      { designation: 'Enlèvement à domicile', unite: 'envoi', note: 'France métropolitaine, sur demande' },
      { designation: 'Assurance ad valorem', note: 'sur demande écrite, selon la valeur déclarée' },
    ],
    tauxTVADefaut: 0,
    delais: DELAIS_MARITIMES,
    inclus: [
      'Conteneur réservé au seul envoi du client',
      'Organisation de l’acheminement maritime, en qualité de commissionnaire de transport',
      'Aide à la constitution du dossier douane',
    ],
    nonInclus: NON_INCLUS_CGV,
    documents: DOCUMENTS_BASE,
    infosAObtenir: [
      'Format souhaité (20’ ou 40’) et type (dry ou reefer)',
      'Nature des marchandises, poids approximatif et valeur',
      'Lieu de chargement et qui charge le conteneur',
      'Port ou adresse de livraison à destination',
      'Date à laquelle la marchandise est prête',
    ],
    vigilance: [
      ...VIGILANCE_COMMUNE,
      'Frais d’immobilisation du conteneur au-delà de la franchise : non compris, à annoncer au client',
      'Reefer : température et durée de la chaîne du froid à préciser avant de chiffrer',
    ],
    modeleDescription:
      'Transport maritime d’un conteneur complet (FCL) réservé à votre seul envoi, au départ du Havre ou de Fos/Marseille, à destination de {destination}. Le prix couvre le conteneur entier, quel que soit son remplissage.',
    modeleMessage:
      'Le conteneur est réservé à votre seul envoi vers {destination} : votre marchandise ne côtoie aucune autre expédition, et le prix couvre le conteneur entier, quel que soit son remplissage. Nous vous confirmerons la date de mise à disposition et la date de clôture dès votre accord.',
    modeleNote:
      '- Format et type de conteneur confirmés\n- Lieu et date de chargement fixés\n- Qui charge (client ou équipe) convenu\n- Franchise et frais d’immobilisation annoncés\n- Assurance proposée',
    aCompleter: [
      'Prix par conteneur (20’, 40’, reefer) et par destination',
      'Franchise et frais d’immobilisation (surestaries)',
      'Conditions reefer',
      'Livraison porte à porte ou port à port',
      'Empotage : par le client ou par l’équipe',
      'Poids maximal par format',
    ],
  },
  {
    _id: 'fiche-vehicule',
    titre: 'Véhicule / bateau',
    ordre: 3,
    libellesFormulaire: ['Véhicule / bateau', 'Vehicle / boat', 'Véhicules & bateaux', 'Véhicule'],
    resume:
      'Expédition de véhicules roulants ou non (voiture, moto, engin de chantier), de bateaux, jetskis et remorques, en conteneur ou en ro-ro. HGWF Cargo conseille sur la procédure et les formalités douanières.',
    methodeTarif:
      'Chiffré selon le modèle (dimensions, poids, roulant ou non) et le mode de transport : en conteneur ou en ro-ro. Prix selon la destination.',
    grille: [
      { designation: 'Voiture en conteneur', unite: 'véhicule' },
      { designation: 'Voiture en ro-ro', unite: 'véhicule' },
      { designation: 'Moto', unite: 'véhicule' },
      { designation: 'Bateau ou jetski', unite: 'unité', note: 'selon dimensions' },
      { designation: 'Remorque', unite: 'unité' },
      { designation: 'Engin de chantier', unite: 'unité', note: 'selon dimensions et poids' },
    ],
    fraisAnnexes: [{ designation: 'Assurance ad valorem', note: 'sur demande écrite, selon la valeur déclarée' }],
    tauxTVADefaut: 0,
    delais: DELAIS_MARITIMES,
    inclus: [
      'Organisation de l’acheminement maritime, en qualité de commissionnaire de transport',
      'Conseil sur la procédure et les formalités douanières',
    ],
    nonInclus: NON_INCLUS_CGV,
    documents: ['Pièce d’identité', 'Facture ou déclaration de valeur', 'Justificatifs du véhicule : liste exacte à confirmer par l’équipe'],
    infosAObtenir: [
      'Type, marque et modèle',
      'Dimensions et poids',
      'Roulant ou non roulant',
      'Mode souhaité : conteneur ou ro-ro',
      'Effets personnels laissés à bord, ou non',
      'Port ou adresse de livraison',
    ],
    vigilance: [
      ...VIGILANCE_COMMUNE,
      'Formalités douanières propres aux véhicules : vérifier la réglementation de la destination avant de chiffrer',
    ],
    modeleDescription:
      'Expédition maritime de votre véhicule à destination de {destination}, en conteneur ou en ro-ro selon le mode retenu. Nous vous accompagnons dans la procédure et les formalités douanières.',
    modeleMessage:
      'Pour l’expédition de votre véhicule vers {destination}, nous vous accompagnons dans la procédure et les formalités douanières. Merci de nous indiquer s’il est roulant, et si des effets personnels voyagent à bord.',
    modeleNote:
      '- Modèle, dimensions et poids confirmés\n- Roulant ou non, mode (conteneur ou ro-ro) fixé\n- Justificatifs du véhicule reçus\n- Formalités de la destination vérifiées\n- Assurance proposée',
    aCompleter: [
      'Prix par type de véhicule, par mode et par destination',
      'Liste exacte des documents (carte grise, certificat de cession…)',
      'Règles carburant, batterie, effets personnels à bord',
      'Restrictions par destination',
    ],
  },
  {
    _id: 'fiche-demenagement',
    titre: 'Déménagement',
    ordre: 4,
    libellesFormulaire: ['Déménagement', 'Removal', 'Déménagement Outre-mer', 'Overseas removal'],
    resume:
      'Mutation Outre-mer, retraite, retour au pays : tout le foyer (effets personnels, meubles, électroménager, véhicules). Pour militaires, fonctionnaires, salariés et cadres.',
    methodeTarif:
      'À confirmer par l’équipe : au volume (groupage, au m³) ou en conteneur complet selon la taille du foyer. Volumes indicatifs du formulaire : studio / T1 ≈ 5 à 10 m³, T2 – T3 ≈ 10 à 20 m³, maison entière ≈ 20 à 40 m³.',
    grille: [
      { designation: 'Déménagement en groupage', unite: 'm³', note: 'petit volume' },
      { designation: 'Déménagement en conteneur 20’', unite: 'conteneur' },
      { designation: 'Déménagement en conteneur 40’', unite: 'conteneur', note: 'maison entière' },
    ],
    fraisAnnexes: [
      { designation: 'Enlèvement à domicile', unite: 'envoi', note: 'France métropolitaine, sur demande' },
      { designation: 'Véhicule joint au déménagement', unite: 'véhicule', note: 'voir la fiche Véhicule / bateau' },
      { designation: 'Assurance ad valorem', note: 'sur demande écrite, selon la valeur déclarée' },
    ],
    tauxTVADefaut: 0,
    delais: DELAIS_MARITIMES,
    inclus: [
      'Organisation du transport de tout le foyer, en qualité de commissionnaire de transport',
      'Aide à la constitution du dossier douane',
      'Suivi de l’envoi par l’équipe, avec la référence HGWF',
    ],
    nonInclus: NON_INCLUS_CGV,
    documents: [...DOCUMENTS_BASE.slice(0, 2), 'Inventaire détaillé et valorisé du foyer'],
    infosAObtenir: [
      'Volume estimé ou inventaire pièce par pièce',
      'Véhicule à joindre, ou non',
      'Adresse d’enlèvement, étage et accès',
      'Date de départ souhaitée',
      'Contexte : mutation, retraite, retour au pays',
    ],
    vigilance: [
      ...VIGILANCE_COMMUNE,
      'Le volume d’un foyer est souvent sous-estimé : faire confirmer l’inventaire avant le devis définitif',
    ],
    modeleDescription:
      'Déménagement de votre foyer à destination de {destination} : effets personnels, mobilier et électroménager, en groupage ou en conteneur complet selon le volume. Notre équipe vous accompagne à chaque étape, de l’enlèvement à la livraison.',
    modeleMessage:
      'Pour votre déménagement vers {destination}, nous vous accompagnons à chaque étape. Pour affiner le volume et donc le prix, un inventaire pièce par pièce nous aide beaucoup ; nous pouvons aussi l’établir ensemble par téléphone ou WhatsApp.',
    modeleNote:
      '- Inventaire reçu et volume confirmé\n- Groupage ou conteneur tranché\n- Véhicule joint ou non\n- Adresse, accès et date d’enlèvement fixés\n- Assurance proposée',
    aCompleter: [
      'Forfait ou tarification au volume',
      'Emballage fourni ou non',
      'Conditions particulières militaires / fonctionnaires (franchises)',
      'Délai de prise en charge',
    ],
  },
  {
    _id: 'fiche-transport-conteneur',
    titre: 'Transport de conteneur',
    ordre: 5,
    libellesFormulaire: ['Transport de conteneur', 'Container transport'],
    resume: 'Acheminement d’un conteneur, port à port ou porte à porte.',
    methodeTarif: 'À définir par l’équipe : le contenu exact du service n’est écrit nulle part.',
    grille: [
      { designation: 'Port à port', unite: 'conteneur' },
      { designation: 'Porte à porte', unite: 'conteneur', note: 'selon la zone desservie' },
    ],
    fraisAnnexes: [],
    tauxTVADefaut: 0,
    delais: DELAIS_MARITIMES,
    inclus: ['Organisation de l’acheminement, en qualité de commissionnaire de transport'],
    nonInclus: NON_INCLUS_CGV,
    documents: DOCUMENTS_BASE.slice(0, 2),
    infosAObtenir: [
      'Format du conteneur et à qui il appartient',
      'Point d’enlèvement et point de livraison',
      'Contenu, poids et valeur',
      'Date souhaitée',
    ],
    vigilance: [...VIGILANCE_COMMUNE, 'Service encore mal défini : préciser au client ce qui est compris avant tout prix'],
    modeleDescription:
      'Acheminement de votre conteneur à destination de {destination}, port à port ou porte à porte selon l’option retenue.',
    modeleMessage:
      'Pour l’acheminement de votre conteneur vers {destination}, merci de nous préciser le point d’enlèvement, le point de livraison et la date souhaitée : nous vous confirmerons l’option port à port ou porte à porte la plus adaptée.',
    modeleNote: '- Définition du service confirmée avec le client\n- Points d’enlèvement et de livraison fixés\n- Contenu et poids connus',
    aCompleter: [
      'Définition exacte du service (transport terrestre, transfert port à port, location du matériel ?)',
      'Tarifs',
      'Zones desservies en porte à porte',
      'Délais',
      'Documents',
    ],
  },
  {
    _id: 'fiche-fret-aerien',
    titre: 'Fret aérien',
    ordre: 6,
    libellesFormulaire: ['Fret aérien', 'Air freight'],
    resume: 'Envois urgents par avion, délais raccourcis.',
    methodeTarif:
      'À définir par l’équipe (aucune méthode écrite). Attention : le formulaire du site ne demande pas le poids, indispensable en aérien.',
    grille: [{ designation: 'Fret aérien', unite: 'kg', note: 'méthode et destinations à préciser' }],
    fraisAnnexes: [{ designation: 'Assurance ad valorem', note: 'sur demande écrite, selon la valeur déclarée' }],
    tauxTVADefaut: 0,
    delais: [],
    inclus: ['Organisation de l’acheminement aérien, en qualité de commissionnaire de transport'],
    nonInclus: NON_INCLUS_CGV,
    documents: DOCUMENTS_BASE.slice(0, 2),
    infosAObtenir: [
      'Poids réel de chaque colis',
      'Dimensions de chaque colis',
      'Nature des marchandises (piles, liquides, produits réglementés ?)',
      'Aéroport ou ville de destination',
      'Date limite d’arrivée',
    ],
    vigilance: [
      ...VIGILANCE_COMMUNE,
      'Le poids n’est pas demandé par le formulaire : toujours le réclamer avant de chiffrer',
      'Marchandises dangereuses : règles aériennes plus strictes que le maritime',
    ],
    modeleDescription: 'Expédition par fret aérien de vos colis à destination de {destination}, pour un acheminement rapide.',
    modeleMessage:
      'Pour un envoi aérien vers {destination}, le prix dépend du poids et des dimensions de chaque colis : merci de nous les transmettre, ainsi que la nature des marchandises.',
    modeleNote: '- Poids et dimensions reçus\n- Nature des marchandises vérifiée (dangereuses ?)\n- Date limite d’arrivée connue',
    aCompleter: [
      'Aéroports de départ et d’arrivée',
      'Partenaires',
      'Méthode de calcul (poids taxable, poids volumétrique)',
      'Tarif au kilo et minimum',
      'Délais',
      'Limites de colis',
      'Ajouter un champ poids au formulaire du site',
    ],
  },
  {
    _id: 'fiche-stockage',
    titre: 'Entrepôt & box de stockage',
    ordre: 7,
    libellesFormulaire: ['Entrepôt & box de stockage', 'Warehouse & storage boxes', 'Box de stockage', 'Stockage'],
    resume: 'Location d’espaces de stockage, courte ou longue durée, à Rosny-sous-Bois.',
    methodeTarif: 'Loyer mensuel selon le gabarit du box. Grille, durée minimale et dépôt de garantie à arrêter.',
    grille: [
      { designation: 'Box — petit gabarit', unite: 'mois', note: 'surface à préciser' },
      { designation: 'Box — grand gabarit', unite: 'mois', note: 'surface à préciser' },
    ],
    fraisAnnexes: [{ designation: 'Dépôt de garantie', note: 'montant à arrêter' }],
    tauxTVADefaut: 20,
    delais: [],
    inclus: ['Mise à disposition d’un box au centre de Rosny-sous-Bois'],
    nonInclus: ['Assurance du contenu, sauf mention contraire'],
    documents: ['Pièce d’identité', 'Justificatif de domicile (à confirmer)'],
    infosAObtenir: ['Surface ou volume souhaité', 'Durée prévue', 'Date d’entrée', 'Nature des biens stockés'],
    vigilance: [
      'Objets interdits au stockage : liste à établir',
      'Accès au centre sur rendez-vous : horaires à préciser au client',
    ],
    modeleDescription:
      'Location d’un box de stockage au centre logistique de Rosny-sous-Bois, pour la durée de votre choix.',
    modeleMessage:
      'Nos box de stockage se situent au centre logistique de Rosny-sous-Bois. Merci de nous indiquer la surface souhaitée, la durée et la date d’entrée : nous vous proposerons le box adapté.',
    modeleNote: '- Gabarit et durée fixés\n- Date d’entrée convenue\n- Contrat et dépôt de garantie prêts',
    aCompleter: [
      'Nombre de box, surfaces, loyer mensuel par gabarit',
      'Durée minimale et préavis',
      'Dépôt de garantie',
      'Assurance du contenu',
      'Horaires d’accès',
      'Contrat de location',
      'Objets interdits',
      'Taux de TVA à valider (location en France)',
    ],
  },
  {
    _id: 'fiche-conteneur-occasion',
    titre: 'Vente de conteneurs d’occasion',
    ordre: 8,
    libellesFormulaire: ['Conteneur d’occasion', "Conteneur d'occasion", 'Used container', 'Vente de conteneurs'],
    resume:
      'Vente de conteneurs « dernier voyage » (fin de carrière maritime), 20 ou 40 pieds : stockage, espaces modulaires (foodtruck, paillotte, base vie de chantier).',
    methodeTarif: 'Prix par conteneur selon la taille et l’état, plus la livraison selon l’adresse.',
    grille: [
      { designation: 'Conteneur 20’ dernier voyage', unite: 'conteneur', note: 'selon état' },
      { designation: 'Conteneur 40’ dernier voyage', unite: 'conteneur', note: 'selon état' },
    ],
    fraisAnnexes: [{ designation: 'Livraison', unite: 'livraison', note: 'selon l’adresse' }],
    tauxTVADefaut: 20,
    delais: [],
    inclus: ['Conteneur d’occasion de la taille choisie'],
    nonInclus: ['Livraison, sauf mention au devis'],
    documents: [],
    infosAObtenir: ['Taille souhaitée (20’ ou 40’)', 'Usage prévu', 'Adresse de livraison', 'Accès pour le camion de livraison'],
    vigilance: ['Vente de bien en France : TVA au taux normal, sauf régime particulier (CGV)', 'Vérifier le stock disponible avant de répondre'],
    modeleDescription:
      'Vente d’un conteneur d’occasion « dernier voyage », livré à l’adresse convenue.',
    modeleMessage:
      'Nos conteneurs d’occasion sont des conteneurs « dernier voyage », en fin de carrière maritime, idéals pour du stockage ou un aménagement. Merci de nous préciser la taille souhaitée et l’adresse de livraison.',
    modeleNote: '- Taille et état confirmés\n- Stock vérifié\n- Adresse et accès de livraison connus',
    aCompleter: ['Prix par taille et par état', 'Stock disponible', 'Conditions et prix de livraison'],
  },
];
