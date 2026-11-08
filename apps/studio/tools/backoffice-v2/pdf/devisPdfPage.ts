/**
 * Cadre fixe du devis PDF : en-tête et bandeau méta, encadrés Émetteur / Client
 * et pied de page. Extrait de `devisPdf.ts` (même code, mêmes mesures) pour
 * tenir sous 300 lignes.
 */
import type { jsPDF } from 'jspdf';
import { lignesFacturation } from '../domaine/chiffrage';
import {
  chargerEmbleme,
  CREME,
  ENCRE,
  LARGEUR_PAGE as W,
  LARGEUR_UTILE as LARGE,
  MARGE as M,
  MARINE,
  OR,
  tronquer,
  type DemandePdf,
} from './devisPdfAides';

type Couper = (texte: string, largeur: number, max?: number) => string[];

// En-tête marine et bandeau méta ; renvoie l'emblème (réutilisé en page 2).
export async function dessinerEntete(
  doc: jsPDF,
  d: DemandePdf,
  titreDevis: string,
  aujourdHui: string,
): Promise<string | null> {
  // ── En-tête marine ──
  doc.setFillColor(...MARINE);
  doc.rect(0, 0, W, 40, 'F');
  const embleme = await chargerEmbleme();
  let brandX = M;
  if (embleme) {
    doc.addImage(embleme, 'PNG', M, 9, 22, 22);
    brandX = M + 27;
  }
  doc.setTextColor(...CREME);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('HGWF CARGO', brandX, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...OR);
  doc.text('TRANSPORT DE MARCHANDISES DANS LE MONDE ENTIER', brandX, 26, { charSpace: 0.6 });
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'bold');
  // Le titre se réduit au besoin pour rester à droite de « HGWF CARGO ».
  let taille = 26;
  doc.setFontSize(taille);
  while (taille > 14 && doc.getTextWidth(titreDevis) > 86) doc.setFontSize(--taille);
  doc.setTextColor(...CREME);
  doc.text(titreDevis, W - M, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(...OR);
  doc.text(`N° ${d.reference}`, W - M, 27, { align: 'right' });

  // ── Bandeau méta ──
  doc.setFillColor(...CREME);
  doc.rect(0, 40, W, 12, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(...MARINE);
  doc.setFont('helvetica', 'normal');
  const meta = [
    `Émis le ${aujourdHui}`,
    d.recueLe ? `Demande reçue le ${d.recueLe}` : null,
    'Validité : trente jours',
  ].filter(Boolean) as string[];
  meta.forEach((texte, i) => doc.text(texte, M + i * (LARGE / meta.length), 47.5));
  return embleme;
}

// Encadrés Émetteur et Client, côte à côte ; renvoie l'ordonnée sous les encadrés.
export function dessinerEncadres(doc: jsPDF, couper: Couper, d: DemandePdf, yDepart: number): number {
  let y = yDepart;
  const PAS_BOITE = 4.4;
  // Au plus 12 lignes côté client : une adresse de facturation complète en
  // prend 7, plus « À l'attention de » et le contact sur deux lignes, avec de
  // la marge pour une adresse longue. Au-delà, la dernière ligne tracée se
  // termine par « … » : une coupure doit se voir.
  const MAX_LIGNES_CLIENT = 12;
  // Chaque ligne logique est coupée à la largeur de l'encadré (le nom, en gras,
  // peut tenir sur deux lignes). Renvoie le nombre de lignes tracées.
  const boite = (x: number, largeur: number, titre: string, lignes: string[], max = Infinity): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text(titre.toUpperCase(), x, y, { charSpace: 0.8 });
    doc.setCharSpace(0);
    doc.setFontSize(9.5);
    doc.setTextColor(...MARINE);
    const morceaux: { texte: string; gras: boolean }[] = [];
    lignes.forEach((l, i) => {
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      for (const texte of couper(tronquer(l, 200), largeur)) morceaux.push({ texte, gras: i === 0 });
    });
    const gardes = morceaux.slice(0, max);
    const der = gardes[gardes.length - 1];
    if (morceaux.length > max && der) {
      doc.setFont('helvetica', der.gras ? 'bold' : 'normal');
      let fin = der.texte;
      while (fin && doc.getTextWidth(`${fin}…`) > largeur) fin = fin.slice(0, -1);
      gardes[gardes.length - 1] = { ...der, texte: `${fin.trimEnd()}…` };
    }
    gardes.forEach((m, n) => {
      doc.setFont('helvetica', m.gras ? 'bold' : 'normal');
      doc.text(m.texte, x, y + 6 + n * PAS_BOITE);
    });
    return gardes.length;
  };
  const nEmetteur = boite(M, 84, 'Émetteur', [
    'HGWF Cargo',
    'Avenue Faidherbe, 93110 Rosny-sous-Bois',
    'R.C.S. Bobigny 940 048 051 · TVA FR18940048051',
    'contact@hgwf-cargo.fr · 09 62 03 80 13',
  ]);
  // L'adresse de facturation, saisie à la validation du devis, prend la tête de
  // l'encadré. Le demandeur n'y revient qu'en « À l'attention de » s'il diffère
  // du nom facturé (un salarié pour sa société), puis ses coordonnées.
  const facturation = lignesFacturation(d);
  const nomClient = d.clientNom?.trim() ?? '';
  const nomFacture = d.facturationNom?.trim() ?? '';
  const contact = d.contact?.trim() ? [d.contact.trim()] : [];
  const lignesClient = facturation.length
    ? [
        ...(nomFacture ? [] : [nomClient || 'Client']),
        ...facturation,
        ...(nomFacture && nomClient && nomClient.toLowerCase() !== nomFacture.toLowerCase()
          ? [`À l’attention de ${nomClient}`]
          : []),
        ...contact,
      ]
    : [nomClient || 'Client', ...contact];
  const nClient = boite(M + 96, 78, 'Client', lignesClient, MAX_LIGNES_CLIENT);
  y += 6 + Math.max(nEmetteur, nClient) * PAS_BOITE + 5;
  return y;
}

// Pied de page identique sur chaque page, numérotation si plusieurs pages.
export function dessinerPied(doc: jsPDF): void {
  const nbPages = doc.getNumberOfPages();
  for (let p = 1; p <= nbPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...MARINE);
    doc.setLineWidth(0.2);
    doc.line(M, 282, W - M, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE);
    doc.text(
      'HGWF CARGO · AVENUE FAIDHERBE, 93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051 · www.hgwf-cargo.fr',
      W / 2,
      287,
      { align: 'center' },
    );
    if (nbPages > 1) doc.text(`Page ${p} / ${nbPages}`, W / 2, 292, { align: 'center' });
  }
}
