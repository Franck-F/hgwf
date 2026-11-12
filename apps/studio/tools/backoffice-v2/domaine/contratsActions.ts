/**
 * Contrats du back-office V2, suite : client Sanity minimal injecté, contexte
 * d'écriture et verbes de `actions/` (spécification 8.3, 12.2 n° 5 (a), (e)).
 * Lot socle. Importer depuis `domaine/contrats`.
 */
import type {
  ActionPrincipale,
  IdAction,
  Resultat,
  ResultatGeste,
} from './contrats';
import type {
  Brouillon,
  Demande,
  Dossier,
  Expedition,
  MoyenHorsOutil,
  MotifRefus,
  Utilisateur,
} from './types';

// ── Client Sanity minimal (injecté, pour des tests avec faux client) ────────

/** Ce que les actions utilisent d'un client Sanity. Un faux client suffit aux tests. */
export interface ClientLike {
  fetch<T = unknown>(requete: string, params?: Record<string, unknown>): Promise<T>;
  getDocument<T = unknown>(id: string): Promise<T | undefined>;
  patch(id: string): PatchLike;
  create(doc: Record<string, unknown>): Promise<{ _id: string; _rev: string }>;
  createIfNotExists(doc: Record<string, unknown>): Promise<{ _id: string; _rev: string }>;
  transaction(): TransactionLike;
  /** Absent dans le faux client du harnais : l'actualisation retombe sur focus + 60 s. */
  listen?: (requete: string, params?: Record<string, unknown>) => {
    subscribe: (observer: (evenement: unknown) => void) => { unsubscribe: () => void };
  };
}

export interface PatchLike {
  set(champs: Record<string, unknown>): PatchLike;
  unset(champs: string[]): PatchLike;
  inc(champs: Record<string, number>): PatchLike;
  ifRevisionId(rev: string): PatchLike;
  commit(): Promise<{ _id: string; _rev: string }>;
}

export interface TransactionLike {
  create(doc: Record<string, unknown>): TransactionLike;
  createIfNotExists(doc: Record<string, unknown>): TransactionLike;
  patch(id: string, operations: (p: PatchLike) => PatchLike): TransactionLike;
  commit(): Promise<unknown>;
}

/** Tout ce dont une action a besoin ; construit par `useGestes` et par les tests. */
export interface ContexteEcriture {
  client: ClientLike;
  utilisateur: Utilisateur;
  /** Horloge injectable (le harnais fixe « maintenant » au 06/11/2026 à 09h00). */
  maintenant: () => Date;
  /** Mémorise la `_rev` renvoyée par une écriture réussie (8.2). */
  memoriserRevision: (rev: string) => void;
  /** Appel à l'API d'envoi (`actions/envoi.ts`) ; remplaçable par un faux `fetch`. */
  appelerApi: AppelerApi;
  /**
   * Vrai si la clé d'envoi est enregistrée. Testé AVANT toute écriture d'un geste qui appelle
   * ensuite l'API : sans clé, on la demande d'abord au lieu d'écrire puis de rejouer sur une
   * révision périmée. Absent (tests, faux contexte) : pas de contrôle préalable.
   */
  cleDisponible?: () => boolean;
}

// ── (e) Verbes de `actions/` ────────────────────────────────────────────────

export type MomentApi = 'devis' | 'complement' | 'expedition' | 'apercu' | 'suggestion';

export interface ReponseApi {
  ok: boolean;
  statut: number;
  corps: Record<string, unknown>;
}

/** Gabarit unique d'appel à l'API (clé, en-têtes, 401, erreurs normalisées). */
export type AppelerApi = (
  route: string,
  corps: Record<string, unknown>,
) => Promise<Resultat<{ reponse: ReponseApi }>>;

export interface ApercuEnvoi {
  de: string;
  a: string;
  pieceJointe: string;
  objet: string;
  message: string;
}

export interface SuggestionDescription {
  description: string;
}

export interface NouveauDossierSaisie {
  clientNom: string;
  telephone?: string;
  email?: string;
  typeEnvoi: string;
  destination: string;
  volume?: string;
  message?: string;
}

/** Les verbes métier : chacun passe par `appliquerGeste` ou par `ecriture.ts`. */
export interface VerbesActions {
  prendreEnCharge(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  envoyerDevis(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { objet: string; message: string },
  ): Promise<Resultat<ResultatGeste>>;
  envoyerComplement(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { objet: string; message: string },
  ): Promise<Resultat<ResultatGeste>>;
  /** Aucun e-mail : relit, constate `devisEnvoyeLe`, pose le statut 2 sous `ifRevisionId`. */
  terminerEnvoi(ctx: ContexteEcriture, dossier: Dossier): Promise<Resultat<ResultatGeste>>;
  accepter(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  accepterSansDevis(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  devisHorsOutil(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { date: string; moyen: MoyenHorsOutil },
  ): Promise<Resultat<ResultatGeste>>;
  complementHorsOutil(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { date: string; moyen: MoyenHorsOutil },
  ): Promise<Resultat<ResultatGeste>>;
  creerDossierManuel(ctx: ContexteEcriture, saisie: NouveauDossierSaisie): Promise<Resultat<{ dossierId: string }>>;
  refuser(ctx: ContexteEcriture, dossier: Dossier, motif: MotifRefus): Promise<Resultat<ResultatGeste>>;
  rouvrir(ctx: ContexteEcriture, dossier: Dossier): Promise<Resultat<ResultatGeste>>;
  convertirEnExpedition(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  declencherPriseEnCharge(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  marquerExpedie(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<ResultatGeste>>;
  avancerSuivi(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { etape: number; eta?: string; notifier: boolean },
  ): Promise<Resultat<ResultatGeste>>;
  /** Unique chemin vers l'étape 4 : étape 4 et prise en charge 3 dans UN patch. */
  marquerLivre(
    ctx: ContexteEcriture,
    dossier: Dossier,
    brouillon: Brouillon,
    saisie: { notifier: boolean },
  ): Promise<Resultat<ResultatGeste>>;
  notifierEtapeActuelle(ctx: ContexteEcriture, dossier: Dossier, eta?: string): Promise<Resultat<ResultatGeste>>;
  signalerIncident(ctx: ContexteEcriture, dossier: Dossier): Promise<Resultat<ResultatGeste>>;
  reprendre(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon, choix: 0 | 1 | 2 | null): Promise<Resultat<ResultatGeste>>;
  annuler(ctx: ContexteEcriture, dossier: Dossier): Promise<Resultat<ResultatGeste>>;
  /** Gestes immédiats hors barre : n'écrivent que leurs propres champs. */
  marquerReglement(ctx: ContexteEcriture, expedition: Expedition, recu: boolean): Promise<Resultat<ResultatGeste>>;
  autoriserDepart(ctx: ContexteEcriture, expedition: Expedition, motif: string): Promise<Resultat<ResultatGeste>>;
  /** Pose le champ « réponse du client » (réversible, sans confirmation). */
  clientAReponduAuxComplements(ctx: ContexteEcriture, demande: Demande): Promise<Resultat<ResultatGeste>>;
  apercuEnvoi(ctx: ContexteEcriture, dossier: Dossier, mode: 'devis' | 'complement'): Promise<Resultat<{ apercu: ApercuEnvoi }>>;
  suggererDescription(ctx: ContexteEcriture, dossier: Dossier, brouillon: Brouillon): Promise<Resultat<SuggestionDescription>>;
}

/** Gestes de secours exposés par `useGestes` (tracés, date et auteur). */
export interface GestesSecours {
  devisHorsOutil(saisie: { date: string; moyen: MoyenHorsOutil }): Promise<Resultat<ResultatGeste>>;
  complementHorsOutil(saisie: { date: string; moyen: MoyenHorsOutil }): Promise<Resultat<ResultatGeste>>;
  accepterSansDevis(): Promise<Resultat<ResultatGeste>>;
  refuser(motif: MotifRefus): Promise<Resultat<ResultatGeste>>;
  signalerIncident(): Promise<Resultat<ResultatGeste>>;
  annuler(): Promise<Resultat<ResultatGeste>>;
  corrigerEtape(etape: number): Promise<Resultat<ResultatGeste>>;
  clientARepondu(): Promise<Resultat<ResultatGeste>>;
}

export interface ResultatUseGestes {
  /** Applique la règle 5.5 pour l'action principale `id`. */
  executerAction: (id: IdAction) => Promise<Resultat<ResultatGeste>>;
  actionPrincipale: ActionPrincipale;
  secours: GestesSecours;
}
export type UseGestes = (dossier: Dossier | null, brouillon: Brouillon) => ResultatUseGestes;

