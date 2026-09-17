/**
 * Banc d'essai manuel du module d'envoi. À lancer à la main, jamais en CI :
 *   node apps/api/test-email.mjs
 * Envoie un vrai message. Supprimer ce fichier une fois le domaine vérifié.
 */
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
for (const ligne of env.split(/\r?\n/)) {
  if (!ligne.trim() || ligne.trim().startsWith('#')) continue;
  const i = ligne.indexOf('=');
  if (i < 0) continue;
  process.env[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
}

// Tant que hgwf-cargo.fr n'est pas vérifié chez Resend, seul le domaine de
// test est autorisé, et uniquement vers l'adresse propriétaire du compte.
process.env.EMAIL_EXPEDITEUR = 'HGWF Cargo <onboarding@resend.dev>';
process.env.EMAIL_INTERNE = 'franckfambou@gmail.com';

const { envoiConfigure, envoyerEmail, gabaritHtml } = await import('./src/email.js');

console.log('envoi configuré :', envoiConfigure());

const r = await envoyerEmail({
  to: process.env.EMAIL_INTERNE,
  subject: 'Votre demande est bien reçue — HGWF-2026-TEST',
  text: [
    'Bonjour Franck,',
    '',
    'Votre demande de transport vers Haïti est bien enregistrée sous la référence HGWF-2026-TEST.',
    '',
    "Un membre de l'équipe l'étudie et vous transmet votre devis sous 24 heures ouvrées.",
    '',
    'Récapitulatif de votre demande :',
    "- Type d'envoi : Groupage (LCL)",
    '- Destination : Haïti',
    '- Volume estimé : Quelques cartons',
    '',
    'Bien cordialement,',
    "L'équipe HGWF Cargo",
  ].join('\n'),
  html: gabaritHtml({
    titre: 'Votre demande est bien reçue',
    paragraphes: [
      'Bonjour Franck,',
      'Votre demande de transport vers Haïti est bien enregistrée sous la référence HGWF-2026-TEST.',
      "Un membre de l'équipe l'étudie et vous transmet votre devis sous 24 heures ouvrées.",
      'Si une information est inexacte, répondez simplement à cet e-mail.',
    ],
    lignes: [
      ["Type d'envoi", 'Groupage (LCL)'],
      ['Destination', 'Haïti'],
      ['Volume estimé', 'Quelques cartons'],
    ],
  }),
  replyTo: process.env.EMAIL_INTERNE,
});

console.log('résultat :', JSON.stringify(r));
