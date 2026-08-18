/**
 * Devis PDF uniforme HGWF Cargo, généré côté back-office avec jsPDF.
 * Toutes les valeurs dynamiques proviennent de la demande sélectionnée :
 * référence, client, contact, envoi, destination, port de départ, volume,
 * colis, remarques, message et montant chiffré.
 */
import { jsPDF } from 'jspdf';

export type DemandePdf = {
  reference: string;
  clientNom?: string;
  contact?: string;
  typeEnvoi?: string;
  destination?: string;
  volume?: string;
  recueLe?: string;
  message?: string;
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
const MARINE: [number, number, number] = [18, 57, 91];
const CREME: [number, number, number] = [251, 244, 230];
const OR: [number, number, number] = [255, 178, 62];
const ENCRE: [number, number, number] = [41, 99, 141];
const CORAIL: [number, number, number] = [255, 111, 94];

const tronquer = (texte: string, max: number) =>
  texte.length > max ? `${texte.slice(0, max - 1)}…` : texte;

// Les polices standard du PDF ne couvrent que Latin-1/CP1252 : on remplace ce
// qui n'y figure pas (flèches saisies dans les champs, symboles exotiques).
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
function assainir(texte: string): string {
  return texte
    .replace(/\s*(?:→|⇒|➔|➜)\s*/g, ' - ')
    .replace(/[^\n\x20-\xFF]/g, (c) => (CP1252_EXTRA.has(c) ? c : '?'));
}

// L'emblème SVG du Studio, rastérisé pour jsPDF ; null si indisponible.
async function chargerEmbleme(): Promise<string | null> {
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

// Construit le document sans le sauvegarder : réutilisable pour les tests.
export async function construireDevisPdf(d: DemandePdf): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 18;
  const LARGE = W - 2 * M;

  const aujourdHui = new Date().toLocaleDateString('fr-FR');
  const colis = lireDetail(d.message, 'Colis');
  const remarques = lireDetail(d.message, 'Remarques colis');
  const depart = lireDetail(d.message, 'Départ');
  const libre = messageLibre(d.message);

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
  doc.setFontSize(26);
  doc.setTextColor(...CREME);
  doc.text('DEVIS', W - M, 20, { align: 'right' });
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

  // ── Émetteur / Client ──
  let y = 62;
  const boite = (x: number, largeur: number, titre: string, lignes: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text(titre.toUpperCase(), x, y, { charSpace: 0.8 });
    doc.setCharSpace(0);
    doc.setFontSize(9.5);
    doc.setTextColor(...MARINE);
    lignes.forEach((l, i) => {
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      doc.text(assainir(l), x, y + 6 + i * 4.6);
    });
  };
  boite(M, 84, 'Émetteur', [
    'HGWF Cargo',
    'Avenue Faidherbe, 93110 Rosny-sous-Bois',
    'R.C.S. Bobigny 940 048 051 · TVA FR18940048051',
    'contact@hgwf-cargo.fr · 09 62 03 80 13',
  ]);
  const lignesClient = [
    d.clientNom ?? 'Client',
    ...(d.contact ? doc.splitTextToSize(d.contact, 78) : []),
  ];
  boite(M + 96, 78, 'Client', lignesClient);
  y += 6 + Math.max(4, lignesClient.length) * 4.6 + 8;

  // ── Détail de la demande ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ENCRE);
  doc.text('DÉTAIL DE LA DEMANDE', M, y, { charSpace: 0.8 });
  doc.setCharSpace(0);
  y += 3;

  const lignes: [string, string][] = [];
  if (d.typeEnvoi) lignes.push(["Type d'envoi", d.typeEnvoi]);
  if (d.destination) lignes.push(['Destination', d.destination]);
  if (depart) lignes.push(['Port de départ', depart]);
  if (d.volume) lignes.push(['Volume estimé', d.volume]);
  if (colis) lignes.push(['Colis (L × l × H en cm × qté)', tronquer(colis, 220)]);
  if (remarques) lignes.push(['Remarques du client', tronquer(remarques, 300)]);
  if (libre) lignes.push(['Message du client', tronquer(libre, 380)]);

  const dessinerLignes = (paires: [string, string][]) => {
    doc.setFontSize(9.5);
    paires.forEach(([libelle, valeur], i) => {
      const texte = doc.splitTextToSize(assainir(valeur), LARGE - 62) as string[];
      const h = Math.max(9, texte.length * 4.4 + 4.6);
      if (i % 2 === 0) {
        doc.setFillColor(...CREME);
        doc.rect(M, y, LARGE, h, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ENCRE);
      doc.text(libelle, M + 3, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MARINE);
      doc.text(texte, M + 60, y + 6);
      y += h;
    });
  };
  dessinerLignes(lignes);
  y += 10;

  // ── Notre proposition (chiffrage renseigné au back-office) ──
  if (d.descriptionPrestation || d.delaiEstime) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text('NOTRE PROPOSITION', M, y, { charSpace: 0.8 });
    doc.setCharSpace(0);
    y += 3;
    const proposition: [string, string][] = [];
    if (d.descriptionPrestation) proposition.push(['Prestation', tronquer(d.descriptionPrestation, 420)]);
    if (d.delaiEstime) proposition.push(['Délai estimé', d.delaiEstime]);
    dessinerLignes(proposition);
    y += 10;
  }

  // ── Montant ──
  doc.setFillColor(...MARINE);
  doc.roundedRect(M, y, LARGE, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...CREME);
  doc.text('MONTANT DU DEVIS', M + 6, y + 12, { charSpace: 0.8 });
  doc.setCharSpace(0);
  doc.setFontSize(17);
  if (d.montantDevis) {
    doc.setTextColor(...OR);
    doc.text(d.montantDevis, W - M - 6, y + 13, { align: 'right' });
  } else {
    doc.setTextColor(...CORAIL);
    doc.text('À compléter', W - M - 6, y + 13, { align: 'right' });
  }
  y += 26;

  // ── Conditions ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...ENCRE);
  const conditions = doc.splitTextToSize(
    'Les prix s’entendent hors taxes, sauf mention contraire. Devis valable trente jours à compter de son émission, établi sur la base des informations communiquées : toute modification des caractéristiques de l’envoi (poids, dimensions, nature, destination) entraîne sa révision. Ne sont pas compris, sauf mention expresse : droits de douane, taxes et redevances exigibles à destination. HGWF Cargo intervient en qualité de commissionnaire de transport. Conditions générales de vente consultables sur www.hgwf-cargo.fr/cgv.',
    LARGE,
  ) as string[];
  doc.text(conditions, M, y);
  y += conditions.length * 3.9 + 10;

  // ── Bon pour accord ──
  doc.setDrawColor(...MARINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, 84, 26, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MARINE);
  doc.text('BON POUR ACCORD', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...ENCRE);
  doc.text('Date et signature du client :', M + 4, y + 12);

  // ── Pied de page ──
  doc.setDrawColor(...MARINE);
  doc.setLineWidth(0.2);
  doc.line(M, 282, W - M, 282);
  doc.setFontSize(7);
  doc.setTextColor(...ENCRE);
  doc.text(
    'HGWF CARGO · AVENUE FAIDHERBE, 93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051 · www.hgwf-cargo.fr',
    W / 2,
    287,
    { align: 'center' },
  );

  return doc;
}

export async function genererDevisPdf(d: DemandePdf): Promise<void> {
  const doc = await construireDevisPdf(d);
  doc.save(`Devis-${d.reference}.pdf`);
}

// ── E-mail prêt à envoyer (.eml) avec le devis PDF déjà joint ────────────────
// Un lien mailto: ne peut pas transporter de pièce jointe : on génère donc un
// fichier e-mail complet (destinataire, objet, corps, PDF joint). L'en-tête
// X-Unsent: 1 le fait ouvrir en brouillon modifiable dans Outlook et Courrier.
function base64Utf8(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const octet of octets) binaire += String.fromCharCode(octet);
  return btoa(binaire);
}

function plier(b64: string): string {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

// Assemblage MIME pur (testable hors navigateur).
export function construireEml(d: DemandePdf, destinataire: string, corps: string, pdfB64: string): string {
  const objet = `Votre devis HGWF Cargo · ${d.reference}`;
  return [
    `To: ${destinataire}`,
    `Subject: =?UTF-8?B?${base64Utf8(objet)}?=`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="hgwf-devis"',
    '',
    '--hgwf-devis',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    plier(base64Utf8(corps)),
    '',
    '--hgwf-devis',
    `Content-Type: application/pdf; name="Devis-${d.reference}.pdf"`,
    `Content-Disposition: attachment; filename="Devis-${d.reference}.pdf"`,
    'Content-Transfer-Encoding: base64',
    '',
    plier(pdfB64),
    '',
    '--hgwf-devis--',
    '',
  ].join('\r\n');
}

export async function genererEmlDevis(d: DemandePdf, destinataire: string, corps: string): Promise<void> {
  const doc = await construireDevisPdf(d);
  const tampon = new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
  let binaire = '';
  for (let i = 0; i < tampon.length; i += 8192) {
    binaire += String.fromCharCode(...tampon.subarray(i, i + 8192));
  }
  const eml = construireEml(d, destinataire, corps, btoa(binaire));

  const url = URL.createObjectURL(new Blob([eml], { type: 'message/rfc822' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `Devis-${d.reference}.eml`;
  lien.click();
  URL.revokeObjectURL(url);
}
