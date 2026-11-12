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

/**
 * Palette de l'interface (refonte visuelle, maquette « bleu nuit / bleu vif /
 * orange »). `COULEURS` ci-dessus reste la palette du site et du PDF du devis :
 * le document remis au client ne change pas avec l'écran.
 *
 * Contrastes (WCAG, texte normal 4,5:1) : blanc sur `accent` 5,2:1 ; `marine`
 * sur blanc 14:1 ; `ardoise` sur blanc 6:1 et sur `creme` 5,3:1 ; `corailTexte`
 * sur `miseEnAvant` 4,9:1. L'orange `corail` n'est jamais un fond de texte
 * blanc (2,8:1) : il colore des fonds d'icône, des pastilles et des filets.
 */
export const COULEURS_UI = {
  fondPage: '#0d2766',
  marine: '#0d2766',
  marineAbysse: '#091b4a',
  marineFonce: '#0a1f55',
  accent: '#1565d8',
  accentFonce: '#0f4fb0',
  accentPale: '#e6eefc',
  ciel: '#1565d8',
  cielTexte: '#0f4fb0',
  corail: '#f47920',
  corailTexte: '#b3400a',
  corailSurvol: '#db6410',
  or: '#f4a236',
  orTexte: '#7a4b00',
  papier: '#ffffff',
  surface: '#ffffff',
  creme: '#eef1f6',
  texte: '#1e2433',
  ardoise: '#5b6475',
  iconeGris: '#9aa3b4',
  bordure: '#d9dee7',
  bordureChamp: '#8c95a8',
  miseEnAvant: '#fff0e3',
  ok: '#1b6b44',
  okFond: '#e1f3e9',
  focus: '#1565d8',
} as const;

export type NomCouleur = keyof typeof COULEURS_UI;

/** Nom de variable CSS (déclarée sur `.bo-racine`) pour chaque couleur de l'interface. */
export const VARIABLES_COULEURS: Record<NomCouleur, string> = {
  fondPage: '--bo-fond-page',
  marine: '--bo-marine',
  marineAbysse: '--bo-marine-abysse',
  marineFonce: '--bo-marine-fonce',
  accent: '--bo-accent',
  accentFonce: '--bo-accent-fonce',
  accentPale: '--bo-accent-pale',
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
  iconeGris: '--bo-icone-gris',
  bordure: '--bo-bordure',
  bordureChamp: '--bo-bordure-champ',
  miseEnAvant: '--bo-mise-en-avant',
  ok: '--bo-ok',
  okFond: '--bo-ok-fond',
  focus: '--bo-focus',
};

export const POLICES = {
  texte: "'Poppins', system-ui, sans-serif",
  titre: "'Poppins', system-ui, sans-serif",
} as const;

/** Échelle de taille en px. 12 est le minimum absolu (spécification 5.4). */
export const TAILLES = [12, 13, 15, 18, 22, 28] as const;
export const TAILLE_MINIMALE = 12;

/** Espacement `--bo-e1…e6`, en px. */
export const ESPACEMENTS = [4, 8, 12, 16, 24, 40] as const;

/** Rayons en px. */
export const RAYONS = { champ: 8, carte: 14, badge: 999 } as const;

export const OMBRES = {
  carte: '0 1px 2px rgba(13,39,102,.08)',
  modale: '0 12px 40px rgba(13,39,102,.28)',
  coque: '0 30px 60px rgba(10,30,90,.25)',
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
/** Largeur maximale de la grande carte blanche qui porte toute l'application, en px. */
export const LARGEUR_MAX_COQUE = 1400;
/** Largeur de la barre latérale, en px. */
export const LARGEUR_BARRE_LATERALE = 248;
/** Épaisseur de l'anneau de focus, en px. */
export const ANNEAU_FOCUS = 3;
