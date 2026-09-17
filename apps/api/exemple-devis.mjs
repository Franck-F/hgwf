/**
 * Génère un devis PDF d'exemple et l'envoie par e-mail, pour valider le rendu
 * avant de brancher le bouton du back-office. À lancer à la main :
 *   node apps/api/exemple-devis.mjs
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { jsPDF } = require('../studio/node_modules/jspdf');

const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
for (const ligne of env.split(/\r?\n/)) {
  if (!ligne.trim() || ligne.trim().startsWith('#')) continue;
  const i = ligne.indexOf('=');
  if (i > 0) process.env[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
}

const { envoyerEmail, gabaritHtml } = await import('./src/email.js');

// ── Devis d'exemple ───────────────────────────────────────────────────────────
const d = {
  reference: 'HGWF-2026-4246',
  client: 'Merline PHILISTIN',
  recueLe: '04/09/2026',
  typeEnvoi: 'Groupage maritime (LCL)',
  destination: 'Port-au-Prince, Haïti',
  depart: 'Le Havre',
  volume: '3 m³',
  prestation: 'Groupage maritime port à port, dédouanement export inclus',
  delai: '4 à 6 semaines',
  montantHT: 1250,
  tauxTVA: 0,
};
const montantTVA = (d.montantHT * d.tauxTVA) / 100;
const montantTTC = d.montantHT + montantTVA;
const euros = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dateLimite = '04/10/2026';

// ── PDF ───────────────────────────────────────────────────────────────────────
const MARINE = [6, 53, 101];
const ARDOISE = [69, 86, 106];
const CREME = [251, 244, 230];

const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
const L = 18;
let y = 0;

pdf.setFillColor(...MARINE);
pdf.rect(0, 0, 210, 32, 'F');
pdf.setTextColor(255, 255, 255);
pdf.setFont('helvetica', 'bold').setFontSize(19);
pdf.text('HGWF CARGO', L, 15);
pdf.setFont('helvetica', 'normal').setFontSize(9);
pdf.text('Commissionnaire de transport international', L, 22);
pdf.text('Rosny-sous-Bois · 09 62 03 80 13 · contact@hgwf-cargo.fr', L, 27);

y = 46;
pdf.setTextColor(...MARINE).setFont('helvetica', 'bold').setFontSize(16);
pdf.text('DEVIS', L, y);
pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...ARDOISE);
pdf.text(`N° ${d.reference}`, 210 - L, y, { align: 'right' });
pdf.text(`Émis le ${d.recueLe} · valable jusqu'au ${dateLimite}`, 210 - L, y + 5, { align: 'right' });

y += 16;
pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...MARINE);
pdf.text('CLIENT', L, y);
pdf.setFont('helvetica', 'normal').setTextColor(...ARDOISE);
pdf.text(d.client, L, y + 6);

y += 20;
pdf.setFillColor(...CREME);
pdf.rect(L, y, 210 - L * 2, 30, 'F');
pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...MARINE);
pdf.text('VOTRE ENVOI', L + 5, y + 8);
pdf.setFont('helvetica', 'normal').setTextColor(...ARDOISE);
const infos = [
  ["Type d'envoi", d.typeEnvoi],
  ['Trajet', `${d.depart} → ${d.destination}`],
  ['Volume estimé', d.volume],
];
infos.forEach(([k, v], i) => {
  pdf.text(k, L + 5, y + 15 + i * 5);
  pdf.text(v, L + 45, y + 15 + i * 5);
});

y += 42;
pdf.setDrawColor(...MARINE).setLineWidth(0.4);
pdf.line(L, y, 210 - L, y);
pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...MARINE);
pdf.text('DÉSIGNATION', L, y + 6);
pdf.text('MONTANT HT', 210 - L, y + 6, { align: 'right' });
pdf.line(L, y + 9, 210 - L, y + 9);

pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...ARDOISE);
const lignes = pdf.splitTextToSize(d.prestation, 110);
pdf.text(lignes, L, y + 17);
pdf.text(euros(d.montantHT), 210 - L, y + 17, { align: 'right' });
pdf.setFontSize(9);
pdf.text(`Délai estimé : ${d.delai}`, L, y + 17 + lignes.length * 5 + 3);

y += 45;
pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...ARDOISE);
pdf.text('Total HT', 130, y);
pdf.text(euros(d.montantHT), 210 - L, y, { align: 'right' });
pdf.text(`TVA ${d.tauxTVA} %`, 130, y + 6);
pdf.text(euros(montantTVA), 210 - L, y + 6, { align: 'right' });
pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...MARINE);
pdf.text('Total TTC', 130, y + 15);
pdf.text(euros(montantTTC), 210 - L, y + 15, { align: 'right' });

pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...ARDOISE);
pdf.text(
  pdf.splitTextToSize(
    "TVA non applicable — exportation hors Union européenne (art. 262 du CGI). Devis valable trente jours. Les dates de départ et de clôture sont communiquées à l'acceptation. Tarif établi sur la base du volume déclaré ; un écart constaté au chargement donne lieu à réajustement.",
    210 - L * 2,
  ),
  L,
  258,
);
pdf.setFillColor(...MARINE);
pdf.rect(0, 277, 210, 20, 'F');
pdf.setTextColor(255, 255, 255).setFontSize(8);
pdf.text('HGWF Cargo · hgwf-cargo.fr · 09 62 03 80 13', 105, 289, { align: 'center' });

const pdfBase64 = pdf.output('datauristring').split(',')[1];
console.log('PDF genere :', Math.round((pdfBase64.length * 3) / 4 / 1024), 'Ko');

// ── E-mail ────────────────────────────────────────────────────────────────────
const texte = [
  `Bonjour Merline,`,
  '',
  `Voici votre devis pour ${d.destination}, référence ${d.reference}.`,
  '',
  `  Montant        ${euros(montantTTC)}`,
  `  Prestation     ${d.prestation}`,
  `  Délai estimé   ${d.delai}`,
  `  Validité       jusqu'au ${dateLimite}`,
  '',
  'Le devis détaillé est en pièce jointe.',
  '',
  "Pour l'accepter, répondez simplement « je valide » à cet e-mail. Nous ouvrons alors votre dossier et vous transmettons les prochaines dates de départ.",
  '',
  'Une question, un ajustement ? Répondez ici ou appelez-nous au 09 62 03 80 13.',
  '',
  'Bien cordialement,',
  "L'équipe HGWF Cargo",
].join('\n');

const r = await envoyerEmail({
  to: 'franckfambou@gmail.com',
  subject: `Votre devis HGWF Cargo — ${euros(montantTTC)}`,
  text: texte,
  html: gabaritHtml({
    titre: 'Votre devis est prêt',
    paragraphes: [
      'Bonjour Merline,',
      `Voici votre devis pour ${d.destination}, référence ${d.reference}. Le document détaillé est en pièce jointe.`,
      "Pour l'accepter, répondez simplement « je valide » à cet e-mail. Nous ouvrons alors votre dossier et vous transmettons les prochaines dates de départ.",
      'Une question, un ajustement ? Répondez ici ou appelez-nous au 09 62 03 80 13.',
    ],
    lignes: [
      ['Montant', euros(montantTTC)],
      ['Prestation', d.prestation],
      ['Délai estimé', d.delai],
      ['Validité', `jusqu'au ${dateLimite}`],
    ],
  }),
  replyTo: 'contact@hgwf-cargo.fr',
  attachments: [{ filename: `Devis-${d.reference}.pdf`, content: pdfBase64 }],
});

console.log('envoi :', JSON.stringify(r));
