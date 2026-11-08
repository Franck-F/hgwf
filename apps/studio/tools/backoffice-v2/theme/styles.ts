/**
 * Feuille de style unique du back-office V2 (spécification, 2.2 et 7).
 *
 * - Classes préfixées `bo-`, variables CSS déclarées sur `.bo-racine`, reset
 *   local des éléments de formulaire : le CSS du Studio ne fuit pas.
 * - Jamais de `position: fixed` : `.bo-racine` est son propre conteneur de
 *   défilement, les barres collantes y sont `sticky`, le voile de modale y est
 *   `absolute` (calé en JS par `Modale`).
 * - Aucune taille de texte sous 12 px ; aucune police mono ; aucun @import.
 *
 * Classes de mise en page offertes aux vues (les vues n'ont pas de CSS à elles) :
 *   bo-coque, bo-nav, bo-nav-lien(--actif), bo-contenu, bo-page, bo-page-entete,
 *   bo-titre-page, bo-rangee (flex, retour à la ligne), bo-espace (pousse à droite),
 *   bo-pile (colonne), bo-grille (2 colonnes), bo-dossier-grille (principal + latéral),
 *   bo-groupe, bo-groupe-titre, bo-compteur, bo-tableau, bo-bandeau(--urgent|--info|--neutre),
 *   bo-puces, bo-puce, bo-secondaire (texte 13 px), bo-fort, bo-lien, bo-barre-collante,
 *   bo-recherche, bo-resultats, bo-sr (lecteurs d'écran seulement).
 */
import { COULEURS, ESPACEMENTS, MOUVEMENT, OMBRES, POINTS_DE_RUPTURE, POLICES, RAYONS, VARIABLES_COULEURS } from './tokens';
import type { NomCouleur } from './tokens';

/** Couples fond/texte des badges : exportés pour le test de contraste (≥ 4,5:1). */
export const COULEURS_BADGES = {
  neutre: { fond: COULEURS.creme, texte: COULEURS.ardoise },
  info: { fond: '#e4f1fa', texte: COULEURS.cielTexte },
  attention: { fond: '#fff0cf', texte: COULEURS.orTexte },
  urgent: { fond: '#fde8e0', texte: COULEURS.corailTexte },
  ok: { fond: COULEURS.okFond, texte: COULEURS.ok },
} as const;

const variables = [
  ...(Object.keys(COULEURS) as NomCouleur[]).map((n) => `${VARIABLES_COULEURS[n]}:${COULEURS[n]};`),
  ...ESPACEMENTS.map((v, i) => `--bo-e${i + 1}:${v}px;`),
  `--bo-police:${POLICES.texte};--bo-police-titre:${POLICES.titre};`,
  `--bo-rayon:${RAYONS.champ}px;--bo-rayon-carte:${RAYONS.carte}px;--bo-rayon-badge:${RAYONS.badge}px;`,
  `--bo-ombre:${OMBRES.carte};--bo-ombre-modale:${OMBRES.modale};`,
  `--bo-mvt:${MOUVEMENT.duree} ${MOUVEMENT.courbe};`,
].join('');

const mobile = `@media (max-width:${POINTS_DE_RUPTURE.navigation - 1}px)`;
const etroit = `@media (max-width:${POINTS_DE_RUPTURE.colonneLaterale - 1}px)`;

const base = `
.bo-racine{${variables}height:100%;overflow:auto;position:relative;background:var(--bo-papier);color:var(--bo-texte);font:400 15px/1.45 var(--bo-police);-webkit-font-smoothing:antialiased}
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
.bo-fort{font-weight:700}
.bo-lien{color:var(--bo-marine);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.bo-rangee{display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e2)}
.bo-espace{margin-left:auto}
.bo-pile{display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--bo-e3) var(--bo-e4)}
.bo-grille--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.bo-grille--1{grid-template-columns:minmax(0,1fr)}
${mobile}{.bo-grille{grid-template-columns:minmax(0,1fr)}}
`;

const mise = `
.bo-coque{display:grid;grid-template-columns:208px minmax(0,1fr);min-height:100%}
.bo-nav{background:var(--bo-marine-abysse);color:#fff}
.bo-nav>.bo-nav-interne{position:sticky;top:0;display:flex;flex-direction:column;gap:var(--bo-e1);padding:var(--bo-e4) var(--bo-e2)}
.bo-nav-lien{display:flex;align-items:center;gap:var(--bo-e2);min-height:44px;padding:0 var(--bo-e3);border-radius:var(--bo-rayon);color:#fff;font-size:15px;font-weight:600}
.bo-nav-lien:hover{background:rgba(255,255,255,.1)}
.bo-nav-lien--actif{background:#fff;color:var(--bo-marine)}
.bo-nav-pastille{margin-left:auto;min-width:22px;padding:0 6px;border-radius:var(--bo-rayon-badge);background:var(--bo-corail);color:var(--bo-marine-abysse);font-size:13px;font-weight:700;text-align:center}
.bo-contenu{min-width:0}
.bo-page{max-width:1200px;margin:0 auto;padding:var(--bo-e5) var(--bo-e4) var(--bo-e6);display:flex;flex-direction:column;gap:var(--bo-e4)}
.bo-page-entete{display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e3)}
.bo-titre-page{font-size:28px;line-height:1.1}
.bo-dossier-grille{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:var(--bo-e4);align-items:start}
${etroit}{.bo-dossier-grille{grid-template-columns:minmax(0,1fr)}}
.bo-barre-collante{position:sticky;bottom:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e3);padding:var(--bo-e3) var(--bo-e4);background:var(--bo-surface);border-top:1px solid var(--bo-bordure);box-shadow:0 -1px 2px rgba(4,32,60,.08)}
.bo-groupe{display:flex;flex-direction:column;gap:var(--bo-e2)}
.bo-groupe-titre{display:flex;align-items:center;gap:var(--bo-e2);font-size:22px}
.bo-compteur{min-width:24px;padding:0 8px;border-radius:var(--bo-rayon-badge);background:var(--bo-creme);border:1px solid var(--bo-bordure);color:var(--bo-ardoise);font:600 13px/22px var(--bo-police);text-align:center}
.bo-bandeau{display:flex;gap:var(--bo-e2);align-items:center;flex-wrap:wrap;padding:var(--bo-e3) var(--bo-e4);border-radius:var(--bo-rayon-carte);border:1px solid var(--bo-bordure);background:var(--bo-surface);font-weight:600}
.bo-bandeau--urgent{background:#fde8e0;border-color:var(--bo-corail);color:var(--bo-corail-texte)}
.bo-bandeau--info{background:#e4f1fa;border-color:var(--bo-ciel);color:var(--bo-ciel-texte)}
.bo-bandeau--neutre{background:var(--bo-creme);color:var(--bo-ardoise)}
.bo-puces{display:flex;flex-wrap:wrap;gap:var(--bo-e2)}
.bo-puce{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 var(--bo-e3);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-badge);background:var(--bo-surface);color:var(--bo-marine);font-size:13px;font-weight:600;text-decoration:none}
.bo-puce:hover{background:var(--bo-creme)}
.bo-recherche{position:relative;flex:1;max-width:520px}
.bo-resultats{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre-modale);padding:var(--bo-e2);display:flex;flex-direction:column;gap:var(--bo-e1)}
.bo-tableau{width:100%;border-collapse:collapse;font-size:15px}
.bo-tableau th{text-align:left;font-size:13px;font-weight:600;color:var(--bo-ardoise);padding:var(--bo-e2) var(--bo-e3);border-bottom:1px solid var(--bo-bordure)}
.bo-tableau td{padding:var(--bo-e3);border-bottom:1px solid var(--bo-bordure);vertical-align:top}
.bo-tableau tbody tr:hover{background:var(--bo-creme)}
.bo-nom-lien{font-weight:700;color:var(--bo-marine);text-align:left}
.bo-nom-lien:hover{text-decoration:underline;text-underline-offset:2px}
${mobile}{
.bo-coque{grid-template-columns:minmax(0,1fr);grid-template-rows:1fr auto}
.bo-nav{position:sticky;bottom:0;z-index:10;order:2}
.bo-nav>.bo-nav-interne{position:static;flex-direction:row;padding:var(--bo-e1)}
.bo-nav-lien{flex:1;justify-content:center;min-height:48px;padding:0 var(--bo-e1);font-size:13px}
.bo-page{padding:var(--bo-e4) var(--bo-e3)}
.bo-titre-page{font-size:22px}
.bo-tableau thead{display:none}
.bo-tableau,.bo-tableau tbody,.bo-tableau tr,.bo-tableau td{display:block;width:100%}
.bo-tableau tr{margin-bottom:var(--bo-e2);background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte)}
.bo-tableau td{border:0;padding:var(--bo-e1) var(--bo-e3)}
.bo-tableau td[data-etiquette]::before{content:attr(data-etiquette) " : ";font-size:13px;font-weight:600;color:var(--bo-ardoise)}
.bo-segments{width:100%}
.bo-segment{flex:1;justify-content:center;padding:0 var(--bo-e2)}}
`;

const composants = `
.bo-bouton{display:inline-flex;align-items:center;justify-content:center;gap:var(--bo-e2);min-height:40px;padding:0 var(--bo-e4);border:1px solid transparent;border-radius:var(--bo-rayon);font-weight:600;font-size:15px;line-height:1.2;text-align:center;white-space:nowrap;transition:background var(--bo-mvt),border-color var(--bo-mvt)}
.bo-bouton--s{min-height:32px;padding:0 var(--bo-e3);font-size:13px}
.bo-bouton--primaire{background:var(--bo-marine);color:#fff}
.bo-bouton--primaire:hover:not(:disabled){background:var(--bo-marine-fonce)}
.bo-bouton--secondaire{background:var(--bo-surface);border-color:var(--bo-marine);color:var(--bo-marine)}
.bo-bouton--secondaire:hover:not(:disabled){background:var(--bo-creme)}
.bo-bouton--discret{color:var(--bo-marine);text-decoration:underline;text-underline-offset:3px}
.bo-bouton--discret:hover:not(:disabled){background:var(--bo-creme)}
.bo-bouton--danger{background:var(--bo-surface);border-color:var(--bo-corail-texte);color:var(--bo-corail-texte)}
.bo-bouton--danger:hover:not(:disabled){background:#fde8e0}
.bo-bouton:disabled{opacity:.55;cursor:not-allowed}
.bo-rond{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:bo-tour 700ms linear infinite}
@keyframes bo-tour{to{transform:rotate(360deg)}}
.bo-icone{flex:none}
.bo-menu{position:relative;display:inline-block}
.bo-menu-declencheur{padding:0 var(--bo-e3)}
.bo-menu-liste{position:absolute;top:calc(100% + 4px);right:0;z-index:30;min-width:260px;padding:var(--bo-e1);background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre-modale);display:flex;flex-direction:column}
.bo-menu-item{display:block;width:100%;min-height:40px;padding:var(--bo-e2) var(--bo-e3);border-radius:var(--bo-rayon);font-size:15px;white-space:normal}
.bo-menu-item:hover:not(:disabled),.bo-menu-item:focus-visible{background:var(--bo-creme)}
.bo-menu-item:focus-visible{outline:2px solid var(--bo-marine);outline-offset:-2px}
.bo-menu-item:disabled{opacity:.5;cursor:not-allowed}
.bo-menu-item--danger{color:var(--bo-corail-texte)}
.bo-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:var(--bo-rayon-badge);border:1px solid transparent;font-size:13px;font-weight:600;line-height:1.4;white-space:nowrap}
${(Object.entries(COULEURS_BADGES) as [string, { fond: string; texte: string }][])
  .map(([t, c]) => `.bo-badge--${t}{background:${c.fond};color:${c.texte};border-color:${c.texte}33}`)
  .join('\n')}
.bo-carte{background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre);padding:var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-carte-titre{font-size:18px}
.bo-section{background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre)}
.bo-section-titre{font-size:18px}
.bo-section-bouton{display:flex;align-items:center;gap:var(--bo-e3);width:100%;min-height:52px;padding:var(--bo-e3) var(--bo-e4);border-radius:var(--bo-rayon-carte)}
.bo-section-nom{font:600 18px var(--bo-police-titre);color:var(--bo-marine)}
.bo-section-resume{flex:1;min-width:0;font:400 13px var(--bo-police);color:var(--bo-ardoise);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bo-section-chevron{margin-left:auto;display:flex;color:var(--bo-ardoise);transition:transform var(--bo-mvt)}
.bo-section--ouverte .bo-section-chevron{transform:rotate(180deg)}
.bo-section-corps{padding:0 var(--bo-e4) var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-etat-vide{display:flex;flex-direction:column;align-items:center;gap:var(--bo-e2);padding:var(--bo-e5) var(--bo-e4);text-align:center}
.bo-etat-vide-titre{font-size:22px}
.bo-etat-vide-phrase{color:var(--bo-ardoise)}
.bo-manques{display:flex;gap:var(--bo-e2);align-items:flex-start;padding:var(--bo-e3);border-radius:var(--bo-rayon);background:#fff0cf;border:1px solid var(--bo-or);color:var(--bo-or-texte)}
.bo-manques-titre{font-weight:700}
.bo-manques-liste{list-style:disc!important;padding-left:var(--bo-e4)!important}
.bo-manques-icone{padding-top:1px}
.bo-frise{display:flex;flex-wrap:wrap;gap:var(--bo-e1) 0;width:100%}
.bo-frise-etape{display:flex;align-items:center;gap:var(--bo-e2);flex:1 1 0;min-width:96px;font-size:13px;color:var(--bo-ardoise);position:relative}
.bo-frise-etape::after{content:"";flex:1;height:2px;margin:0 var(--bo-e2);background:var(--bo-bordure)}
.bo-frise-etape:last-child::after{display:none}
.bo-frise-point{display:flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--bo-bordure);background:var(--bo-surface);color:#fff}
.bo-frise-etape--faite .bo-frise-point{background:var(--bo-ok);border-color:var(--bo-ok)}
.bo-frise-etape--faite::after{background:var(--bo-ok)}
.bo-frise-etape--courante{color:var(--bo-marine);font-weight:700}
.bo-frise-etape--courante .bo-frise-point{border-color:var(--bo-marine);background:var(--bo-marine);box-shadow:0 0 0 3px #51a5dd55}
.bo-frise--urgent .bo-frise-etape--courante{color:var(--bo-corail-texte)}
.bo-frise--urgent .bo-frise-etape--courante .bo-frise-point{border-color:var(--bo-corail-texte);background:var(--bo-corail-texte);box-shadow:0 0 0 3px #fd7f5a55}
.bo-frise--neutre .bo-frise-etape--courante .bo-frise-point{background:var(--bo-ardoise);border-color:var(--bo-ardoise);box-shadow:none}
.bo-frise-libelle{white-space:nowrap}
${mobile}{.bo-frise{flex-direction:column}.bo-frise-etape::after{display:none}.bo-frise-libelle{white-space:normal}}
.bo-ligne{display:flex;align-items:center;gap:var(--bo-e3);flex-wrap:wrap;width:100%;min-height:56px;padding:var(--bo-e3) var(--bo-e4);background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);text-align:left;transition:background var(--bo-mvt),opacity var(--bo-mvt)}
.bo-ligne:hover{background:var(--bo-creme)}
.bo-ligne--attenuee{opacity:.5}
.bo-segments{display:flex;flex-wrap:wrap;gap:var(--bo-e1);padding:var(--bo-e1);background:var(--bo-creme);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte);width:fit-content;max-width:100%}
.bo-segment{display:inline-flex;align-items:center;gap:var(--bo-e2);min-height:40px;padding:0 var(--bo-e3);border-radius:var(--bo-rayon);font-weight:600;color:var(--bo-ardoise)}
.bo-segment:hover{background:var(--bo-surface)}
.bo-segment--actif{background:var(--bo-marine);color:#fff}
.bo-segment--actif:hover{background:var(--bo-marine)}
.bo-segment-compteur{min-width:22px;padding:0 6px;border-radius:var(--bo-rayon-badge);background:rgba(4,32,60,.1);font-size:13px;text-align:center}
.bo-segment--actif .bo-segment-compteur{background:rgba(255,255,255,.22)}
.bo-squelette{display:flex;flex-direction:column;gap:var(--bo-e2)}
.bo-squelette-bloc{height:56px;border-radius:var(--bo-rayon-carte);background:linear-gradient(90deg,var(--bo-creme),#f3ead5,var(--bo-creme));background-size:200% 100%;animation:bo-brille 1.4s ease-in-out infinite}
.bo-squelette-bloc--entete{height:96px}
.bo-squelette-bloc--carte{height:180px}
@keyframes bo-brille{to{background-position:-200% 0}}
`;

// Fil « Échanges » du dossier : une réponse non lue porte un liseré or, jamais la couleur seule (badge « Non lu »).
const echanges = `
.bo-echange{display:flex;flex-direction:column;gap:var(--bo-e2);padding:var(--bo-e3);background:var(--bo-surface);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon)}
.bo-echange--nonlu{border-left:5px solid var(--bo-or);background:#fffaf0}
.bo-echange-texte{white-space:pre-wrap;overflow-wrap:anywhere}
.bo-pieces{display:flex;flex-wrap:wrap;gap:var(--bo-e2)}
.bo-piece{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 var(--bo-e3);border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon);color:var(--bo-marine);font-weight:600;text-decoration:none}
.bo-piece:hover{background:var(--bo-creme)}
`;

const formulaires = `
.bo-champ{display:flex;flex-direction:column;gap:6px;border:0;padding:0;margin:0;min-width:0}
.bo-champ-entete{display:flex;align-items:center;gap:var(--bo-e2);min-height:24px}
.bo-etiquette{font-size:13px;font-weight:600;color:var(--bo-ardoise)}
.bo-requis{font-size:12px;font-weight:600;color:var(--bo-ardoise);padding:0 6px;border:1px solid var(--bo-bordure);border-radius:var(--bo-rayon-badge)}
.bo-saisie{width:100%;min-height:40px;padding:var(--bo-e2) var(--bo-e3);background:var(--bo-surface);border:1px solid #b9ad92;border-radius:var(--bo-rayon);font-size:15px}
.bo-saisie:read-only{background:var(--bo-creme);border-color:var(--bo-bordure)}
.bo-zone{resize:vertical;min-height:72px;line-height:1.45}
.bo-champ--erreur .bo-saisie{border-color:var(--bo-corail-texte);border-width:2px}
.bo-erreur{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--bo-corail-texte)}
.bo-montant{display:flex;align-items:center;gap:var(--bo-e2)}
.bo-montant-saisie{flex:0 1 200px;width:auto;min-width:0;text-align:left}
.bo-montant-unite{flex:none;color:var(--bo-ardoise);font-weight:600}
.bo-aide{position:relative;display:inline-flex}
.bo-aide-bouton{width:24px;height:24px;border-radius:50%;border:1px solid var(--bo-bordure);background:var(--bo-surface);color:var(--bo-marine);font-size:13px;font-weight:700;line-height:1}
.bo-infobulle{position:absolute;left:0;top:calc(100% + 6px);z-index:25;width:max-content;max-width:280px;padding:var(--bo-e2) var(--bo-e3);border-radius:var(--bo-rayon);background:var(--bo-marine-abysse);color:#fff;font-size:13px;font-weight:400;visibility:hidden;opacity:0;transition:opacity var(--bo-mvt)}
.bo-aide:hover .bo-infobulle,.bo-aide:focus-within .bo-infobulle{visibility:visible;opacity:1}
.bo-tva-options{display:flex;gap:var(--bo-e2)}
.bo-tva-option{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 var(--bo-e4);border:1px solid var(--bo-marine);border-radius:var(--bo-rayon);background:var(--bo-surface);color:var(--bo-marine);font-weight:600;cursor:pointer}
.bo-tva-option input{position:absolute;opacity:0;inset:0;cursor:pointer;margin:0}
.bo-tva-option:has(input:checked){background:var(--bo-marine);color:#fff}
.bo-tva-option:has(input:focus-visible){outline:3px solid var(--bo-focus);outline-offset:2px}
.bo-voile{position:absolute;left:0;top:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:var(--bo-e3);background:rgba(4,32,60,.45)}
.bo-modale{display:flex;flex-direction:column;width:min(640px,100%);max-height:100%;background:var(--bo-surface);border-radius:var(--bo-rayon-carte);box-shadow:var(--bo-ombre-modale)}
.bo-modale-entete{display:flex;align-items:center;gap:var(--bo-e3);padding:var(--bo-e4);border-bottom:1px solid var(--bo-bordure)}
.bo-modale-titre{flex:1;font-size:22px}
.bo-modale-fermer{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--bo-rayon);color:var(--bo-ardoise)}
.bo-modale-fermer:hover{background:var(--bo-creme)}
.bo-modale-corps{padding:var(--bo-e4);overflow:auto;display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-modale-pied{display:flex;justify-content:flex-end;align-items:center;gap:var(--bo-e3);flex-wrap:wrap;padding:var(--bo-e3) var(--bo-e4);border-top:1px solid var(--bo-bordure)}
.bo-confirmation{display:flex;gap:var(--bo-e2);align-items:flex-start}
.bo-confirmation--danger{color:var(--bo-corail-texte);font-weight:600}
.bo-toasts{position:sticky;bottom:0;z-index:60;height:0;overflow:visible;pointer-events:none}
.bo-toasts-pile{position:absolute;right:var(--bo-e4);bottom:var(--bo-e4);display:flex;flex-direction:column;gap:var(--bo-e2);width:min(380px,calc(100% - 32px))}
.bo-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:var(--bo-e2);padding:var(--bo-e3);background:var(--bo-surface);border:1px solid var(--bo-bordure);border-left-width:5px;border-radius:var(--bo-rayon);box-shadow:var(--bo-ombre-modale)}
.bo-toast--succes{border-left-color:var(--bo-ok);color:var(--bo-ok)}
.bo-toast--erreur{border-left-color:var(--bo-corail-texte);color:var(--bo-corail-texte)}
.bo-toast-message{flex:1;color:var(--bo-texte);font-weight:500}
.bo-toast-fermer{display:flex;padding:4px;border-radius:var(--bo-rayon);color:var(--bo-ardoise)}
@media (prefers-reduced-motion:reduce){.bo-racine *,.bo-racine *::before,.bo-racine *::after{animation:none!important;transition:none!important}}
`;

// Barre haute de la coque (recherche + nom de l'utilisateur), collante dans le
// conteneur de défilement .bo-racine : fusionnée ici pour garder une seule feuille.
const coque = `
.bo-haut{position:sticky;top:0;z-index:15;display:flex;align-items:center;gap:var(--bo-e3);padding:var(--bo-e3) var(--bo-e4);background:var(--bo-papier);border-bottom:1px solid var(--bo-bordure)}
${mobile}{.bo-haut{padding:var(--bo-e2) var(--bo-e3)}}
`;

export const FEUILLE_DE_STYLE = [base, mise, composants, echanges, formulaires, coque].join('\n').replace(/^\s*\n/gm, '');
