/**
 * Pages de détail du devis PDF : la description complète de la prestation,
 * typographiée sur une ou plusieurs pages supplémentaires. Extrait de
 * `devisPdf.ts` (même code, mêmes mesures) pour tenir sous 300 lignes.
 */
import type { jsPDF } from 'jspdf';
import {
  assainir,
  CREME,
  FILET,
  LARGEUR_PAGE as W,
  LARGEUR_UTILE as LARGE,
  MARGE as M,
  MARINE,
  OR,
  ENCRE,
  TEXTE_COURANT,
  type DemandePdf,
  type Element,
} from './devisPdfAides';

export type ContextePagesDetail = {
  d: DemandePdf;
  embleme: string | null;
  titreDevis: string;
  aujourdHui: string;
  elementsDescription: Element[];
  // Vrai quand la description a une vraie structure (rubriques, puces).
  structuree: boolean;
  couper: (texte: string, largeur: number, max?: number) => string[];
};

export function dessinerPagesDetail(doc: jsPDF, ctx: ContextePagesDetail): void {
  const { d, embleme, titreDevis, aujourdHui, elementsDescription, structuree, couper } = ctx;
  const YDEBUT = 50; // haut du contenu, sous l'en-tête et le titre de section
  const BAS = 277; // jamais de texte sous cette ligne (le pied commence à 282)
  const LH = 4.9; // interligne confortable à 9,5 pt
  const RETRAIT_PUCE = 6;

  const enTeteSuite = (premierePage: boolean) => {
    doc.setFillColor(...MARINE);
    doc.rect(0, 0, W, 24, 'F');
    let x = M;
    if (embleme) {
      doc.addImage(embleme, 'PNG', M, 5, 14, 14);
      x = M + 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...CREME);
    doc.text('HGWF CARGO', x, 14.5);
    doc.setFontSize(titreDevis.length > 8 ? 15 : 18);
    doc.text(titreDevis, W - M, 12, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(...OR);
    doc.text(`N° ${d.reference}`, W - M, 18.5, { align: 'right' });
    doc.setFillColor(...CREME);
    doc.rect(0, 24, W, 10, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(...MARINE);
    doc.setFont('helvetica', 'normal');
    doc.text(`Émis le ${aujourdHui}`, M, 30.4);
    const client = d.facturationNom?.trim() || d.clientNom?.trim() || '';
    if (client) {
      doc.setFont('helvetica', 'bold');
      doc.text(couper(`Client : ${client}`, 110, 1)[0] ?? '', W - M, 30.4, { align: 'right' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text(
      premierePage ? 'DÉTAIL DE LA PRESTATION' : 'DÉTAIL DE LA PRESTATION (SUITE)',
      M,
      43,
      { charSpace: 0.8 },
    );
    doc.setCharSpace(0);
  };

  // Coupe un texte mot à mot dans la police courante ; la première ligne peut
  // être plus courte (libellé en gras devant).
  const enLignes = (texte: string, premiere: number, largeur: number): string[] => {
    const lignes: string[] = [];
    let courante = '';
    let max = premiere;
    for (const mot of assainir(texte).split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (doc.getTextWidth(essai) <= max || !courante) {
        courante = essai;
        continue;
      }
      lignes.push(courante);
      courante = mot;
      max = largeur;
    }
    if (courante) lignes.push(courante);
    return lignes;
  };

  type Mesure = { el: Element; lignes: string[]; decalage: number; largeur: number; taille: number };
  const mesures: Mesure[] = elementsDescription.map((el, i) => {
    if (el.type === 'titre') return { el, lignes: [], decalage: 0, largeur: LARGE, taille: 10.5 };
    const intro = structuree && i === 0 && !el.puce && !el.libelle;
    const taille = intro ? 10.5 : 9.5;
    const gauche = el.puce ? RETRAIT_PUCE : 0;
    let decalage = 0;
    if (el.libelle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(taille);
      decalage = doc.getTextWidth(`${assainir(el.libelle)} :`) + 1.8;
    }
    doc.setFont('helvetica', intro ? 'bold' : 'normal');
    doc.setFontSize(taille);
    return {
      el,
      lignes: enLignes(el.texte, LARGE - gauche - decalage, LARGE - gauche),
      decalage,
      largeur: LARGE - gauche,
      taille,
    };
  });

  doc.addPage();
  enTeteSuite(true);
  let yy = YDEBUT;
  const nouvellePage = () => {
    doc.addPage();
    enTeteSuite(false);
    yy = YDEBUT;
  };

  mesures.forEach((m, i) => {
    const { el } = m;
    if (el.type === 'titre') {
      const suivant = mesures[i + 1];
      const avant = yy > YDEBUT ? 5 : 0;
      const apres = suivant ? Math.min(2, suivant.lignes.length) * LH : 0;
      // Pas d'intertitre orphelin : il garde au moins deux lignes de son texte.
      if (yy + avant + 9.4 + apres > BAS) nouvellePage();
      else yy += avant;
      doc.setFillColor(...OR);
      doc.rect(M, yy + 0.9, 1.3, 4.3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...MARINE);
      doc.text(assainir(el.texte), M + 4, yy + 4.2);
      doc.setDrawColor(...FILET);
      doc.setLineWidth(0.2);
      doc.line(M, yy + 6.6, W - M, yy + 6.6);
      yy += 9.6;
      return;
    }
    const intro = structuree && i === 0 && !el.puce && !el.libelle;
    const gauche = el.puce ? RETRAIT_PUCE : 0;
    let restantes = m.lignes.length;
    let debut = 0;
    // Un paragraphe de moins de quatre lignes ne se coupe pas ; au-delà, deux
    // lignes au moins restent de chaque côté de la coupure.
    while (restantes > 0) {
      let k = Math.floor((BAS - yy) / LH);
      if (k < restantes) {
        if (m.lignes.length < 4 || restantes - k < 2) k = Math.min(k, restantes - 2);
        if (m.lignes.length < 4 || k < 2) k = 0;
      } else {
        k = restantes;
      }
      if (k <= 0) {
        nouvellePage();
        continue;
      }
      for (let j = 0; j < k; j++) {
        const n = debut + j;
        const base = yy + 3.5 + j * LH;
        if (n === 0) {
          if (el.puce) {
            doc.setFillColor(...MARINE);
            doc.circle(M + 2, base - 1.1, 0.6, 'F');
          }
          if (el.libelle) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(m.taille);
            doc.setTextColor(...MARINE);
            doc.text(`${assainir(el.libelle)} :`, M + gauche, base);
          }
        }
        doc.setFont('helvetica', intro ? 'bold' : 'normal');
        doc.setFontSize(m.taille);
        doc.setTextColor(...(intro ? MARINE : TEXTE_COURANT));
        doc.text(m.lignes[n] ?? '', M + gauche + (n === 0 ? m.decalage : 0), base);
      }
      yy += k * LH;
      debut += k;
      restantes -= k;
      if (restantes > 0) nouvellePage();
    }
    yy += intro ? 3.6 : el.puce ? 1.5 : 2.8;
  });
}
