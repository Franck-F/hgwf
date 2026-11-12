/**
 * Feuille de style de la coque et des listes : grande carte blanche sur fond
 * bleu nuit, barre haute (logo, recherche, utilisateur), barre latérale bleue,
 * titres de page, cartes « accès rapide » en onglet de dossier, lignes et
 * tableaux au style de la maquette.
 *
 * Largeurs utiles : 1024 à 1920 px (zone de l'outil dans le Studio). Sous
 * 1200 px la barre latérale et les marges se resserrent ; sous 900 px la carte
 * occupe toute la largeur, la navigation devient une barre d'onglets collée en
 * bas et les tableaux se transforment en cartes. Les tableaux plus larges que
 * leur boîte défilent dans `.bo-tableau-boite`, jamais la page.
 */
import { POINTS_DE_RUPTURE } from './tokens';

export const MOBILE = `@media (max-width:${POINTS_DE_RUPTURE.navigation - 1}px)`;
const ETROIT = `@media (max-width:${POINTS_DE_RUPTURE.colonneLaterale - 1}px)`;
const MOYEN = '@media (max-width:1199px)';

/** Forme d'onglet de dossier de la maquette (cartes « accès rapide » de 218 × 170). */
const ONGLET =
  "path('M0 14 Q0 0 14 0 L118 0 Q126 0 131 6 L137 13 Q142 19 150 19 L204 19 Q218 19 218 33 L218 156 Q218 170 204 170 L14 170 Q0 170 0 156 Z')";

const grille = `
.bo-coque{display:flex;flex-direction:column;width:calc(100% - 48px);max-width:1400px;min-height:calc(100% - 48px);margin:24px auto;background:var(--bo-papier);border-radius:44px 84px 44px 44px;box-shadow:var(--bo-ombre-coque)}
.bo-haut{position:relative;z-index:15;display:flex;align-items:center;gap:var(--bo-e4);min-height:110px;padding:18px 36px 10px 32px}
.bo-logo-bouton{display:flex;flex:none;align-items:center;border-radius:8px}
.bo-logo{display:block;height:74px;width:auto}
.bo-recherche{position:relative;flex:1 1 auto;max-width:444px;min-width:0;margin-left:var(--bo-e3)}
.bo-recherche .bo-saisie{min-height:44px;padding-left:46px;border:0;border-radius:22px;background:var(--bo-creme);font-size:14px}
.bo-recherche .bo-saisie::placeholder{color:var(--bo-ardoise);opacity:1}
.bo-recherche-icone{position:absolute;left:16px;top:50%;display:flex;transform:translateY(-50%);color:var(--bo-ardoise);pointer-events:none}
.bo-resultats{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:18px;box-shadow:var(--bo-ombre-modale);padding:var(--bo-e2);display:flex;flex-direction:column;gap:var(--bo-e1)}
.bo-utilisateur{margin-left:auto;display:flex;align-items:center;gap:14px}
.bo-utilisateur-nom{font-size:13px;font-weight:500}
.bo-pastille-utilisateur{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--bo-corail);color:var(--bo-marine);font-size:15px;font-weight:600}
.bo-corps{display:grid;grid-template-columns:248px minmax(0,1fr);flex:1}
.bo-contenu{min-width:0}
.bo-lateral{display:flex;flex-direction:column;padding:46px 24px 40px 32px;background:var(--bo-accent);color:#fff;border-radius:0 64px 0 44px}
.bo-nouveau{display:flex;align-items:center;justify-content:center;gap:var(--bo-e2);width:100%;max-width:190px;min-height:44px;border-radius:22px;background:#fff;color:var(--bo-accent);font-size:14px;font-weight:600;transition:background var(--bo-mvt)}
.bo-nouveau:hover{background:var(--bo-accent-pale)}
.bo-lateral :focus-visible{outline-color:#fff}
.bo-nav{margin-top:36px}
.bo-nav>.bo-nav-interne{display:flex;flex-direction:column;gap:var(--bo-e1)}
.bo-nav-lien{display:flex;align-items:center;gap:18px;min-height:44px;padding:0 var(--bo-e3);margin-left:-12px;border-radius:22px;color:#fff;font-size:14px;font-weight:500}
.bo-nav-lien:hover{background:rgba(9,27,74,.2)}
.bo-nav-lien--actif,.bo-nav-lien--actif:hover{background:rgba(9,27,74,.34);font-weight:600}
.bo-nav-pastille{margin-left:auto;min-width:24px;padding:0 7px;border-radius:var(--bo-rayon-badge);background:var(--bo-corail);color:var(--bo-marine);font-size:12px;font-weight:700;line-height:22px;text-align:center}
.bo-details{margin-top:48px;display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-details-titre{font:600 12px var(--bo-police);color:#fff;letter-spacing:.06em;text-transform:uppercase}
.bo-detail{display:flex;flex-direction:column;gap:6px}
.bo-detail-ligne{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:500}
.bo-detail-texte{font-size:12px}
.bo-barre{appearance:none;-webkit-appearance:none;display:block;width:100%;height:4px;border:0;border-radius:2px;background:rgba(9,27,74,.34);overflow:hidden}
.bo-barre::-webkit-progress-bar{background:rgba(9,27,74,.34)}
.bo-barre::-webkit-progress-value{background:var(--bo-corail);border-radius:2px}
.bo-barre::-moz-progress-bar{background:var(--bo-corail);border-radius:2px}
.bo-page{padding:40px 36px 48px 48px;display:flex;flex-direction:column;gap:var(--bo-e4)}
.bo-page-entete{display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e3);min-height:44px}
.bo-titres{display:flex;flex-direction:column;gap:4px;min-width:0}
.bo-titre-page{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.01em}
.bo-sous-titre{font-size:14px;color:var(--bo-ardoise);max-width:70ch}
.bo-dossier-grille{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:var(--bo-e4);align-items:start}
${ETROIT}{.bo-dossier-grille{grid-template-columns:minmax(0,1fr)}}
.bo-barre-collante{position:sticky;bottom:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:var(--bo-e3);padding:var(--bo-e3) var(--bo-e4);background:var(--bo-surface);border-top:1.5px solid var(--bo-bordure);box-shadow:0 -4px 12px rgba(13,39,102,.08);border-radius:0 0 44px 44px}
.bo-groupe{display:flex;flex-direction:column;gap:var(--bo-e2);margin-top:var(--bo-e2)}
.bo-groupe-titre{display:flex;align-items:center;gap:var(--bo-e2);font-size:18px;letter-spacing:.02em;text-transform:uppercase;scroll-margin-top:var(--bo-e4)}
.bo-compteur{min-width:26px;padding:0 9px;border-radius:var(--bo-rayon-badge);background:var(--bo-accent-pale);color:var(--bo-accent-fonce);font:600 12px/24px var(--bo-police);text-align:center}
.bo-bandeau{display:flex;gap:var(--bo-e2);align-items:center;flex-wrap:wrap;padding:var(--bo-e3) var(--bo-e4);border-radius:var(--bo-rayon-carte);border:1.5px solid var(--bo-bordure);background:var(--bo-surface);font-weight:600}
.bo-bandeau--urgent{background:var(--bo-mise-en-avant);border-color:var(--bo-corail);color:var(--bo-corail-texte)}
.bo-bandeau--info{background:var(--bo-accent-pale);border-color:var(--bo-accent);color:var(--bo-accent-fonce)}
.bo-bandeau--neutre{background:var(--bo-creme);color:var(--bo-ardoise)}
.bo-puces{display:flex;flex-wrap:wrap;gap:var(--bo-e2)}
.bo-puce{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 var(--bo-e3);border:1.5px solid var(--bo-bordure);border-radius:22px;background:var(--bo-surface);color:var(--bo-accent);font-size:13px;font-weight:600;text-decoration:none}
.bo-puce:hover{background:var(--bo-accent-pale)}
.bo-filtres{display:flex;flex-direction:column;gap:var(--bo-e3)}
.bo-filtres-ligne{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--bo-e3)}
.bo-filtres-ligne>.bo-champ:first-child{flex:2 1 280px}
.bo-filtres-ligne>.bo-champ{flex:1 1 200px;max-width:420px}
.bo-puce--filtre{color:var(--bo-marine);font-weight:500;cursor:pointer}
.bo-puce-nombre{min-width:22px;padding:0 7px;border-radius:var(--bo-rayon-badge);background:var(--bo-creme);color:var(--bo-marine);font-size:12px;font-weight:600;line-height:22px;text-align:center}
.bo-puce--actif,.bo-puce--actif:hover{background:var(--bo-accent);border-color:var(--bo-accent);color:#fff;font-weight:600}
.bo-puce--actif .bo-puce-nombre{background:#fff;color:var(--bo-accent-fonce)}
`;

const accesRapide = `
.bo-acces-titre{font-size:20px;line-height:24px;letter-spacing:.02em;text-transform:uppercase}
.bo-acces-liste{display:flex;flex-wrap:wrap;gap:var(--bo-e3);margin-top:-6px}
.bo-acces{position:relative;display:flex;flex-direction:column;width:218px;height:170px;padding:30px 18px 0;color:var(--bo-marine);text-align:left;isolation:isolate}
.bo-acces::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bo-creme);clip-path:${ONGLET};transition:background var(--bo-mvt)}
.bo-acces:hover::before{background:var(--bo-bordure)}
.bo-acces--plein{color:#fff}
.bo-acces--plein::before{background:var(--bo-accent)}
.bo-acces--plein:hover::before{background:var(--bo-accent-fonce)}
.bo-acces-etiquette{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.bo-acces-nombre{margin-top:4px;font-size:34px;line-height:40px;font-weight:600}
.bo-acces-nom{margin-top:8px;font-size:13px;font-weight:600;line-height:1.35;color:var(--bo-accent-fonce)}
.bo-acces--plein .bo-acces-nom{color:#fff}
.bo-acces-retard{margin-top:auto;padding-bottom:12px;font-size:12px;font-weight:500}
`;

/* Sous-dossiers de la page Dossier : même onglet de dossier que l'accès rapide,
   dessiné en deux pièces (languette + corps) pour s'étirer à toute largeur. */
const sousDossiers = `
.bo-sous-dossiers{display:flex;flex-wrap:wrap;gap:var(--bo-e3);margin-top:-6px}
.bo-sous-dossier{position:relative;flex:1 1 150px;max-width:230px;min-height:116px;display:flex;flex-direction:column;gap:4px;padding:28px 16px 14px;color:var(--bo-marine);text-align:left;isolation:isolate}
.bo-sous-dossier::before,.bo-sous-dossier::after{content:"";position:absolute;z-index:-1;background:var(--bo-creme);transition:background var(--bo-mvt)}
.bo-sous-dossier::before{left:0;top:0;width:52%;height:26px;border-radius:12px 0 0 0;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 100%,0 100%)}
.bo-sous-dossier::after{left:0;right:0;top:12px;bottom:0;border-radius:0 14px 14px 14px}
.bo-sous-dossier:hover::before,.bo-sous-dossier:hover::after{background:var(--bo-bordure)}
.bo-sous-dossier--actif{color:#fff}
.bo-sous-dossier--actif::before,.bo-sous-dossier--actif::after,.bo-sous-dossier--actif:hover::before,.bo-sous-dossier--actif:hover::after{background:var(--bo-accent)}
.bo-sous-dossier-haut{display:flex;align-items:center;gap:var(--bo-e2);min-height:24px;color:var(--bo-accent)}
.bo-sous-dossier--actif .bo-sous-dossier-haut{color:#fff}
.bo-sous-dossier-signal{margin-left:auto;padding:0 8px;border-radius:var(--bo-rayon-badge);background:var(--bo-corail);color:var(--bo-marine);font-size:12px;font-weight:700;line-height:22px;white-space:nowrap}
.bo-sous-dossier-nom{margin-top:4px;font-size:16px;font-weight:600;line-height:1.25}
.bo-sous-dossier-detail{font-size:12px;font-weight:500;line-height:1.35;color:var(--bo-ardoise);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bo-sous-dossier--actif .bo-sous-dossier-detail{color:rgba(255,255,255,.88)}
.bo-section--fixe .bo-section-entete{padding:var(--bo-e4) var(--bo-e4) var(--bo-e2);font-size:18px;font-weight:600;color:var(--bo-marine)}
`;

const listes = `
.bo-lignes{display:flex;flex-direction:column}
.bo-ligne{display:flex;align-items:center;gap:var(--bo-e3);flex-wrap:wrap;width:100%;min-height:56px;padding:10px 14px;background:transparent;border:0;border-bottom:1.5px solid var(--bo-bordure);border-radius:0;text-align:left;transition:background var(--bo-mvt),opacity var(--bo-mvt)}
.bo-lignes>li:last-child>.bo-ligne{border-bottom-color:transparent}
.bo-ligne:hover{background:var(--bo-survol)}
.bo-ligne--vif,.bo-ligne--vif:hover{background:var(--bo-mise-en-avant);border-bottom-color:transparent;border-radius:8px}
.bo-ligne--attenuee{opacity:.5}
.bo-ligne .bo-saisie{width:auto;min-width:170px}
.bo-ligne .bo-rangee{flex-wrap:nowrap}
.bo-ligne>.bo-secondaire{flex:1 1 140px}
.bo-ligne-nom{display:flex;align-items:center;gap:14px;flex:0 1 260px;min-width:200px}
.bo-ligne-textes{display:flex;flex-direction:column;min-width:0}
.bo-ligne-raison{flex:1 1 240px;min-width:0}
.bo-ligne-action{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
.bo-pastille{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;border-radius:5px;color:#fff;background:var(--bo-icone-gris)}
.bo-pastille--neutre{background:#6b7385}
.bo-pastille--info{background:#4a7df5}
.bo-pastille--attention{background:#f4a236;color:var(--bo-marine)}
.bo-pastille--urgent{background:#e5483b}
.bo-pastille--ok{background:#1fa463}
.bo-nom-cellule{display:flex;align-items:flex-start;gap:14px}
.bo-nom-cellule .bo-pastille{margin-top:1px}
.bo-entetes{display:grid;padding:0 14px 6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--bo-ardoise)}
.bo-ligne--clients,.bo-entetes--clients{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(180px,1.3fr) 160px minmax(150px,1fr);column-gap:var(--bo-e3)}
.bo-tableau-boite{overflow-x:auto;max-width:100%}
.bo-tableau{width:100%;min-width:720px;border-collapse:collapse;font-size:14px}
.bo-tableau th{text-align:left;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--bo-ardoise);padding:var(--bo-e2) 14px var(--bo-e2);border-bottom:1.5px solid var(--bo-bordure)}
.bo-tableau td{padding:12px 14px;border-bottom:1.5px solid var(--bo-bordure);vertical-align:top}
.bo-tableau tbody tr{cursor:pointer;transition:background var(--bo-mvt)}
.bo-tableau tbody tr:hover{background:var(--bo-survol)}
.bo-tableau tbody tr.bo-ligne-dossier--vif,.bo-tableau tbody tr.bo-ligne-dossier--vif:hover{background:var(--bo-mise-en-avant)}
.bo-tableau tbody tr.bo-ligne-dossier--vif td{border-bottom-color:transparent}
.bo-tableau tbody tr:last-child td{border-bottom-color:transparent}
.bo-nom-lien{font-weight:600;color:var(--bo-marine);text-align:left}
.bo-nom-lien:hover{text-decoration:underline;text-underline-offset:3px}
.bo-tableau--afaire{table-layout:fixed;min-width:860px}
.bo-tableau--afaire th:nth-child(1){width:24%}
.bo-tableau--afaire th:nth-child(2){width:14%}
.bo-tableau--afaire th:nth-child(4){width:10%}
.bo-tableau--afaire th:nth-child(5){width:24%}
.bo-tableau--afaire td{vertical-align:middle}
.bo-non-lus{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:13px;font-weight:600;color:var(--bo-corail-texte)}
.bo-cellule-action{text-align:right}
.bo-action-ligne{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:44px;padding:0 var(--bo-e3) 0 var(--bo-e4);border-radius:22px;background:var(--bo-accent-pale);color:var(--bo-accent-fonce);font-size:13px;font-weight:600;white-space:nowrap;transition:background var(--bo-mvt)}
.bo-action-ligne:hover{background:#d3e2fa}
.bo-ligne-dossier--vif .bo-action-ligne{background:var(--bo-surface)}
.bo-tableau--afaire .bo-action-ligne{white-space:normal;max-width:100%;padding:6px 10px 6px 16px;text-align:center;line-height:1.3}
.bo-lateral .bo-details-titre{color:#fff}
.bo-voir-plus{display:inline-flex;align-items:center;align-self:flex-start;gap:6px;min-height:44px;padding:0 var(--bo-e3);border-radius:22px;background:var(--bo-creme);color:var(--bo-marine);font-size:13px;font-weight:600}
.bo-voir-plus:hover{background:var(--bo-bordure)}
.bo-voir-plus-haut{display:flex;transform:rotate(180deg)}
`;

const resserre = `
${MOYEN}{
.bo-coque{width:calc(100% - 24px);min-height:calc(100% - 24px);margin:12px auto;border-radius:36px 64px 36px 36px}
.bo-haut{padding:14px 24px 8px 24px;min-height:92px}
.bo-logo{height:60px}
.bo-corps{grid-template-columns:224px minmax(0,1fr)}
.bo-lateral{padding:36px 16px 32px 24px;border-radius:0 48px 0 36px}
.bo-page{padding:32px 24px 40px 28px}
.bo-acces-liste{gap:var(--bo-e2)}
}
`;

const mobile = `
${MOBILE}{
.bo-coque{width:100%;min-height:100%;margin:0;border-radius:0;box-shadow:none}
.bo-haut{flex-wrap:wrap;gap:var(--bo-e2) var(--bo-e3);min-height:0;padding:12px 16px}
.bo-logo{height:44px}
.bo-recherche{order:3;flex:1 1 100%;max-width:none;margin-left:0}
.bo-utilisateur-nom{display:none}
.bo-corps{display:flex;flex-direction:column}
.bo-contenu{flex:1}
.bo-lateral{display:contents}
.bo-nouveau,.bo-details{display:none}
.bo-nav{order:2;position:sticky;bottom:0;z-index:10;margin-top:0;background:var(--bo-accent);color:#fff}
.bo-nav>.bo-nav-interne{flex-direction:row;gap:0;padding:var(--bo-e1)}
.bo-nav-lien{position:relative;flex:1;flex-direction:column;justify-content:center;gap:2px;min-height:56px;margin-left:0;padding:0 var(--bo-e1);border-radius:12px;font-size:12px}
.bo-nav-pastille{position:absolute;top:2px;right:calc(50% - 26px);margin-left:0;min-width:20px;line-height:18px}
.bo-page{padding:20px 16px 32px}
.bo-titre-page{font-size:24px}
.bo-barre-collante{border-radius:0}
.bo-acces{width:100%;max-width:218px}
.bo-tableau,.bo-tableau--afaire{min-width:0;table-layout:auto}
.bo-tableau thead{display:none}
.bo-tableau,.bo-tableau tbody,.bo-tableau tr,.bo-tableau td{display:block;width:100%}
.bo-tableau tr{margin-bottom:var(--bo-e2);background:var(--bo-surface);border:1.5px solid var(--bo-bordure);border-radius:var(--bo-rayon-carte)}
.bo-tableau td{border:0;padding:var(--bo-e1) var(--bo-e3)}
.bo-tableau tbody tr:last-child td,.bo-tableau tbody tr.bo-ligne-dossier--vif td{border:0}
.bo-tableau td[data-etiquette]::before{content:attr(data-etiquette) " : ";font-size:13px;font-weight:600;color:var(--bo-ardoise)}
.bo-entetes{display:none}
.bo-ligne--clients{display:flex}
.bo-ligne-nom{flex:1 1 100%}
.bo-aide .bo-infobulle{left:auto;right:0;max-width:min(280px,calc(100vw - 64px))}
.bo-segments{width:100%}
.bo-segment{flex:1;justify-content:center;padding:0 var(--bo-e2)}
}
`;

export const COQUE = [grille, accesRapide, sousDossiers, listes, resserre, mobile].join('\n');
