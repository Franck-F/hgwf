/**
 * COPIE de `tools/backoffice/devisPdf.ts` (V1 intacte), sans `construireEml` ni
 * `genererEmlDevis` (code mort), couleurs importées de `theme/tokens.ts`.
 *
 * Devis PDF uniforme HGWF Cargo, généré côté back-office avec jsPDF.
 * Toutes les valeurs dynamiques proviennent de la demande sélectionnée :
 * référence, client (et son adresse de facturation une fois saisie), contact,
 * envoi, destination, port de départ, volume, colis, remarques, message et
 * montant chiffré (HT, TVA, TTC ; simple chaîne pour les anciens devis).
 *
 * Ce fichier garde l'ordonnancement et le budget vertical de la première page ;
 * le dessin est réparti dans `devisPdfPage.ts` (cadre), `devisPdfMontant.ts`
 * (montant, conditions, bon pour accord), `devisPdfSuite.ts` (pages de détail)
 * et `devisPdfAides.ts` (types, palette, texte), pour tenir sous 300 lignes.
 */
import { jsPDF } from 'jspdf';
import { calculerChiffrage, MENTION_EXONERATION } from '../domaine/chiffrage';
import {
  analyserDescription,
  assainir,
  ENCRE,
  LARGEUR_UTILE as LARGE,
  lireDetail,
  MARGE as M,
  messageLibre,
  tronquer,
  CREME,
  MARINE,
  type DemandePdf,
} from './devisPdfAides';
import { dessinerEncadres, dessinerEntete, dessinerPied } from './devisPdfPage';
import {
  BANDEAU,
  dessinerMontant,
  HAUT_BON,
  HAUT_CHIFFRAGE,
  LARGEUR_CONDITIONS,
  PAS_CONDITIONS,
} from './devisPdfMontant';
import { dessinerPagesDetail } from './devisPdfSuite';

// Ces symboles étaient exportés d'ici dans V1 : on les garde accessibles.
export { analyserDescription, lireDetail, messageLibre, type DemandePdf };

// Construit le document sans le sauvegarder : réutilisable pour les tests.
export async function construireDevisPdf(d: DemandePdf): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
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

  // Montant : HT et TVA recalculés d'abord ; l'ancienne chaîne seulement à défaut.
  // Sans l'un ni l'autre, le devis est provisoire (prix encore à fixer).
  const chiffrage = calculerChiffrage(d.montantHT, d.tauxTVA);
  const ancien = chiffrage ? null : d.montantDevis?.trim() || null;
  const provisoire = !chiffrage && !ancien;
  const titreDevis = provisoire ? 'DEVIS PROVISOIRE' : 'DEVIS';


  const embleme = await dessinerEntete(doc, d, titreDevis, aujourdHui);

  // ── Émetteur / Client ──
  let y = dessinerEncadres(doc, couper, d, 62);

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
  // Devis provisoire (sans HT/TVA) : bandeau 20 + 5 = 25 et mention de deux
  // lignes + conditions, soit 10 × 3,5 = 35 (le bon pour accord, 24, est moins
  // haut) : 60 contre 65 pour le cas chiffré à 0 %, donc le pire cas ne grandit pas.
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
  // Description structurée (rubriques, puces, paragraphes) : la page 1 n'en
  // garde que la phrase d'objet, le détail typographié va en page 2.
  const descriptionComplete = tronquer(d.descriptionPrestation?.trim() ?? '', 6000);
  const elementsDescription = analyserDescription(descriptionComplete);
  const structuree =
    /\n\s*\n/.test(descriptionComplete) ||
    elementsDescription.some((e) => e.type === 'titre' || (e.type === 'para' && (e.puce || e.libelle)));
  const premier = elementsDescription[0];
  const resumePrestation = structuree
    ? premier?.type === 'para' && !premier.puce && !premier.libelle
      ? premier.texte
      : 'Voir le détail de la prestation en page 2.'
    : descriptionComplete;
  const rPrestation = rangee('Prestation', resumePrestation, 1, 6);
  const rDelai = rangee('Délai estimé', d.delaiEstime, 1, 2);
  const presentes = (rs: (Rangee | null)[]) => rs.filter((r): r is Rangee => r !== null);
  const detail = presentes([...courts, rColis, rRemarques, rMessage]);
  const proposition = presentes([rPrestation, rDelai]);
  const croissance = presentes([rPrestation, ...courts, rDelai, rColis, rRemarques, rMessage]);

  // Mention d’exonération (ou de devis provisoire) et conditions : leurs largeurs
  // et interlignes sont dans devisPdfMontant.ts, avec le bon pour accord.
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const lignesMention = provisoire
    ? couper(
        'Devis provisoire : le montant sera établi dès réception des informations complémentaires demandées.',
        LARGEUR_CONDITIONS,
      )
    : chiffrage?.taux === 0
      ? couper(MENTION_EXONERATION, LARGEUR_CONDITIONS)
      : [];
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
    BANDEAU + 5 + // bandeau toujours présent : TTC, ancien montant ou « À établir »
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

  // Description complète (la règle depuis le 29/10/2026 : objet, compris, non
  // compris, documents, conditions) plus longue que sa place : un extrait ici,
  // signalé dans le libellé, et le texte entier en page 2.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const suite =
    rPrestation !== null &&
    (structuree || couper(descriptionComplete, LARGEUR_VALEUR).length > rPrestation.n);
  if (suite && rPrestation) rPrestation.libelle = 'Prestation (détail p. 2)';

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

  // ── Montant, conditions, bon pour accord ──
  dessinerMontant(
    doc,
    { chiffrage, ancien, provisoire, lignesMention, lignesConditions, couper },
    y,
  );

  // ── Pages de détail : description complète de la prestation, typographiée ──
  if (suite) {
    dessinerPagesDetail(doc, { d, embleme, titreDevis, aujourdHui, elementsDescription, structuree, couper });
  }

  dessinerPied(doc);
  return doc;
}

export async function genererDevisPdf(d: DemandePdf): Promise<void> {
  const doc = await construireDevisPdf(d);
  doc.save(`Devis-${d.reference}.pdf`);
}
