/**
 * Jetons de design du back-office V2 (spécification, section 7).
 *
 * Source unique : la feuille de style (`styles.ts`), le kit `ui/` et le PDF du
 * devis (`pdf/devisPdf.ts`) importent tous d'ici, pour qu'aucune palette ne
 * soit dupliquée. Les valeurs reprennent `apps/web/src/app/globals.css`.
 */

/** Couleurs, en hexadécimal : le PDF en a besoin tel quel (pas de var() CSS). */
export const COULEURS = {
  marine: '#063565',
  marineAbysse: '#04203c',
  marineFonce: '#052c54',
  ciel: '#51a5dd',
  cielTexte: '#1f6a9e',
  corail: '#fd7f5a',
  corailTexte: '#b44224',
  corailSurvol: '#ec6a44',
  or: '#fdb53d',
  orTexte: '#7a5200',
  papier: '#fcf7ed',
  surface: '#ffffff',
  creme: '#fbf4e6',
  texte: '#04203c',
  ardoise: '#45566a',
  bordure: '#e5dcc8',
  ok: '#1f6b45',
  okFond: '#e3f1e8',
  focus: '#51a5dd',
} as const;

export type NomCouleur = keyof typeof COULEURS;

/** Nom de variable CSS (déclarée sur `.bo-racine`) pour chaque couleur. */
export const VARIABLES_COULEURS: Record<NomCouleur, string> = {
  marine: '--bo-marine',
  marineAbysse: '--bo-marine-abysse',
  marineFonce: '--bo-marine-fonce',
  ciel: '--bo-ciel',
  cielTexte: '--bo-ciel-texte',
  corail: '--bo-corail',
  corailTexte: '--bo-corail-texte',
  corailSurvol: '--bo-corail-survol',
  or: '--bo-or',
  orTexte: '--bo-or-texte',
  papier: '--bo-papier',
  surface: '--bo-surface',
  creme: '--bo-creme',
  texte: '--bo-texte',
  ardoise: '--bo-ardoise',
  bordure: '--bo-bordure',
  ok: '--bo-ok',
  okFond: '--bo-ok-fond',
  focus: '--bo-focus',
};

export const POLICES = {
  texte: "'Barlow', system-ui, sans-serif",
  titre: "'Saira Condensed', 'Barlow', system-ui, sans-serif",
} as const;

/** Échelle de taille en px. 12 est le minimum absolu (spécification 5.4). */
export const TAILLES = [12, 13, 15, 18, 22, 28] as const;
export const TAILLE_MINIMALE = 12;

/** Espacement `--bo-e1…e6`, en px. */
export const ESPACEMENTS = [4, 8, 12, 16, 24, 40] as const;

/** Rayons en px. */
export const RAYONS = { champ: 6, carte: 10, badge: 999 } as const;

export const OMBRES = {
  carte: '0 1px 2px rgba(4,32,60,.08)',
  modale: '0 12px 40px rgba(4,32,60,.25)',
} as const;

export const MOUVEMENT = {
  duree: '150ms',
  courbe: 'cubic-bezier(.25,1,.5,1)',
} as const;

/** Points de rupture en px. */
export const POINTS_DE_RUPTURE = {
  /** Sous cette largeur : barre latérale remplacée par une barre d'onglets. */
  navigation: 900,
  /** Sous cette largeur : colonne latérale du dossier empilée. */
  colonneLaterale: 1000,
} as const;

/** Largeur utile maximale des pages, en px. */
export const LARGEUR_MAX_PAGE = 1200;
/** Largeur de la barre latérale, en px. */
export const LARGEUR_BARRE_LATERALE = 208;
/** Épaisseur de l'anneau de focus, en px. */
export const ANNEAU_FOCUS = 3;
