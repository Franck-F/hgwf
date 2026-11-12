/**
 * Feuille de style unique du back-office V2 (spécification, 2.2 et 7), refonte
 * visuelle « maquette bleu nuit / bleu vif / orange ».
 *
 * - Classes préfixées `bo-`, variables CSS déclarées sur `.bo-racine`, reset
 *   local des éléments de formulaire : le CSS du Studio ne fuit pas.
 * - Jamais de `position: fixed` : `.bo-racine` est son propre conteneur de
 *   défilement, les barres collantes y sont `sticky`, le voile de modale y est
 *   `absolute` (calé en JS par `Modale`).
 * - Aucune taille de texte sous 12 px ; aucune police mono ; aucun @import.
 * - La grande carte blanche (`.bo-coque`), la barre latérale, les listes et les
 *   cartes « accès rapide » sont dans `stylesCoque.ts`.
 *
 * Classes de mise en page offertes aux vues (les vues n'ont pas de CSS à elles) :
 *   bo-coque, bo-nav, bo-nav-lien(--actif), bo-contenu, bo-page, bo-page-entete,
 *   bo-titres, bo-titre-page, bo-sous-titre, bo-rangee (flex, retour à la ligne),
 *   bo-espace (pousse à droite), bo-pile (colonne), bo-grille (2 colonnes),
 *   bo-dossier-grille (principal + latéral), bo-groupe, bo-groupe-titre,
 *   bo-compteur, bo-tableau, bo-bandeau(--urgent|--info|--neutre), bo-puces,
 *   bo-puce, bo-secondaire (texte 13 px), bo-fort, bo-lien, bo-barre-collante,
 *   bo-recherche, bo-resultats, bo-carre (bouton-icône orange), bo-sr.
 */
import { COULEURS_UI, ESPACEMENTS, MOUVEMENT, OMBRES, POLICES, RAYONS, VARIABLES_COULEURS } from './tokens';
import type { NomCouleur } from './tokens';
import { COQUE, MOBILE } from './stylesCoque';

/** Couples fond/texte des badges : exportés pour le test de contraste (≥ 4,5:1). */
export const COULEURS_BADGES = {
  neutre: { fond: COULEURS_UI.creme, texte: COULEURS_UI.ardoise },
  info: { fond: COULEURS_UI.accentPale, texte: COULEURS_UI.cielTexte },
  attention: { fond: '#fff0cf', texte: COULEURS_UI.orTexte },
  urgent: { fond: '#ffe6d2', texte: COULEURS_UI.corailTexte },
  ok: { fond: COULEURS_UI.okFond, texte: COULEURS_UI.ok },
} as const;

const variables = [
  ...(Object.keys(COULEURS_UI) as NomCouleur[]).map((n) => `${VARIABLES_COULEURS[n]}:${COULEURS_UI[n]};`),
  ...ESPACEMENTS.map((v, i) => `--bo-e${i + 1}:${v}px;`),
  `--bo-police:${POLICES.texte};--bo-police-titre:${POLICES.titre};`,
  `--bo-rayon:${RAYONS.champ}px;--bo-rayon-carte:${RAYONS.carte}px;--bo-rayon-badge:${RAYONS.badge}px;`,
  `--bo-ombre:${OMBRES.carte};--bo-ombre-modale:${OMBRES.modale};--bo-ombre-coque:${OMBRES.coque};`,
  `--bo-mvt:${MOUVEMENT.duree} ${MOUVEMENT.courbe};`,
  '--bo-survol:#f5f7fb;',
].join('');

const base = `
.bo-racine{${variables}height:100%;overflow:auto;position:relative;background:var(--bo-fond-page);color:var(--bo-texte);font:400 14px/1.5 var(--bo-police);-webkit-font-smoothing:antialiased}
.bo-racine *,.bo-racine *::before,.bo-racine *::after{box-sizing:border-box}
:where(.bo-racine) button,:where(.bo-racine) input,:where(.bo-racine) select,:where(.bo-racine) textarea{font:inherit;color:inherit;margin:0;letter-spacing:normal}
/* :where() ramène la spécificité du reset à 0 : sans cela (0,1,1) il écrasait
   .bo-bouton--*, .bo-segment--actif… (0,1,0) et les boutons s'affichaient en texte nu. */
:where(.bo-racine) button{background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.bo-racine h1,.bo-racine h2,.bo-racine h3,.bo-racine h4,.bo-racine p,.bo-racine ul,.bo-racine ol{margin:0;padding:0}
.bo-racine ul,.bo-racine ol{list-style:none}
.bo-racine h1,.bo-racine h2,.bo-racine h3{font-family:var(--bo-police-titre);font-weight:600;color:var(--bo-marine);text-transform:none;letter-spacing:0}
.bo-racine :focus-visible{outline:3px solid var(--bo-focus);outline-offset:2px}
.bo-racine [hidden]{display:none!important}
.bo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bo-secondaire{font-size:13px;color:var(--bo-ardoise)}
.bo-fort{font-weight:600}
.bo-lien{color:var(--bo-accent);font-weight:500;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.bo-rangee{display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e2)}
.bo-espace{margin-left:auto}
.bo-pile{display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--bo-e3) var(--bo-e4)}
.bo-grille--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.bo-grille--1{grid-template-columns:minmax(0,1fr)}
${MOBILE}{.bo-grille{grid-template-columns:minmax(0,1fr)}}
`;

const composants = `
.bo-bouton{display:inline-flex;align-items:center;justify-content:center;gap:var(--bo-e2);min-height:44px;padding:0 var(--bo-e4);border:1.5px solid transparent;border-radius:22px;font-weight:600;font-size:14px;line-height:1.2;text-align:center;white-space:nowrap;transition:background var(--bo-mvt),border-color var(--bo-mvt)}
.bo-bouton--s{min-height:36px;padding:0 var(--bo-e3);font-size:13px;border-radius:18px}
.bo-bouton--primaire{background:var(--bo-accent);color:#fff}
.bo-bouton--primaire:hover:not(:disabled){background:var(--bo-accent-fonce)}
.bo-bouton--secondaire{background:var(--bo-surface);border-color:var(--bo-accent);color:var(--bo-accent)}
.bo-bouton--secondaire:hover:not(:disabled){background:var(--bo-accent-pale)}
.bo-bouton--discret{color:var(--bo-accent);text-decoration:underline;text-underline-offset:3px}
.bo-bouton--discret:hover:not(:disabled){background:var(--bo-accent-pale)}
.bo-bouton--danger{background:var(--bo-surface);border-color:var(--bo-corail-texte);color:var(--bo-corail-texte)}
.bo-bouton--danger:hover:not(:disabled){background:var(--bo-mise-en-avant)}
.bo-bouton:disabled{opacity:.55;cursor:not-allowed}
.bo-rond{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:bo-tour 700ms linear infinite}
@keyframes bo-tour{to{transform:rotate(360deg)}}
.bo-icone{flex:none}
.bo-carre{display:inline-flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:8px;background:var(--bo-corail);color:var(--bo-marine);transition:background var(--bo-mvt)}
.bo-carre:hover{background:var(--bo-corail-survol)}
.bo-menu{position:relative;display:inline-block}
.bo-menu .bo-menu-declencheur{width:44px;min-height:44px;padding:0;border-radius:8px;border-color:transparent;background:var(--bo-creme);color:var(--bo-ardoise)}
.bo-menu .bo-menu-declencheur:hover{background:var(--bo-bordure)}
.bo-menu-liste{position:absolute;top:calc(100% + 4px);right:0;z-index:30;min-width:260px;padding:var(--bo-e1);background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre-modale);display:flex;flex-direction:column}
.bo-menu-item{display:block;width:100%;min-height:44px;padding:var(--bo-e2) var(--bo-e3);border-radius:var(--bo-rayon);font-size:14px;white-space:normal}
.bo-menu-item:hover:not(:disabled),.bo-menu-item:focus-visible{background:var(--bo-creme)}
.bo-menu-item:focus-visible{outline:2px solid var(--bo-accent);outline-offset:-2px}
.bo-menu-item:disabled{opacity:.5;cursor:not-allowed}
.bo-menu-item--danger{color:var(--bo-corail-texte)}
.bo-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:var(--bo-rayon-badge);border:1px solid transparent;font-size:12px;font-weight:600;line-height:1.5;white-space:nowrap}
${(Object.entries(COULEURS_BADGES) as [string, { fond: string; texte: string }][])
  .map(([t, c]) => `.bo-badge--${t}{background:${c.fond};color:${c.texte};border-color:${c.texte}33}`)
  .join('\n')}
.bo-carte{background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);padding:var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-carte-titre{font-size:16px}
.bo-section{background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte)}
.bo-section-titre{font-size:16px}
.bo-section-bouton{display:flex;align-items:center;gap:var(--bo-e3);width:100%;min-height:56px;padding:var(--bo-e3) var(--bo-e4);border-radius:var(--bo-rayon-carte)}
.bo-section-bouton:hover{background:var(--bo-survol)}
.bo-section-nom{font:600 16px var(--bo-police-titre);color:var(--bo-marine)}
.bo-section-resume{flex:1;min-width:0;font:400 13px var(--bo-police);color:var(--bo-ardoise);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bo-section-chevron{margin-left:auto;display:flex;color:var(--bo-ardoise);transition:transform var(--bo-mvt)}
.bo-section--ouverte .bo-section-chevron{transform:rotate(180deg)}
.bo-section-corps{padding:0 var(--bo-e4) var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-etat-vide{display:flex;flex-direction:column;align-items:center;gap:var(--bo-e2);padding:var(--bo-e5) var(--bo-e4);text-align:center;background:var(--bo-creme);border-radius:var(--bo-rayon-carte)}
.bo-etat-vide-titre{font-size:18px}
.bo-etat-vide-phrase{color:var(--bo-ardoise);max-width:46ch}
.bo-manques{display:flex;gap:var(--bo-e2);align-items:flex-start;padding:var(--bo-e3);border-radius:var(--bo-rayon);background:#fff0cf;border:1.5px solid var(--bo-or);color:var(--bo-or-texte)}
.bo-manques-titre{font-weight:600}
.bo-manques-liste{list-style:disc!important;padding-left:var(--bo-e4)!important}
.bo-manques-icone{padding-top:1px}
.bo-frise{display:flex;flex-wrap:wrap;gap:var(--bo-e1) 0;width:100%}
.bo-frise-etape{display:flex;align-items:center;gap:var(--bo-e2);flex:1 1 0;min-width:96px;font-size:13px;color:var(--bo-ardoise);position:relative}
.bo-frise-etape::after{content:"";flex:1;height:2px;margin:0 var(--bo-e2);background:var(--bo-bordure)}
.bo-frise-etape:last-child::after{display:none}
.bo-frise-point{display:flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--bo-bordure);background:var(--bo-surface);color:#fff}
.bo-frise-etape--faite .bo-frise-point{background:var(--bo-ok);border-color:var(--bo-ok)}
.bo-frise-etape--faite::after{background:var(--bo-ok)}
.bo-frise-etape--courante{color:var(--bo-marine);font-weight:600}
.bo-frise-etape--courante .bo-frise-point{border-color:var(--bo-accent);background:var(--bo-accent);box-shadow:0 0 0 4px var(--bo-accent-pale)}
.bo-frise--urgent .bo-frise-etape--courante{color:var(--bo-corail-texte)}
.bo-frise--urgent .bo-frise-etape--courante .bo-frise-point{border-color:var(--bo-corail-texte);background:var(--bo-corail-texte);box-shadow:0 0 0 4px var(--bo-mise-en-avant)}
.bo-frise--neutre .bo-frise-etape--courante .bo-frise-point{background:var(--bo-ardoise);border-color:var(--bo-ardoise);box-shadow:none}
.bo-frise-libelle{white-space:nowrap}
${MOBILE}{.bo-frise{flex-direction:column}.bo-frise-etape::after{display:none}.bo-frise-libelle{white-space:normal}}
.bo-segments{display:flex;flex-wrap:wrap;gap:var(--bo-e2);max-width:100%}
.bo-segment{display:inline-flex;align-items:center;gap:var(--bo-e2);min-height:44px;padding:0 var(--bo-e4);border-radius:22px;background:var(--bo-creme);font-weight:500;color:var(--bo-marine);transition:background var(--bo-mvt)}
.bo-segment:hover{background:var(--bo-bordure)}
.bo-segment--actif,.bo-segment--actif:hover{background:var(--bo-accent);color:#fff;font-weight:600}
.bo-segment-compteur{min-width:24px;padding:0 7px;border-radius:var(--bo-rayon-badge);background:var(--bo-surface);color:var(--bo-marine);font-size:12px;font-weight:600;line-height:22px;text-align:center}
.bo-segment--actif .bo-segment-compteur{background:rgba(9,27,74,.32);color:#fff}
.bo-squelette{display:flex;flex-direction:column;gap:var(--bo-e2)}
.bo-squelette-bloc{height:56px;border-radius:var(--bo-rayon-carte);background:linear-gradient(90deg,var(--bo-creme),#e2e8f2,var(--bo-creme));background-size:200% 100%;animation:bo-brille 1.4s ease-in-out infinite}
.bo-squelette-bloc--entete{height:96px}
.bo-squelette-bloc--carte{height:180px}
@keyframes bo-brille{to{background-position:-200% 0}}
`;

// Fil « Échanges » du dossier : une réponse non lue porte un liseré orange, jamais la couleur seule (badge « Non lu »).
const echanges = `
.bo-echange{display:flex;flex-direction:column;gap:var(--bo-e2);padding:var(--bo-e3);background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:var(--bo-rayon)}
.bo-echange--nonlu{border-left:5px solid var(--bo-corail);background:var(--bo-mise-en-avant)}
.bo-echange-texte{white-space:pre-wrap;overflow-wrap:anywhere}
.bo-pieces{display:flex;flex-wrap:wrap;gap:var(--bo-e2)}
.bo-piece{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 var(--bo-e3);border:1.5px solid var(--bo-bordure);border-radius:22px;color:var(--bo-accent);font-weight:600;text-decoration:none}
.bo-piece:hover{background:var(--bo-accent-pale)}
`;

const formulaires = `
.bo-champ{display:flex;flex-direction:column;gap:6px;border:0;padding:0;margin:0;min-width:0}
.bo-champ-entete{display:flex;align-items:center;gap:var(--bo-e2);min-height:24px}
.bo-etiquette{font-size:13px;font-weight:600;color:var(--bo-texte)}
.bo-requis{font-size:12px;font-weight:600;color:var(--bo-ardoise);padding:0 6px;border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-badge)}
.bo-saisie{width:100%;min-height:44px;padding:var(--bo-e2) var(--bo-e3);background:var(--bo-surface);border:1.5px solid var(--bo-bordure-champ);border-radius:var(--bo-rayon);font-size:14px}
.bo-saisie:read-only{background:var(--bo-creme);border-color:var(--bo-bordure)}
.bo-zone{resize:vertical;min-height:84px;line-height:1.5}
.bo-champ--erreur .bo-saisie{border-color:var(--bo-corail-texte);border-width:2px}
.bo-erreur{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--bo-corail-texte)}
.bo-montant{display:flex;align-items:center;gap:var(--bo-e2)}
.bo-montant-saisie{flex:0 1 200px;width:auto;min-width:0;text-align:left}
.bo-montant-unite{flex:none;color:var(--bo-ardoise);font-weight:600}
.bo-aide{position:relative;display:inline-flex}
.bo-aide-bouton{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--bo-bordure);background:var(--bo-surface);color:var(--bo-accent);font-size:13px;font-weight:700;line-height:1}
.bo-infobulle{position:absolute;left:0;top:calc(100% + 6px);z-index:25;width:max-content;max-width:280px;padding:var(--bo-e2) var(--bo-e3);border-radius:var(--bo-rayon);background:var(--bo-marine);color:#fff;font-size:13px;font-weight:400;visibility:hidden;opacity:0;transition:opacity var(--bo-mvt)}
.bo-aide:hover .bo-infobulle,.bo-aide:focus-within .bo-infobulle{visibility:visible;opacity:1}
.bo-tva-options{display:flex;gap:var(--bo-e2)}
.bo-tva-option{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 var(--bo-e4);border:1.5px solid var(--bo-accent);border-radius:22px;background:var(--bo-surface);color:var(--bo-accent);font-weight:600;cursor:pointer}
.bo-tva-option input{position:absolute;opacity:0;inset:0;cursor:pointer;margin:0}
.bo-tva-option:has(input:checked){background:var(--bo-accent);color:#fff}
.bo-tva-option:has(input:focus-visible){outline:3px solid var(--bo-focus);outline-offset:2px}
.bo-voile{position:absolute;left:0;top:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:var(--bo-e3);background:rgba(13,39,102,.55)}
.bo-modale{display:flex;flex-direction:column;width:min(640px,100%);max-height:100%;background:var(--bo-surface);border-radius:24px;box-shadow:var(--bo-ombre-modale)}
.bo-modale--large{width:min(1080px,100%)}
.bo-modale-entete{display:flex;align-items:center;gap:var(--bo-e3);padding:var(--bo-e4);border-bottom:1.5px solid var(--bo-bordure)}
.bo-modale-titre{flex:1;font-size:20px}
.bo-modale-fermer{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:8px;background:var(--bo-creme);color:var(--bo-ardoise)}
.bo-modale-fermer:hover{background:var(--bo-bordure)}
.bo-modale-corps{padding:var(--bo-e4);overflow:auto;display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-modale-pied{display:flex;justify-content:flex-end;align-items:center;gap:var(--bo-e3);flex-wrap:wrap;padding:var(--bo-e3) var(--bo-e4);border-top:1.5px solid var(--bo-bordure)}
.bo-confirmation{display:flex;gap:var(--bo-e2);align-items:flex-start}
.bo-confirmation--danger{color:var(--bo-corail-texte);font-weight:600}
.bo-toasts{position:sticky;bottom:0;z-index:60;height:0;overflow:visible;pointer-events:none}
.bo-toasts-pile{position:absolute;right:var(--bo-e4);bottom:var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e2);width:min(380px,calc(100% - 32px))}
.bo-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:var(--bo-e2);padding:var(--bo-e3);background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-left-width:5px;border-radius:var(--bo-rayon);box-shadow:var(--bo-ombre-modale)}
.bo-toast--succes{border-left-color:var(--bo-ok);color:var(--bo-ok)}
.bo-toast--erreur{border-left-color:var(--bo-corail-texte);color:var(--bo-corail-texte)}
.bo-toast-message{flex:1;color:var(--bo-texte);font-weight:500}
.bo-toast-fermer{display:flex;padding:4px;border-radius:var(--bo-rayon);color:var(--bo-ardoise)}
@media (prefers-reduced-motion:reduce){.bo-racine *,.bo-racine *::before,.bo-racine *::after{animation:none!important;transition:none!important}}
`;

export const FEUILLE_DE_STYLE = [base, COQUE, composants, echanges, formulaires].join('\n').replace(/^\s*\n/gm, '');
