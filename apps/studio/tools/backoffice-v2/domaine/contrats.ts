/**
 * Contrats du back-office V2 : signatures seulement (spécification 12.2, n° 5).
 *
 * Ce fichier appartient au lot socle et à nul autre. Il permet d'écrire en
 * parallèle les vues (qui consomment ces types), les hooks de `data/` et les
 * verbes de `actions/` (qui les implémentent). Aucun import de `sanity`, aucun
 * import de React : uniquement des types.
 *
 * Découpé en trois fichiers pour respecter la limite de 300 lignes, tous au
 * lot socle ; importer toujours depuis `domaine/contrats` (ce fichier réexporte
 * `contratsActions.ts` et `contratsHooks.ts`).
 */
import type { ContexteEcriture } from './contratsActions';
import type {
  Brouillon,
  Dossier,
  LigneAFaire,
  MoyenHorsOutil,
  MotifRefus,
  ValeurBrouillon,
} from './types';

export * from './contratsActions';
export * from './contratsHooks';

// ── (a) Résultat typé de toute action ───────────────────────────────────────

export type MotifEchec = 'conflit' | 'perime' | 'reseau' | 'cle' | 'refus' | 'manques';

/**
 * Toute fonction de `actions/` renvoie ce type : jamais d'exception non gérée.
 * `T` décrit les données d'un succès (objet, fusionné avec `ok: true`).
 */
export type Resultat<T extends object = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      motif: MotifEchec;
      message: string;
      manques?: string[];
      /**
       * Vrai quand le geste a déjà écrit dans Sanity avant d'échouer (brouillon enregistré, puis
       * l'API en panne). Le dossier gardé en mémoire est alors périmé : l'appelant le relit, vide
       * `champsEnregistres` du brouillon et ne REJOUE JAMAIS le geste avec l'ancienne révision.
       */
      ecritureFaite?: boolean;
      champsEnregistres?: string[];
    };

// ── (b) Action principale (4.3) ─────────────────────────────────────────────

export type FenetreDossier =
  | 'envoi'
  | 'complement'
  | 'suivi'
  | 'notifier'
  | 'reprise'
  | 'refus'
  | 'horsOutil';

export type IdAction =
  | 'prendreEnCharge'
  | 'envoyerDevis'
  | 'demanderComplements'
  | 'terminerEnvoi'
  | 'accepter'
  | 'creerExpedition'
  | 'declencherPEC'
  | 'marquerExpedie'
  | 'avancerSuivi'
  | 'marquerLivre'
  | 'reprendre'
  | 'rouvrir'
  | 'aucune';

export interface ActionPrincipale {
  id: IdAction;
  /** Texte du bouton. */
  libelle: string;
  /** Si présent : `Confirmation` avant exécution. */
  confirmation?: { titre: string; consequence: string; verbe: string };
  /** Si présent : ouvre la fenêtre, pas d'exécution directe. */
  ouvre?: FenetreDossier;
  /** Vide = bouton actif. Chaque élément est une phrase (« le montant HT »). */
  manques: string[];
  /** Phrase de la carte « Prochaine étape ». */
  phrase?: string;
}

/** Signature de `domaine/actionPrincipale.ts` (registre unique, fonction pure). */
export type CalculerActionPrincipale = (dossier: Dossier, brouillon: Brouillon) => ActionPrincipale;

// ── (c) Geste gardé (5.5) ───────────────────────────────────────────────────

/** Tout geste qui change le statut d'une demande ou la prise en charge d'une expédition. */
export type Geste =
  | { type: 'prendreEnCharge' }
  | { type: 'envoyerDevis'; objet?: string; message?: string }
  | { type: 'envoyerComplement'; objet?: string; message?: string }
  | { type: 'terminerEnvoi' }
  | { type: 'accepter' }
  | { type: 'accepterSansDevis' }
  | { type: 'devisHorsOutil'; date: string; moyen: MoyenHorsOutil }
  | { type: 'refuser'; motif: MotifRefus }
  | { type: 'creerExpedition' }
  | { type: 'declencherPEC' }
  | { type: 'marquerExpedie' }
  | { type: 'avancerSuivi'; etape: number; eta?: string; notifier: boolean }
  | { type: 'marquerLivre'; notifier: boolean }
  | { type: 'corrigerEtape'; etape: number }
  | { type: 'notifierEtapeActuelle'; eta?: string }
  | { type: 'signalerIncident' }
  | { type: 'reprendre'; choix: 0 | 1 | 2 | null }
  | { type: 'annuler' }
  | { type: 'rouvrir' };

export interface ResultatGeste {
  /** Nombre de patchs réellement écrits (règle 5.5 : un seul pour un geste sans API). */
  patchs: number;
  /** Nouvelle `_rev` du document modifié, mémorisée dans `revisionsLocales`. */
  rev?: string;
  /** Message pour le toast de succès. */
  message?: string;
  /** Champs du brouillon désormais enregistrés (à vider du brouillon). */
  champsEnregistres: string[];
  /** Vrai si l'API a répondu « ignoré » (client déjà prévenu de cette étape). */
  dejaPrevenu?: boolean;
  /** Vrai si le statut n'a pas pu être posé après un envoi réussi (4.4). */
  statutACorriger?: boolean;
  /**
   * L'écriture (étape, ETA) a réussi mais l'e-mail au client n'est pas parti. Succès partiel : la
   * fenêtre propose « Réessayer l'e-mail » sur la révision relue, sans rejouer l'écriture.
   */
  notificationEchouee?: { motif: MotifEchec; message: string };
}

/**
 * Règle unique du geste gardé : évaluer sur le document effectif, un seul
 * patch champs + statut, aucune écriture si un manque subsiste. Implémentée
 * une seule fois dans `actions/gestes.ts`.
 */
export type AppliquerGeste = (
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
  geste: Geste,
) => Promise<Resultat<ResultatGeste>>;

// ── (g) Props communes des sections et fenêtres de la page Dossier ──────────

export interface SectionDossierProps {
  dossier: Dossier;
  brouillon: Brouillon;
  modifier: (champ: string, valeur: ValeurBrouillon) => void;
  lectureSeule: boolean;
  ouverte: boolean;
  onBasculer: () => void;
}

export interface FenetreEnvoiProps {
  dossier: Dossier;
  brouillon: Brouillon;
  mode: 'devis' | 'complement';
  onFermer: () => void;
  onTermine: () => void;
}

export interface FenetreSuiviProps {
  dossier: Dossier;
  brouillon: Brouillon;
  mode: 'avancer' | 'notifier' | 'livrer';
  onFermer: () => void;
  onTermine: () => void;
}

export interface ReprisePanelProps {
  dossier: Dossier;
  brouillon: Brouillon;
  onFermer: () => void;
  onTermine: () => void;
}

/** Fenêtre de geste de secours (refus, devis hors outil) : montée par le lot 10. */
export interface FenetreGesteProps {
  dossier: Dossier;
  fenetre: 'refus' | 'horsOutil';
  onFermer: () => void;
  onTermine: () => void;
}

/** Fourni par `DossierPage` à `ProchaineEtape` et à l'en-tête (4.3). */
export interface ContexteDossier {
  ouvrirFenetre: (f: FenetreDossier) => void;
  executerAction: (id: IdAction) => Promise<Resultat<ResultatGeste>>;
}

export interface LigneAFaireProps {
  ligne: LigneAFaire;
  /** Vrai pour la première ligne de l'accueil : seule à porter le bouton plein. */
  principale: boolean;
  onOuvrir: (dossierId: string) => void;
}

// ── Props des pages (montées par la coque, lot 8) ───────────────────────────

/** `id` = `_id` de la demande (ou de l'expédition seule) ; `'nouveau'` = mode création (4.3). */
export interface DossierPageProps {
  id: string;
}

export interface FicheClientProps {
  id: string;
}

export type SectionOutils =
  | 'conteneurs'
  | 'rotations'
  | 'fiches'
  | 'chiffres'
  | 'export'
  | 'connexion';

export interface OutilsProps {
  section: SectionOutils;
}

export type VueDossiers = 'enCours' | 'devis' | 'expeditions' | 'termines';

export interface DossiersProps {
  vue: VueDossiers;
}

