/**
 * Bas de la première page du devis PDF : montant (HT, TVA, bandeau TTC),
 * conditions et bon pour accord. Extrait de `devisPdf.ts` (même code, mêmes
 * mesures) pour tenir sous 300 lignes.
 */
import type { jsPDF } from 'jspdf';
import { euros, pourcentage, type Chiffrage } from '../domaine/chiffrage';
import {
  assainir,
  CORAIL,
  CREME,
  ENCRE,
  LARGEUR_PAGE as W,
  LARGEUR_UTILE as LARGE,
  MARGE as M,
  MARINE,
  OR,
} from './devisPdfAides';

// Hauteurs partagées avec le budget vertical de `devisPdf.ts`.
export const BANDEAU = 20;
export const HAUT_CHIFFRAGE = 12; // lignes HT et TVA au-dessus du bandeau
// Conditions à gauche, bon pour accord à droite : côte à côte, ils prennent
// la hauteur du plus haut des deux au lieu de leur somme.
export const LARGEUR_BON = 62;
export const HAUT_BON = 24;
export const LARGEUR_CONDITIONS = LARGE - LARGEUR_BON - 8;
export const PAS_CONDITIONS = 3.5;

export type ContexteMontant = {
  chiffrage: Chiffrage | null;
  ancien: string | null;
  provisoire: boolean;
  lignesMention: string[];
  lignesConditions: string[];
  couper: (texte: string, largeur: number, max?: number) => string[];
};

export function dessinerMontant(doc: jsPDF, ctx: ContexteMontant, yDepart: number): void {
  const { chiffrage, ancien, provisoire, lignesMention, lignesConditions, couper } = ctx;
  let y = yDepart;
  // ── Montant ──
  // HT et TVA au-dessus du bandeau, le TTC dedans : c'est ce que le client
  // paiera. Un ancien devis garde sa chaîne libre ; sans montant, pas de bandeau.
  const bandeau = (libelle: string, montant: string, couleur: [number, number, number] = OR) => {
    doc.setFillColor(...MARINE);
    doc.roundedRect(M, y, LARGE, BANDEAU, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CREME);
    doc.text(libelle, M + 6, y + 12, { charSpace: 0.8 });
    doc.setCharSpace(0);
    doc.setFontSize(17);
    doc.setTextColor(...couleur);
    doc.text(assainir(montant), W - M - 6, y + 13, { align: 'right' });
    y += BANDEAU + 5;
  };
  if (chiffrage) {
    doc.setFontSize(9);
    const lignesHT: [string, string][] = [
      ['Montant HT', euros(chiffrage.ht)],
      [`TVA ${pourcentage(chiffrage.taux)}`, euros(chiffrage.tva)],
    ];
    lignesHT.forEach(([libelle, valeur], i) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ENCRE);
      doc.text(libelle, W - M - LARGEUR_BON, y + 4 + i * 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MARINE);
      doc.text(assainir(valeur), W - M - 6, y + 4 + i * 5, { align: 'right' });
    });
    y += HAUT_CHIFFRAGE;
    bandeau('TOTAL TTC', euros(chiffrage.ttc));
  } else if (ancien) {
    bandeau('MONTANT DU DEVIS', ancien);
  } else {
    bandeau('MONTANT', 'À établir', CORAIL);
  }

  // ── Conditions ──
  // La mention d'exonération (TVA à 0 %) ouvre le paragraphe, en gras.
  doc.setFontSize(8);
  doc.setTextColor(...ENCRE);
  [...lignesMention, ...lignesConditions].forEach((ligne, i) => {
    doc.setFont('helvetica', i < lignesMention.length ? 'bold' : 'normal');
    doc.text(ligne, M, y + 2.8 + i * PAS_CONDITIONS);
  });

  // ── Bon pour accord ──
  const xBon = W - M - LARGEUR_BON;
  doc.setDrawColor(...MARINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(xBon, y, LARGEUR_BON, HAUT_BON, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MARINE);
  if (provisoire) {
    // Un devis provisoire ne se signe pas : encadré d'attente à la place.
    doc.text('EN ATTENTE D’INFORMATIONS', xBon + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    couper(
      'Ce devis provisoire ne se signe pas : un devis définitif vous sera adressé une fois le montant établi.',
      LARGEUR_BON - 8,
    ).forEach((ligne, i) => doc.text(ligne, xBon + 4, y + 12 + i * 3.8));
  } else {
    doc.text('BON POUR ACCORD', xBon + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text('Date et signature du client :', xBon + 4, y + 12);
  }
}
