/**
 * Contrats du back-office V2, suite : signatures des hooks de `data/` et du
 * contexte d'application (spécification 8.2, 12.2 n° 5 (d), (f)). Lot socle.
 * Importer depuis `domaine/contrats`.
 */
import type {
  Brouillon,
  ClientFiche,
  Conteneur,
  DonneesMagasin,
  Dossier,
  Fiche,
  GroupeAFaire,
  LigneAttente,
  ProchaineCloture,
  ResultatRecherche,
  Rotation,
  ValeurBrouillon,
} from './types';

// ── (d) Signatures des hooks de `data/` ─────────────────────────────────────

export interface Magasin {
  donnees: DonneesMagasin;
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
  /** `_rev` écrites par ce poste : une relecture qui les retrouve n'est pas un conflit. */
  revisionsLocales: Set<string>;
  memoriserRevision: (rev: string) => void;
}

export type UseMagasin = () => Magasin;

export interface ResultatUseDossiers {
  dossiers: Dossier[];
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
}
export type UseDossiers = () => ResultatUseDossiers;

export interface ResultatUseDossier {
  /** `null` = introuvable (« Ce dossier n'existe plus »). */
  dossier: Dossier | null;
  chargement: boolean;
  erreur: string | null;
  /** Vrai si un changement distant (hors de ce poste) a été détecté. */
  conflit: boolean;
  recharger: () => Promise<void>;
}
export type UseDossier = (id: string) => ResultatUseDossier;

export interface ResultatUseAFaire {
  groupes: GroupeAFaire[];
  attente: LigneAttente[];
  prochaineCloture: ProchaineCloture | null;
  chargement: boolean;
  erreur: string | null;
  /** Nombre d'éléments urgents (pastille de la navigation). */
  nbUrgents: number;
}
export type UseAFaire = () => ResultatUseAFaire;

export interface ResultatUseClients {
  clients: ClientFiche[];
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
}
export type UseClients = () => ResultatUseClients;

export type UseRecherche = (texte: string) => ResultatRecherche;

export interface ResultatUseBrouillon {
  brouillon: Brouillon;
  modifier: (champ: string, valeur: ValeurBrouillon) => void;
  /** Nombre de champs réellement différents du document chargé. */
  nbModifications: number;
  annuler: () => void;
  /** Retire du brouillon les champs enregistrés avec succès. */
  vider: (champs: string[]) => void;
}
export type UseBrouillon = (dossier: Dossier | null) => ResultatUseBrouillon;

export interface ResultatUseOutils {
  conteneurs: Conteneur[];
  rotations: Rotation[];
  fiches: Fiche[];
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
}
export type UseOutils = () => ResultatUseOutils;

// ── (f) Contexte d'application ──────────────────────────────────────────────

export interface ResultatUseRoute {
  /** Chemin courant sans le « # » (ex. `/dossier/abc`). */
  chemin: string;
  naviguer: (chemin: string, options?: { remplacer?: boolean }) => void;
  /**
   * Garde de navigation : une vue qui a des saisies non enregistrées
   * l'enregistre ; `quitter` renvoie `false` si l'utilisateur refuse.
   */
  garde: {
    definir: (verifier: (() => boolean | Promise<boolean>) | null) => void;
  };
}
export type UseRoute = () => ResultatUseRoute;

export interface ResultatUseToasts {
  succes: (message: string) => void;
  erreur: (message: string) => void;
}
export type UseToasts = () => ResultatUseToasts;

export interface ResultatUseCleApi {
  presente: boolean;
  /** Ouvre la fenêtre « Clé d'envoi » ; `true` si une clé a été enregistrée. */
  demanderCle: () => Promise<boolean>;
  oublier: () => void;
}
export type UseCleApi = () => ResultatUseCleApi;

/** Élément racine `.bo-racine` : conteneur de défilement, hôte des modales (2.2). */
export type UseRacine = () => HTMLElement;

