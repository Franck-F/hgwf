/**
 * Devis PDF uniforme HGWF Cargo, généré côté back-office avec jsPDF.
 * Toutes les valeurs dynamiques proviennent de la demande sélectionnée :
 * référence, client (et son adresse de facturation une fois saisie), contact,
 * envoi, destination, port de départ, volume, colis, remarques, message et
 * montant chiffré (HT, TVA, TTC ; simple chaîne pour les anciens devis).
 */
import { jsPDF } from 'jspdf';
import {
  calculerChiffrage,
  euros,
  lignesFacturation,
  MENTION_EXONERATION,
  pourcentage,
  type Facturation,
} from './chiffrage';

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
const MARINE: [number, number, number] = [18, 57, 91];
const CREME: [number, number, number] = [251, 244, 230];
const OR: [number, number, number] = [255, 178, 62];
const ENCRE: [number, number, number] = [41, 99, 141];

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
  // Le devis tient sur une seule page dont le pied est fixe (filet à 282 mm) :
  // rien ne descend sous LIMITE. Voir « Budget vertical » plus bas.
  const LIMITE = 279;

  // Assainit un texte, le coupe à la largeur voulue dans la police courante et
  // le limite à `max` lignes, la dernière gardée finissant alors par « … ».
  // Mesurer et dessiner passent par elle, avec la même police : le nombre de
  // lignes compté pour le budget est exactement celui qui sera tracé.
  const couper = (texte: string, largeur: number, max = Infinity): string[] => {
    const lignes = doc.splitTextToSize(assainir(texte), largeur) as string[];
    if (lignes.length <= max) return lignes;
    if (max <= 0) return [];
    const gardees = lignes.slice(0, max);
    let fin = gardees[max - 1] ?? '';
    while (fin && doc.getTextWidth(`${fin}…`) > largeur) fin = fin.slice(0, -1);
    gardees[max - 1] = `${fin.trimEnd()}…`;
    return gardees;
  };

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

  // ── Budget vertical ──
  // Une seule page, pied fixe : message et prestation longs poussaient déjà le
  // bon pour accord hors de la page (jusqu'à 358 mm), et une adresse de
  // facturation allonge l'encadré client de six lignes. Les rangées se mesurent
  // donc en lignes, pas en caractères : chacune part de son minimum, puis la
  // place qui reste au-dessus de LIMITE est distribuée une ligne à la fois, à
  // tour de rôle et par ordre d'importance (prestation, champs courts, délai,
  // colis, remarques, message du client), jusqu'au maximum de chacune. Le
  // message peut disparaître en dernier recours : le client le connaît, et
  // l'opérateur l'a sous les yeux dans le back-office.
  // Pire cas, toutes les rangées présentes à leur minimum (mm) : encadrés
  // 62 + 6 + 12 × 4,4 + 5 = 125,8 ; détail 3 + 6 × 8 + 7 = 58 ; proposition
  // 3 + 2 × 8 + 7 = 26 ; HT, TVA et bandeau 12 + 20 + 5 = 37 ; mention 0 % et
  // conditions 8 × 3,5 = 28. Total 274,8 ≤ 279 : le budget ne peut pas manquer.
  const PAS = 4; // interligne des rangées
  const ECART = 7; // entre deux sections
  const LARGEUR_VALEUR = LARGE - 62;
  const hauteurRangee = (n: number) => (n > 0 ? n * PAS + 4 : 0);
  type Rangee = { libelle: string; valeur: string; n: number; max: number };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const rangee = (libelle: string, valeur: string | null | undefined, min: number, max: number): Rangee | null => {
    const texte = tronquer(valeur?.trim() ?? '', 1200);
    if (!texte) return null;
    const lignes = couper(texte, LARGEUR_VALEUR).length;
    return { libelle, valeur: texte, n: Math.min(min, lignes), max: Math.min(max, lignes) };
  };
  const courts = [
    rangee("Type d'envoi", d.typeEnvoi, 1, 2),
    rangee('Destination', d.destination, 1, 2),
    rangee('Port de départ', depart, 1, 2),
    rangee('Volume estimé', d.volume, 1, 2),
  ];
  const rColis = rangee('Colis (L × l × H en cm × qté)', colis, 1, 4);
  const rRemarques = rangee('Remarques du client', remarques, 1, 4);
  const rMessage = rangee('Message du client', libre, 0, 6);
  const rPrestation = rangee('Prestation', d.descriptionPrestation, 1, 6);
  const rDelai = rangee('Délai estimé', d.delaiEstime, 1, 2);
  const presentes = (rs: (Rangee | null)[]) => rs.filter((r): r is Rangee => r !== null);
  const detail = presentes([...courts, rColis, rRemarques, rMessage]);
  const proposition = presentes([rPrestation, rDelai]);
  const croissance = presentes([rPrestation, ...courts, rDelai, rColis, rRemarques, rMessage]);

  // Montant : HT et TVA recalculés d'abord ; l'ancienne chaîne seulement à défaut.
  const chiffrage = calculerChiffrage(d.montantHT, d.tauxTVA);
  const ancien = chiffrage ? null : d.montantDevis?.trim() || null;
  const BANDEAU = 20;
  const HAUT_CHIFFRAGE = 12; // lignes HT et TVA au-dessus du bandeau

  // Conditions à gauche, bon pour accord à droite : côte à côte, ils prennent
  // la hauteur du plus haut des deux au lieu de leur somme.
  const LARGEUR_BON = 62;
  const HAUT_BON = 24;
  const LARGEUR_CONDITIONS = LARGE - LARGEUR_BON - 8;
  const PAS_CONDITIONS = 3.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const lignesMention = chiffrage?.taux === 0 ? couper(MENTION_EXONERATION, LARGEUR_CONDITIONS) : [];
  doc.setFont('helvetica', 'normal');
  // Quand HT, TVA et TTC sont affichés, « hors taxes, sauf mention contraire »
  // ne serait plus exact ; les anciens devis (chaîne libre) gardent leur phrase.
  const lignesConditions = couper(
    `${
      chiffrage
        ? 'Montants en euros ; TVA calculée sur le montant hors taxes, au taux indiqué.'
        : 'Les prix s’entendent hors taxes, sauf mention contraire.'
    } Devis valable trente jours à compter de son émission, établi sur la base des informations communiquées : toute modification des caractéristiques de l’envoi (poids, dimensions, nature, destination) entraîne sa révision. Ne sont pas compris, sauf mention expresse : droits de douane, taxes et redevances exigibles à destination. HGWF Cargo intervient en qualité de commissionnaire de transport. Conditions générales de vente consultables sur www.hgwf-cargo.fr/cgv.`,
    LARGEUR_CONDITIONS,
  );

  const hauteurFin =
    (chiffrage ? HAUT_CHIFFRAGE : 0) +
    (chiffrage || ancien ? BANDEAU + 5 : 0) +
    Math.max((lignesMention.length + lignesConditions.length) * PAS_CONDITIONS, HAUT_BON);
  const hauteurSection = (rs: Rangee[]) => 3 + rs.reduce((s, r) => s + hauteurRangee(r.n), 0) + ECART;
  let reste =
    LIMITE - y - hauteurSection(detail) - (proposition.length ? hauteurSection(proposition) : 0) - hauteurFin;
  let servi = true;
  while (servi) {
    servi = false;
    for (const r of croissance) {
      const cout = hauteurRangee(r.n + 1) - hauteurRangee(r.n);
      if (r.n < r.max && cout <= reste) {
        r.n++;
        reste -= cout;
        servi = true;
      }
    }
  }

  // ── Détail de la demande ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ENCRE);
  doc.text('DÉTAIL DE LA DEMANDE', M, y, { charSpace: 0.8 });
  doc.setCharSpace(0);
  y += 3;

  const dessinerLignes = (rangees: Rangee[]) => {
    doc.setFontSize(9.5);
    rangees
      .filter((r) => r.n > 0)
      .forEach((r, i) => {
        const h = hauteurRangee(r.n);
        if (i % 2 === 0) {
          doc.setFillColor(...CREME);
          doc.rect(M, y, LARGE, h, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE);
        doc.text(r.libelle, M + 3, y + 5.3);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MARINE);
        couper(r.valeur, LARGEUR_VALEUR, r.n).forEach((ligne, j) => doc.text(ligne, M + 60, y + 5.3 + j * PAS));
        y += h;
      });
  };
  dessinerLignes(detail);
  y += ECART;

  // ── Notre proposition (chiffrage renseigné au back-office) ──
  if (proposition.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ENCRE);
    doc.text('NOTRE PROPOSITION', M, y, { charSpace: 0.8 });
    doc.setCharSpace(0);
    y += 3;
    dessinerLignes(proposition);
    y += ECART;
  }

  // ── Montant ──
  // HT et TVA au-dessus du bandeau, le TTC dedans : c'est ce que le client
  // paiera. Un ancien devis garde sa chaîne libre ; sans montant, pas de bandeau.
  const bandeau = (libelle: string, montant: string) => {
    doc.setFillColor(...MARINE);
    doc.roundedRect(M, y, LARGE, BANDEAU, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CREME);
    doc.text(libelle, M + 6, y + 12, { charSpace: 0.8 });
    doc.setCharSpace(0);
    doc.setFontSize(17);
    doc.setTextColor(...OR);
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
  doc.text('BON POUR ACCORD', xBon + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...ENCRE);
  doc.text('Date et signature du client :', xBon + 4, y + 12);

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
