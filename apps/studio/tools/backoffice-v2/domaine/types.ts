/**
 * Types métier du back-office V2 (spécification, sections 3 et 11).
 *
 * Tous les champs sauf l'identité sont optionnels : un document ancien, ou un
 * champ ajouté par la V2 (section 11), peut être absent et l'outil doit
 * fonctionner quand même.
 */

export interface RefSanity {
  _ref: string;
  _type?: 'reference';
  _weak?: boolean;
}

interface DocumentBase {
  _id: string;
  /** Révision Sanity : base de `ifRevisionId` pour toute écriture. */
  _rev: string;
  _createdAt?: string;
  _updatedAt?: string;
}

export type SourceDemande = 'site' | 'telephone' | 'email';
export type MotifRefus = 'prix' | 'delai' | 'autreTransporteur' | 'abandon' | 'autre';
export type MoyenHorsOutil = 'email' | 'whatsapp' | 'emailPersonnel' | 'mainPropre' | 'autre';
export type TypeFacturation = 'particulier' | 'professionnel';

export interface Demande extends DocumentBase {
  _type: 'demandeDevis';
  reference?: string;
  clientNom?: string;
  email?: string;
  telephone?: string;
  preferenceContact?: string;
  /** Chaîne « mail · tél » historique, lue par `rapprochement.ts`. */
  contact?: string;
  typeEnvoi?: string;
  ficheService?: RefSanity;
  destination?: string;
  volume?: string;
  /** « JJ/MM/AAAA » ou « JJ/MM/AAAA à HHhMM ». */
  recueLe?: string;
  /** Index de `STATUTS_DEMANDE`. Jamais réordonné. */
  statut?: number;
  message?: string;

  montantHT?: number;
  tauxTVA?: number;
  /** Ancien montant texte : lecture seule, jamais converti ni mélangé à `montantHT`. */
  montantDevis?: string;
  descriptionPrestation?: string;
  delaiEstime?: string;
  devisEnvoyeLe?: string;
  devisEnvoyeA?: string;
  accuseReceptionLe?: string;
  relanceEnvoyeeLe?: string;
  complementDemandeLe?: string;
  complementDemandeA?: string;
  /** Compléments demandés hors de l'outil (Outlook…) : moyen utilisé. */
  complementDemandeHorsOutil?: MoyenHorsOutil;
  complementDemandePar?: string;
  notes?: string;
  /** Référence (texte) de l'expédition liée, jamais son `_id`. */
  expeditionRef?: string;

  facturationType?: TypeFacturation;
  facturationNom?: string;
  facturationAdresse?: string;
  facturationCodePostal?: string;
  facturationVille?: string;
  facturationPays?: string;
  facturationSiret?: string;
  facturationTvaIntracom?: string;

  // Champs ajoutés par la V2 (section 11), tous optionnels.
  reponseClientLe?: string;
  acceptationLe?: string;
  acceptationPar?: string;
  devisEnvoyeHorsOutilLe?: string;
  devisEnvoyeHorsOutilPar?: string;
  devisEnvoyeHorsOutilMoyen?: MoyenHorsOutil;
  sourceDemande?: SourceDemande;
  motifRefus?: MotifRefus;
  numeroFacture?: string;
}

export interface Expedition extends DocumentBase {
  _type: 'expedition';
  reference?: string;
  clientNom?: string;
  email?: string;
  telephone?: string;
  contact?: string;
  demandeRef?: string;
  trajet?: string;
  /** Index de `ETAPES_EXPEDITION` (suivi client). */
  etape?: number;
  /** « JJ/MM/AAAA » ou « À PLANIFIER ». */
  eta?: string;
  /** Index de `STATUTS_PRISE_EN_CHARGE`. */
  statutPriseEnCharge?: number;
  mode?: string;
  expediteurNom?: string;
  expediteurAdresse?: string;
  expediteurTel?: string;
  destinataireNom?: string;
  destinataireAdresse?: string;
  destinataireTel?: string;
  colisNombre?: number;
  colisPoids?: number;
  colisVolume?: number;
  colisNature?: string;
  valeurDeclaree?: number;
  reglementRecu?: boolean;
  derogationDepart?: boolean;
  derogationMotif?: string;
  numeroReservation?: string;
  numeroConteneur?: string;
  notesExploitation?: string;
  derniereEtapeNotifiee?: number;
  derniereNotificationLe?: string;
  priseEnChargeLe?: string;

  // Champs ajoutés par la V2 (section 11), tous optionnels.
  /** 0 à 3 : prise en charge juste avant Incident ou Annulé (3.3). */
  statutAvantIncident?: number;
  reglementRecuLe?: string;
  derogationLe?: string;
  derogationPar?: string;
}

export interface ClientFiche extends DocumentBase {
  _type: 'clientFiche';
  nom?: string;
  /** Chaîne « mail · tél ». */
  contact?: string;
  destination?: string;
  /** Compteurs manuels : plus affichés, toujours écrits à la conversion. */
  envois?: number;
  volume?: string;
}

export interface Conteneur extends DocumentBase {
  _type: 'conteneurOccasion';
  reference?: string;
  taille?: string;
  etat?: string;
  lieu?: string;
  prix?: string;
  /** Index de `STATUTS_CONTENEUR`. */
  statut?: number;
}

export interface Rotation extends DocumentBase {
  _type: 'rotation';
  nom?: string;
  /** « JJ/MM », sans année : lue par `lireDateRotation`. */
  cloture?: string;
  depart?: string;
  remplissage?: number;
}

export interface LigneGrille {
  _key?: string;
  designation?: string;
  unite?: string;
  prixHT?: number | null;
  note?: string;
}

export interface Fiche extends DocumentBase {
  _type: 'ficheService';
  titre?: string;
  ordre?: number;
  actif?: boolean;
  /** Libellés du formulaire public qui se rattachent à cette fiche. */
  libellesFormulaire?: string[];
  resume?: string;
  methodeTarif?: string;
  grille?: LigneGrille[];
  fraisAnnexes?: LigneGrille[];
  tauxTVADefaut?: number | null;
  delais?: { _key?: string; zone?: string; delai?: string }[];
  inclus?: string[];
  nonInclus?: string[];
  documents?: string[];
  infosAObtenir?: string[];
  vigilance?: string[];
  modeleDescription?: string;
  modeleMessage?: string;
  modeleNote?: string;
  aCompleter?: string[];
}

/** Pièce jointe d'une réponse : `url` est lue avec l'échange (`fichier.asset->url`). */
export interface PieceEchange {
  _key: string;
  nom?: string;
  typeMime?: string;
  taille?: number;
  url?: string;
}

/**
 * Réponse d'un client à un e-mail du back-office, déposée par l'API (webhook de
 * réception). Dans la liste du magasin, `texte` et `pieces` sont absents (lus à
 * l'ouverture du dossier) ; seul `lu` pilote le signal « Réponse reçue ».
 */
export interface Echange extends DocumentBase {
  _type: 'echange';
  /** Référence de la demande (« HGWF-2026-1234 »). */
  reference?: string;
  /** `_id` de la demande liée, quand elle a été trouvée. */
  demandeId?: string;
  /** `recu` : réponse du client ; `envoye` : e-mail envoyé par l'équipe depuis l'outil. */
  sens?: 'recu' | 'envoye';
  de?: string;
  a?: string;
  objet?: string;
  texte?: string;
  /** Date ISO de réception. */
  recuLe?: string;
  pieces?: PieceEchange[];
  lu?: boolean;
  transfereLe?: string;
  /** Envoi de l'équipe : membre qui a envoyé. */
  envoyePar?: string;
  /** Envoi de l'équipe : `_id` de l'échange auquel il répond. */
  enReponseA?: string;
  /** `false` : le message ne vient pas de l'adresse de la demande (ou authentification en échec). */
  expediteurVerifie?: boolean;
  motifNonVerifie?: string;
  erreur?: string;
}

/**
 * Un dossier = une demande + son éventuelle expédition (3.1). Cas dégénéré :
 * expédition seule (`demande` absente), identifiée par l'`_id` de l'expédition.
 */
export interface Dossier {
  /** `_id` de la demande, sinon `_id` de l'expédition seule. Sert dans l'itinéraire `#/dossier/<id>`. */
  id: string;
  demande?: Demande;
  expedition?: Expedition;
  /** Réponses reçues du client ; absent = non chargé (les anciens appels n'en ont pas). */
  echanges?: Echange[];
}

/** Phase unique que voit l'équipe, calculée par `phases.ts` (3.2). */
export type Phase =
  | 'nouvelle'
  | 'aChiffrer'
  | 'reponseRecue'
  | 'devisPartiStatutACorriger'
  | 'devisEnvoye'
  | 'devisHorsOutil'
  | 'accepte'
  | 'aPreparer'
  | 'pret'
  | 'enRoute'
  | 'livre'
  | 'incident'
  | 'annule'
  | 'sansSuite';

/**
 * Valeur d'un champ de brouillon. `undefined` n'est jamais stocké : un champ
 * vidé est représenté par `null` (le patch fera un `unset`).
 */
export type ValeurBrouillon = string | number | boolean | null;

/** Champs modifiés d'un dossier, clés = noms de champs Sanity. */
export type Brouillon = Record<string, ValeurBrouillon>;

export interface Utilisateur {
  id: string;
  /** Nom affiché et écrit comme auteur des gestes tracés. */
  nom: string;
}

/** Les quatre groupes de l'accueil « À faire » (4.1). */
export type IdGroupeAFaire = 'aOuvrir' | 'devis' | 'sansReponse' | 'expeditions';

export interface LigneAFaire {
  dossierId: string;
  client: string;
  reference: string;
  /** Raison en une ligne (« Reçue il y a 2 jours »). */
  raison: string;
  /** Âge affiché en jours calendaires. */
  ageJours: number;
  /** Rouge : seuil de retard dépassé (calculé en âge ouvré). */
  enRetard: boolean;
  /** Libellé de l'action principale du dossier. */
  actionLibelle: string;
  phase: Phase;
  /** Réponses du client pas encore lues (0 si aucune). */
  nbNonLus: number;
}

export interface GroupeAFaire {
  id: IdGroupeAFaire;
  titre: string;
  lignes: LigneAFaire[];
}

export interface LigneAttente extends LigneAFaire {
  /** Pourquoi le dossier attend (« Devis envoyé il y a 3 jours »). */
  attente: string;
}

export interface ProchaineCloture {
  rotationId: string;
  nom: string;
  /** Date lue (jamais le texte JJ/MM). */
  cloture: Date;
  depart: Date | null;
}

/** Résultat de la recherche globale (4.8). */
export interface ResultatRecherche {
  dossiers: { dossierId: string; client: string; reference: string; detail: string }[];
  clients: { clientId: string; nom: string; detail: string }[];
}

/** Données agrégées chargées une fois par le magasin (8.2). */
export interface DonneesMagasin {
  demandes: Demande[];
  expeditions: Expedition[];
  clients: ClientFiche[];
  conteneurs: Conteneur[];
  rotations: Rotation[];
  fiches: Fiche[];
  /** Réponses des clients, version légère (sans texte ni pièces). */
  echanges: Echange[];
}
