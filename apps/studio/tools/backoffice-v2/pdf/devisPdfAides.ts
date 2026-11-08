/**
 * Aides du devis PDF : types, lecture des détails rangés dans le message,
 * palette (importée de `theme/tokens.ts`), analyse de la description et
 * assainissement du texte. Extrait de `devisPdf.ts` pour tenir sous la limite
 * de 300 lignes par fichier (spécification 8, critère 3), sans changer le rendu.
 */
import { COULEURS } from '../theme/tokens';
import type { Facturation } from '../domaine/chiffrage';

// Gabarit A4 en millimètres, partagé par toutes les pages du devis.
export const LARGEUR_PAGE = 210;
export const MARGE = 18;
export const LARGEUR_UTILE = LARGEUR_PAGE - 2 * MARGE;

export type DemandePdf = Facturation & {
  reference: string;
  clientNom?: string;
  contact?: string;
  typeEnvoi?: string;
  destination?: string;
  volume?: string;
  recueLe?: string;
  message?: string;
  // montantHT (euros) et tauxTVA (%) font foi ; montantDevis est l'ancienne
  // chaîne libre, lue seulement quand les deux nombres manquent.
  montantHT?: number | null;
  tauxTVA?: number | null;
  montantDevis?: string;
  descriptionPrestation?: string;
  delaiEstime?: string;
};

// ── Relecture des détails structurés rangés dans le message par l'API ────────
export function lireDetail(message: string | undefined, cle: string): string | null {
  return message?.match(new RegExp(`^${cle} : (.+)$`, 'm'))?.[1]?.trim() ?? null;
}
export function messageLibre(message?: string): string {
  return (message ?? '')
    .split('\n')
    .filter((l) => !/^(Colis|Remarques colis|Départ) : /.test(l))
    .join(' ')
    .trim();
}

// ── Palette de la charte ──────────────────────────────────────────────────────
// Importée de `theme/tokens.ts` (plus de palette dupliquée). jsPDF veut des
// triplets RVB, pas de l'hexadécimal.
export type Rvb = [number, number, number];
const versRvb = (hex: string): Rvb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
export const MARINE = versRvb(COULEURS.marine);
export const CREME = versRvb(COULEURS.creme);
export const OR = versRvb(COULEURS.or);
export const ENCRE = versRvb(COULEURS.cielTexte);
export const CORAIL = versRvb(COULEURS.corail); // « À établir » : visible, sans alarme
export const FILET = versRvb(COULEURS.bordure);
export const TEXTE_COURANT = versRvb(COULEURS.texte);

// ── Description de la prestation : structure lue dans le texte rédigé ───────
// Une phrase d'objet, des rubriques « Libellé : » seules sur leur ligne, des
// puces « - », des lignes « Libellé : texte », des lignes vides.
export type Element =
  | { type: 'titre'; texte: string }
  | { type: 'para'; texte: string; libelle?: string; puce?: boolean };

export function analyserDescription(texte: string): Element[] {
  const elements: Element[] = [];
  for (const brut of texte.split('\n')) {
    const l = brut.trim();
    if (!l) continue;
    const puce = l.match(/^[-•*–]\s+(.+)$/);
    if (puce?.[1]) {
      elements.push({ type: 'para', texte: puce[1], puce: true });
      continue;
    }
    const lib = l.match(/^([^:\s][^:]{0,44}?)\s*:\s*(.*)$/);
    const libelle = lib?.[1]?.trim();
    if (lib && libelle && libelle.split(/\s+/).length <= 6 && !/[.!?]$/.test(libelle)) {
      if (lib[2]) elements.push({ type: 'para', libelle, texte: lib[2] });
      else elements.push({ type: 'titre', texte: libelle });
      continue;
    }
    elements.push({ type: 'para', texte: l });
  }
  return elements;
}

export const tronquer = (texte: string, max: number) =>
  texte.length > max ? `${texte.slice(0, max - 1)}…` : texte;

// Les polices standard du PDF ne couvrent que Latin-1/CP1252 : on remplace ce
// qui n'y figure pas (flèches saisies dans les champs, symboles exotiques).
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
export function assainir(texte: string): string {
  return texte
    .replace(/\s*(?:→|⇒|➔|➜)\s*/g, ' - ')
    .replace(/[^\n\x20-\xFF]/g, (c) => (CP1252_EXTRA.has(c) ? c : '?'));
}

// L'emblème SVG du Studio, rastérisé pour jsPDF ; null si indisponible.
export async function chargerEmbleme(): Promise<string | null> {
  try {
    const rep = await fetch('/static/embleme.svg');
    if (!rep.ok) return null;
    const svg = await rep.text();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 180, 180);
    URL.revokeObjectURL(url);
    const data = canvas.toDataURL('image/png');
    // Un canvas resté vierge (SVG sans dimensions) produit un PNG minuscule.
    return data.length > 2000 ? data : null;
  } catch {
    return null;
  }
}
