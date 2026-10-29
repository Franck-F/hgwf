/**
 * API HGWF Cargo : pont entre le site statique et le dataset privé « operations ».
 *
 *   POST /api/demande-devis  → crée un document demandeDevis (formulaires publics)
 *   GET  /api/suivi?ref=XXX  → statut d'une expédition (trajet, étape, ETA, jamais le client)
 *   GET  /api/sante          → vérification de vie
 *   POST /api/suggestion-devis → proposition Gemini pour un champ du chiffrage (back-office, clé)
 *
 * Ce module exporte le gestionnaire HTTP pur (req, res) : `src/server.js`
 * l'enveloppe dans un serveur Node pour le dev local, `api/index.js` l'expose
 * en fonction serverless sur Vercel.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { envoiConfigure, envoyerEmail, gabaritHtml } from './email.js';
import { aUnMontant, calculerChiffrage, lignesMontant, montantAnnonce } from './montant.js';
import { CHAMPS_SUGGESTION, MODELE_PAR_DEFAUT, construireRequete, demanderSuggestion, validerSuggestion } from './suggestion.js';
import { facturationDepuisFormulaire } from './facturation.js';

// ── Chargement .env (sans dépendance) : dev local uniquement ─────────────────
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const ligne of env.split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  // pas de .env : on s'appuie sur l'environnement (Vercel, CI…)
}

const PROJECT_ID = process.env.SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET || 'operations';
const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!PROJECT_ID || !TOKEN) {
  throw new Error('SANITY_PROJECT_ID et SANITY_API_WRITE_TOKEN sont requis (voir .env.example).');
}

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-10-01',
  token: TOKEN,
  useCdn: false,
});

// ── Limitation de débit (en mémoire, par IP) ─────────────────────────────────
const FENETRE_MS = 60_000;
const MAX_PAR_FENETRE = 10;
const compteurs = new Map();

function tropDeRequetes(ip) {
  const now = Date.now();
  const entree = compteurs.get(ip);
  if (!entree || now - entree.debut > FENETRE_MS) {
    compteurs.set(ip, { debut: now, n: 1 });
    return false;
  }
  entree.n += 1;
  return entree.n > MAX_PAR_FENETRE;
}

// ── Helpers HTTP ──────────────────────────────────────────────────────────────
function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-hgwf-cle, Authorization',
    // 10 minutes, pas 24 h. Un préflight en échec est mis en cache par le
    // navigateur pendant toute cette durée : avec une journée, une erreur de
    // configuration CORS reste invisible et non corrigeable côté visiteur.
    'Access-Control-Max-Age': '600',
  };
}

function json(res, status, corps, extra = {}) {
  const data = JSON.stringify(corps);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extra });
  res.end(data);
}

function lireCorps(req, max = 50_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > max) {
        reject(new Error('corps trop volumineux'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const nettoyer = (v, max = 300) => String(v ?? '').trim().slice(0, max);

// Horodatage lisible par un humain dans le back-office : la date et l'heure,
// pas un ISO 8601 que personne ne lit d'un coup d'oeil.
function horodatage() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} a ${p(d.getHours())}h${p(d.getMinutes())}`;
}

// Adresse à qui écrire, pour une demande comme pour une expédition.
//
// Les documents créés depuis le 18/09/2026 portent un champ `email` distinct.
// Les plus anciens n'ont qu'une chaîne libre « mail · tél (préférence : X) » :
// on continue de l'analyser pour eux, jamais pour les nouveaux.
function adresseClient(doc) {
  const explicite = (doc?.email ?? '').trim();
  if (explicite) return explicite;
  return (doc?.contact ?? '').match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
}

// ── Référence unique HGWF-AAAA-NNNN ──────────────────────────────────────────
async function genererReference() {
  const annee = new Date().getFullYear();
  for (let essai = 0; essai < 6; essai += 1) {
    const ref = `HGWF-${annee}-${1000 + Math.floor(Math.random() * 9000)}`;
    const existe = await sanity.fetch(`count(*[_type == "demandeDevis" && reference == $ref])`, { ref });
    if (!existe) return ref;
  }
  return `HGWF-${annee}-${Date.now() % 100000}`;
}

// ── Routes ────────────────────────────────────────────────────────────────────
async function creerDemande(req, res, cors) {
  let corps;
  try {
    corps = JSON.parse((await lireCorps(req)) || '{}');
  } catch {
    return json(res, 400, { ok: false, erreur: 'JSON invalide' }, cors);
  }

  // Pot de miel anti-spam : champ invisible, rempli uniquement par les robots.
  if (corps.website) return json(res, 200, { ok: true, reference: 'HGWF-0000-0000' }, cors);

  const nom = nettoyer(corps.nom, 120);
  const email = nettoyer(corps.email, 160);
  const tel = nettoyer(corps.tel, 40);
  if (!nom || (!email && !tel)) {
    return json(res, 422, { ok: false, erreur: 'nom et un moyen de contact (email ou tel) sont requis' }, cors);
  }

  const reference = await genererReference();
  const preference = nettoyer(corps.preference, 40);
  const contact =
    [email, tel].filter(Boolean).join(' · ') + (preference ? ` (préférence : ${preference})` : '');
  const maintenant = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const recueLe = `${pad(maintenant.getDate())}/${pad(maintenant.getMonth() + 1)}/${maintenant.getFullYear()}`;

  const details = [
    corps.colis ? `Colis : ${nettoyer(corps.colis, 400)}` : '',
    corps.commentaireColis ? `Remarques colis : ${nettoyer(corps.commentaireColis, 1000)}` : '',
    corps.portDepart ? `Départ : ${nettoyer(corps.portDepart, 80)}` : '',
    nettoyer(corps.message, 2000),
  ]
    .filter(Boolean)
    .join('\n');

  const doc = await sanity.create({
    _type: 'demandeDevis',
    reference,
    clientNom: nom,
    // Le formulaire envoie déjà trois champs distincts : on les conserve tels
    // quels. `contact` reste la version lisible affichée dans le back-office,
    // mais plus aucun envoi ne dépend d'une expression régulière pour
    // retrouver l'adresse du client.
    email: email || undefined,
    telephone: tel || undefined,
    preferenceContact: preference || undefined,
    contact,
    typeEnvoi: nettoyer(corps.typeEnvoi, 80) || 'Demande via le site',
    destination: nettoyer(corps.destination, 80),
    volume: nettoyer(corps.volume, 40),
    recueLe,
    statut: 0,
    message: details,
    // Facturation pré-remplie depuis le formulaire (nom toujours, le reste si
    // le visiteur l'a donné) ; ce qui manque sera demandé par l'équipe.
    ...facturationDepuisFormulaire(nom, corps.facturation),
  });

  console.log(`[demande] ${reference} — ${nom} → ${corps.destination ?? '?'}`);

  // Accusé de réception et alerte interne, après l'écriture dans Sanity.
  //
  // L'attente est délibérée : sur une fonction serverless, l'exécution est
  // gelée dès la réponse HTTP renvoyée, et tout envoi laissé en arrière-plan
  // est tué avant d'aboutir. Il faut donc attendre.
  //
  // `notifierDemande` ne rejette jamais : un e-mail raté n'empêche pas la
  // demande d'être enregistrée ni le client de recevoir son 201.
  const accuseEnvoye = await notifierDemande({ reference, nom, email, destination: nettoyer(corps.destination, 80), typeEnvoi: nettoyer(corps.typeEnvoi, 80), volume: nettoyer(corps.volume, 40) });
  if (accuseEnvoye) {
    // Trace visible dans le back-office : sans elle, savoir si le client a
    // recu quelque chose obligeait a fouiller les journaux du serveur.
    await sanity.patch(doc._id).set({ accuseReceptionLe: horodatage() }).commit().catch(() => {});
  }

  return json(res, 201, { ok: true, reference }, cors);
}

// ── Envoi du devis au client ──────────────────────────────────────────────────
// Remplace le `mailto:` du back-office, qui ouvrait la messagerie de l'opérateur
// sans laisser la moindre trace ni preuve d'envoi.
//
// Choix de conception important : le back-office n'envoie que la **référence**
// et le **PDF**. Le destinataire, l'objet et le corps sont reconstruits ici, à
// partir du document Sanity. L'endpoint ne peut donc pas servir à expédier un
// contenu arbitraire vers une adresse arbitraire — ce serait un relais ouvert
// sous l'identité de l'entreprise.
async function envoyerDevis(req, res, cors) {
  const cle = process.env.BACKOFFICE_API_CLE;
  if (!cle) return json(res, 503, { ok: false, erreur: 'envoi non configuré' }, cors);
  if (req.headers['x-hgwf-cle'] !== cle) return json(res, 401, { ok: false, erreur: 'clé invalide' }, cors);

  let corps;
  try {
    // Un devis PDF avec logo rastérisé dépasse la limite par défaut.
    corps = JSON.parse((await lireCorps(req, 3_000_000)) || '{}');
  } catch {
    return json(res, 400, { ok: false, erreur: 'JSON invalide' }, cors);
  }

  const reference = nettoyer(corps.reference, 60);
  const pdfBase64 = String(corps.pdfBase64 ?? '');
  // Mode aperçu : renvoie le message tel qu'il partirait, sans rien envoyer.
  // C'est ce qui alimente la fenêtre de relecture du back-office, sans
  // dupliquer la rédaction des deux côtés — le texte n'a qu'une seule source.
  const apercu = corps.apercu === true;
  if (!reference || (!apercu && !pdfBase64)) {
    return json(res, 422, { ok: false, erreur: 'reference et pdfBase64 sont requis' }, cors);
  }

  // Le montant ne vient que de Sanity, jamais du corps de la requête.
  // montantHT + tauxTVA pour les devis chiffrés depuis le 29/09/2026 ;
  // montantDevis (chaîne libre) reste lu pour les anciens documents.
  const d = await sanity.fetch(
    `*[_type == "demandeDevis" && reference == $ref][0]{_id, reference, clientNom, contact, email, destination, montantHT, tauxTVA, montantDevis, descriptionPrestation, delaiEstime, "ficheRef": ficheService._ref}`,
    { ref: reference },
  );
  if (!d) return json(res, 404, { ok: false, erreur: 'demande introuvable' }, cors);

  const email = adresseClient(d);
  if (!email) return json(res, 422, { ok: false, erreur: 'aucune adresse e-mail sur cette demande' }, cors);
  // Pas de test par vérité ici : 0 % est le taux le plus courant, et un
  // `!d.tauxTVA` bloquerait justement les devis export.
  if (!aUnMontant(d)) {
    const zero = calculerChiffrage(d.montantHT, d.tauxTVA)?.ht === 0;
    const erreur = zero ? 'un devis à 0 € ne peut pas partir : vérifiez le montant HT' : 'montant HT et taux de TVA requis';
    return json(res, 422, { ok: false, erreur }, cors);
  }

  // Paragraphe propre au service, tiré de la fiche choisie dans le back-office
  // (ou rattachée à la demande). Relu dans Sanity : le corps ne porte que
  // l'identifiant, jamais le texte.
  const ficheId = nettoyer(corps.ficheId, 120) || d.ficheRef || '';
  const fiche = ficheId
    ? await sanity.fetch(`*[_type == "ficheService" && _id == $id][0]{modeleMessage}`, { id: ficheId })
    : null;
  const paragrapheService = (fiche?.modeleMessage ?? '')
    .replace(/\{destination\}/g, d.destination?.trim() || 'votre destination')
    .trim();

  const prenom = (d.clientNom ?? '').trim().split(/\s+/)[0] || '';
  const lignes = [
    ...lignesMontant(d),
    d.delaiEstime ? ['Délai estimé', d.delaiEstime] : null,
  ].filter(Boolean);
  // La description complète (plusieurs lignes : compris, non compris, documents,
  // conditions) a son propre bloc : dans le récapitulatif, elle serait aplatie.
  const description = (d.descriptionPrestation ?? '').trim();

  const texteDefaut = [
    `Bonjour${prenom ? ' ' + prenom : ''},`,
    '',
    `Voici votre devis${d.destination ? ' pour ' + d.destination : ''}, référence ${d.reference}.`,
    '',
    // Une ligne par montant : un retour à la ligne dans une valeur casserait le
    // repérage du bloc, qui devient le tableau récapitulatif de la version HTML.
    ...lignes.map(([l, v]) => `  ${l} : ${String(v).replace(/\s*\n\s*/g, ' ')}`),
    '',
    ...(description ? ['Détail de la prestation :', description, ''] : []),
    ...(paragrapheService ? [paragrapheService, ''] : []),
    'Le devis détaillé est en pièce jointe.',
    '',
    "Pour l'accepter, répondez simplement « je valide » à cet e-mail. Nous ouvrons alors votre dossier et vous transmettons les prochaines dates de départ.",
    '',
    'Une question, un ajustement ? Répondez ici ou appelez-nous au 09 62 03 80 13.',
    '',
    'Bien cordialement,',
    "L'équipe HGWF Cargo",
  ].join('\n');
  // Le TTC dans l'objet : c'est la somme que le client paiera. aUnMontant(d)
  // vient d'être vérifié, montantAnnonce ne peut donc pas rendre null ici.
  const objetDefaut = `Votre devis HGWF Cargo — ${montantAnnonce(d)}`;

  // L'opérateur peut relire et retoucher avant l'envoi. Le destinataire, lui,
  // reste celui de la fiche Sanity : c'est la garantie que cet endpoint ne
  // puisse jamais expédier vers une adresse choisie par l'appelant.
  const objet = nettoyer(corps.objet, 200) || objetDefaut;
  const texte = String(corps.texte ?? '').trim().slice(0, 20_000) || texteDefaut;

  if (apercu) {
    return json(res, 200, { ok: true, destinataire: email, objet: objetDefaut, texte: texteDefaut }, cors);
  }

  // La version HTML est construite à partir du texte relu, découpé sur les
  // lignes vides. Le gabarit échappe tout : un opérateur ne peut pas injecter
  // de balises, volontairement ou par copier-coller.
  // Le bloc des montants (lignes indentées de deux espaces) devient le tableau
  // récapitulatif, à sa place dans le message. Si l'opérateur l'a retiré ou
  // réécrit, le tableau retombe en fin de message, comme avant.
  const blocs = texte.split(/\n\s*\n/).filter((b) => b.trim());
  const estRecap = (b) => b.split('\n').every((l) => /^ {2}\S/.test(l));
  const iRecap = blocs.findIndex(estRecap);
  // Les retours à la ligne d'un bloc sont gardés (listes de la description) :
  // le gabarit les rend en <br>.
  const enParagraphe = (b) => b.trim();
  const paragraphes = (iRecap === -1 ? blocs : blocs.slice(0, iRecap)).map(enParagraphe);
  const paragraphesApres = iRecap === -1 ? [] : blocs.slice(iRecap + 1).map(enParagraphe);

  const r = await envoyerEmail({
    to: email,
    subject: objet,
    text: texte,
    html: gabaritHtml({
      titre: 'Votre devis est prêt',
      paragraphes,
      lignes,
      paragraphesApres,
    }),
    replyTo: process.env.EMAIL_INTERNE || undefined,
    attachments: [{ filename: `Devis-${d.reference}.pdf`, content: pdfBase64 }],
  });

  if (!r.ok) return json(res, 502, { ok: false, erreur: r.raison }, cors);

  await sanity
    .patch(d._id)
    .set({ devisEnvoyeLe: horodatage(), devisEnvoyeA: email })
    .commit()
    .catch(() => {});

  console.log(`[devis] ${reference} envoyé à ${email}`);
  return json(res, 200, { ok: true, destinataire: email }, cors);
}

// ── Relance des devis sans réponse ────────────────────────────────────────────
// Déclenchée une fois par jour par la tâche planifiée Vercel. Trois garde-fous,
// et ils comptent plus que la fonction elle-même :
//   1. une seule relance par devis, jamais deux — `relanceEnvoyeeLe` le garantit ;
//   2. uniquement les devis encore au statut « Devis envoyé » : un client qui a
//      répondu, accepté ou refusé ne doit surtout pas être relancé ;
//   3. un délai minimum de six jours, calculé sur la date d'envoi réelle.
//
// Le texte reste procédural — une échéance qui arrive, pas une offre. C'est ce
// qui le garde du côté transactionnel plutôt que prospection, et donc licite
// sans consentement préalable.
const DELAI_RELANCE_JOURS = 6;

function joursDepuis(horo) {
  // Format posé par horodatage() : « JJ/MM/AAAA a HHhMM », ou l'ancien « JJ/MM/AAAA ».
  const m = String(horo ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

async function relancerDevis(req, res, cors) {
  // Vercel signe ses appels planifiés ; on accepte aussi la clé du back-office
  // pour pouvoir déclencher une passe à la main.
  const secret = process.env.CRON_SECRET;
  const parCron = secret && req.headers.authorization === `Bearer ${secret}`;
  const parCle = process.env.BACKOFFICE_API_CLE && req.headers['x-hgwf-cle'] === process.env.BACKOFFICE_API_CLE;
  if (!parCron && !parCle) return json(res, 401, { ok: false, erreur: 'non autorisé' }, cors);

  const candidats = await sanity.fetch(
    `*[_type == "demandeDevis" && statut == 2 && !defined(relanceEnvoyeeLe) && defined(devisEnvoyeLe)]{_id, reference, clientNom, contact, email, destination, montantHT, tauxTVA, montantDevis, devisEnvoyeLe}`,
  );

  const traites = [];
  for (const d of candidats) {
    const age = joursDepuis(d.devisEnvoyeLe);
    if (age === null || age < DELAI_RELANCE_JOURS) continue;
    const email = adresseClient(d);
    if (!email) continue;

    const prenom = (d.clientNom ?? '').trim().split(/\s+/)[0] || '';
    // Le même TTC que dans l'objet de l'envoi initial ; parenthèse omise si
    // le devis n'a jamais été chiffré (null, pas une chaîne vide).
    const montant = montantAnnonce(d);
    const paragraphes = [
      `Bonjour${prenom ? ' ' + prenom : ''},`,
      `Votre devis ${d.reference}${d.destination ? ' pour ' + d.destination : ''}${montant != null ? ' (' + montant + ')' : ''} arrive à échéance.`,
      'Souhaitez-vous que nous le prolongions, que nous l’ajustions, ou préférez-vous ne pas donner suite ? Une réponse d’un mot nous suffit.',
      'Si le projet est reporté ou abandonné, dites-le simplement : nous arrêterons là.',
    ];

    const r = await envoyerEmail({
      to: email,
      subject: `Votre devis ${d.reference} arrive à échéance`,
      text: [...paragraphes, '', 'Bien cordialement,', "L'équipe HGWF Cargo"].join('\n\n'),
      html: gabaritHtml({ titre: 'Votre devis arrive à échéance', paragraphes, lignes: [] }),
      replyTo: process.env.EMAIL_INTERNE || undefined,
    });

    // L'horodatage est posé même en cas d'échec d'envoi : sans cela, un client
    // dont l'adresse rejette nos messages serait relancé tous les jours.
    await sanity.patch(d._id).set({ relanceEnvoyeeLe: horodatage() }).commit().catch(() => {});
    traites.push({ reference: d.reference, envoye: r.ok });
  }

  console.log(`[relance] ${traites.length} devis traité(s) sur ${candidats.length} candidat(s)`);
  return json(res, 200, { ok: true, traites }, cors);
}

// ── Notification d'expédition ─────────────────────────────────────────────────
const ETAPES = ['Pris en charge', 'Au port du Havre', 'En mer', "Port d'arrivée", 'Livré'];

async function notifierExpedition(req, res, cors) {
  const cle = process.env.BACKOFFICE_API_CLE;
  if (!cle) return json(res, 503, { ok: false, erreur: 'envoi non configuré' }, cors);
  if (req.headers['x-hgwf-cle'] !== cle) return json(res, 401, { ok: false, erreur: 'clé invalide' }, cors);

  let corps;
  try {
    corps = JSON.parse((await lireCorps(req)) || '{}');
  } catch {
    return json(res, 400, { ok: false, erreur: 'JSON invalide' }, cors);
  }

  const reference = nettoyer(corps.reference, 60);
  if (!reference) return json(res, 422, { ok: false, erreur: 'reference requise' }, cors);

  const x = await sanity.fetch(
    `*[_type == "expedition" && reference == $ref][0]{_id, reference, clientNom, contact, email, trajet, etape, eta, derniereEtapeNotifiee}`,
    { ref: reference },
  );
  if (!x) return json(res, 404, { ok: false, erreur: 'expédition introuvable' }, cors);

  const email = adresseClient(x);
  if (!email) return json(res, 422, { ok: false, erreur: 'aucune adresse e-mail sur cette expédition' }, cors);

  const etape = Math.min(4, Math.max(0, x.etape ?? 0));

  // Garde-fou central : on ne prévient jamais deux fois de la même étape. Sans
  // lui, une correction de saisie ou un double clic renverrait un message au
  // client — c'est ce qui ruine la confiance dans un suivi automatique.
  if (corps.forcer !== true && x.derniereEtapeNotifiee === etape) {
    return json(res, 200, { ok: true, ignore: true, raison: 'étape déjà notifiée' }, cors);
  }

  const prenom = (x.clientNom ?? '').trim().split(/\s+/)[0] || '';
  const bonjour = `Bonjour${prenom ? ' ' + prenom : ''},`;
  const suivi = `https://hgwf-cargo.fr/fr/suivi/?ref=${encodeURIComponent(x.reference)}`;
  const eta = x.eta && x.eta !== 'À PLANIFIER' ? x.eta : 'en cours de confirmation';

  let objet;
  let paragraphes;
  if (etape === 0) {
    objet = `Votre expédition ${x.reference} est en route`;
    paragraphes = [
      bonjour,
      `Votre expédition ${x.reference}${x.trajet ? ' — ' + x.trajet : ''} est prise en charge.`,
      `Arrivée estimée : ${eta}. Vous pouvez suivre son avancement à tout moment : ${suivi}`,
    ];
  } else if (etape === 4) {
    objet = `Votre expédition ${x.reference} est livrée`;
    paragraphes = [
      bonjour,
      `Votre expédition ${x.reference} a bien été livrée.`,
      "Si quelque chose ne va pas — retard, avarie, manquant — répondez à cet e-mail ou appelez-nous au 09 62 03 80 13. Nous traiterons la réclamation.",
      'Merci de votre confiance.',
    ];
  } else {
    objet = `${x.reference} — ${ETAPES[etape]}`;
    paragraphes = [
      bonjour,
      `Votre expédition ${x.reference} est maintenant à l'étape : ${ETAPES[etape]}.`,
      `Arrivée estimée : ${eta}. Suivi détaillé : ${suivi}`,
    ];
  }

  const r = await envoyerEmail({
    to: email,
    subject: objet,
    text: [...paragraphes, '', 'Bien cordialement,', "L'équipe HGWF Cargo"].join('\n\n'),
    html: gabaritHtml({
      titre: objet,
      paragraphes,
      lignes: [
        ['Référence', x.reference],
        x.trajet ? ['Trajet', x.trajet] : null,
        ['Étape', ETAPES[etape]],
        ['Arrivée estimée', eta],
      ].filter(Boolean),
    }),
    replyTo: process.env.EMAIL_INTERNE || undefined,
  });

  if (!r.ok) return json(res, 502, { ok: false, erreur: r.raison }, cors);

  await sanity.patch(x._id).set({ derniereEtapeNotifiee: etape, derniereNotificationLe: horodatage() }).commit();
  console.log(`[expedition] ${reference} étape ${etape} notifiée à ${email}`);
  return json(res, 200, { ok: true, destinataire: email, etape: ETAPES[etape] }, cors);
}

// ── Notifications e-mail ──────────────────────────────────────────────────────
// Deux messages partent à la création d'une demande : l'accusé de réception au
// client, et l'alerte à l'équipe. Le second est le plus important : sans lui,
// personne n'est prévenu qu'une demande est arrivée — c'est ce qui a laissé
// deux demandes réelles sans réponse pendant treize jours.
async function notifierDemande({ reference, nom, email, destination, typeEnvoi, volume }) {
  if (!envoiConfigure()) {
    console.log(`[email] envoi non configuré, aucun message pour ${reference}`);
    return;
  }
  const envois = [];

  const lignes = [
    typeEnvoi ? ["Type d'envoi", typeEnvoi] : null,
    destination ? ['Destination', destination] : null,
    volume ? ['Volume estimé', volume] : null,
  ].filter(Boolean);

  // Client : accusé de réception. Rien à faire de sa part, on annonce le délai.
  if (email) {
    const prenom = (nom || '').trim().split(/\s+/)[0] || '';
    const texte = [
      `Bonjour${prenom ? ' ' + prenom : ''},`,
      '',
      `Votre demande de transport${destination ? ' vers ' + destination : ''} est bien enregistrée sous la référence ${reference}.`,
      '',
      "Un membre de l'équipe l'étudie et vous transmet votre devis sous 24 heures ouvrées.",
      '',
      ...(lignes.length ? ['Récapitulatif de votre demande :', ...lignes.map(([l, v]) => `- ${l} : ${v}`), ''] : []),
      'Si une information est inexacte, répondez simplement à cet e-mail.',
      '',
      'Bien cordialement,',
      "L'équipe HGWF Cargo",
    ].join('\n');

    envois.push(envoyerEmail({
      to: email,
      subject: `Votre demande est bien reçue — ${reference}`,
      text: texte,
      html: gabaritHtml({
        titre: 'Votre demande est bien reçue',
        paragraphes: [
          `Bonjour${prenom ? ' ' + prenom : ''},`,
          `Votre demande de transport${destination ? ' vers ' + destination : ''} est bien enregistrée sous la référence ${reference}.`,
          "Un membre de l'équipe l'étudie et vous transmet votre devis sous 24 heures ouvrées.",
          'Si une information est inexacte, répondez simplement à cet e-mail.',
        ],
        lignes,
      }),
      replyTo: process.env.EMAIL_INTERNE || undefined,
    }).then((r) => console.log(`[email] accusé ${reference} : ${r.ok ? 'envoyé' : 'échec — ' + r.raison}`)));
  }

  // Équipe : alerte interne, en texte brut. Elle doit être lisible d'un coup
  // d'œil sur un téléphone, pas jolie.
  const interne = process.env.EMAIL_INTERNE;
  if (interne) {
    envois.push(envoyerEmail({
      to: interne,
      subject: `Nouvelle demande de devis — ${reference}`,
      text: [
        `Référence : ${reference}`,
        `Client : ${nom || '?'}`,
        `Contact : ${email || 'téléphone uniquement'}`,
        ...lignes.map(([l, v]) => `${l} : ${v}`),
        '',
        'À traiter dans le back-office.',
      ].join('\n'),
      replyTo: email || undefined,
    }).then((r) => console.log(`[email] alerte interne ${reference} : ${r.ok ? 'envoyée' : 'échec — ' + r.raison}`)));
  }

  // allSettled : un envoi raté n'empêche pas l'autre d'aboutir.
  const resultats = await Promise.allSettled(envois);
  // Le premier envoi est l'accusé client (poussé en premier s'il y a un e-mail).
  const accuse = email && resultats[0];
  return accuse && accuse.status === 'fulfilled' && accuse.value?.ok === true;
}

async function chercherSuivi(req, res, cors, url) {
  const brut = nettoyer(url.searchParams.get('ref'), 60);
  if (!brut) return json(res, 422, { ok: false, erreur: 'paramètre ref requis' }, cors);
  const normalise = brut.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const expeditions = await sanity.fetch(
    `*[_type == "expedition"]{reference, trajet, etape, eta}`,
  );
  const trouvee = expeditions.find(
    (x) => (x.reference ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normalise,
  );

  if (!trouvee) return json(res, 404, { ok: false }, cors);
  // Volontairement minimal : pas de nom de client ni de détails personnels.
  return json(
    res,
    200,
    { ok: true, reference: trouvee.reference, trajet: trouvee.trajet, etape: trouvee.etape ?? 0, eta: trouvee.eta ?? '' },
    { ...cors, 'Cache-Control': 'no-store' },
  );
}

// ── Gestionnaire HTTP ─────────────────────────────────────────────────────────
// ── Suggestions Gemini pour le chiffrage (back-office) ───────────────────────
// Même garde que l'envoi du devis : clé du back-office. La demande, la fiche du
// service et les rotations sont relues dans Sanity ; le corps ne porte que des
// identifiants. Rien n'est écrit : la suggestion repart vers l'opérateur, qui
// décide. Voir src/suggestion.js pour les règles données au modèle.
async function suggererDevis(req, res, cors) {
  const cle = process.env.BACKOFFICE_API_CLE;
  if (!cle) return json(res, 503, { ok: false, erreur: 'back-office non configuré' }, cors);
  if (req.headers['x-hgwf-cle'] !== cle) return json(res, 401, { ok: false, erreur: 'clé invalide' }, cors);
  const cleGemini = process.env.GEMINI_API_KEY;
  if (!cleGemini) return json(res, 503, { ok: false, erreur: 'suggestions non configurées' }, cors);

  let corps;
  try {
    corps = JSON.parse((await lireCorps(req)) || '{}');
  } catch {
    return json(res, 400, { ok: false, erreur: 'JSON invalide' }, cors);
  }
  const reference = nettoyer(corps.reference, 60);
  const champ = nettoyer(corps.champ, 40);
  const ficheId = nettoyer(corps.ficheId, 120);
  if (!reference || !CHAMPS_SUGGESTION.includes(champ)) {
    return json(res, 422, { ok: false, erreur: 'reference et champ valides requis' }, cors);
  }

  // Ni nom, ni e-mail, ni téléphone dans la projection : rien de tout cela ne
  // doit partir chez Google.
  const demande = await sanity.fetch(
    `*[_type == "demandeDevis" && reference == $ref][0]{typeEnvoi, destination, volume, message, "ficheRef": ficheService._ref}`,
    { ref: reference },
  );
  if (!demande) return json(res, 404, { ok: false, erreur: 'demande introuvable' }, cors);
  const [fiche, rotations] = await Promise.all([
    (ficheId || demande.ficheRef) ? sanity.fetch(`*[_type == "ficheService" && _id == $id][0]`, { id: ficheId || demande.ficheRef }) : null,
    sanity.fetch(`*[_type == "rotation"] | order(_updatedAt desc)[0...6]{nom, cloture, depart}`),
  ]);

  const modele = process.env.GEMINI_ANALYSIS_MODEL || MODELE_PAR_DEFAUT;
  try {
    const brut = await demanderSuggestion({
      cle: cleGemini,
      modele,
      requete: construireRequete({ champ, demande, fiche, rotations }),
    });
    return json(res, 200, { ok: true, champ, suggestion: validerSuggestion(champ, brut), fiche: fiche?.titre ?? null }, cors);
  } catch (err) {
    // Statut seulement : ni la demande ni la réponse du modèle dans les journaux.
    console.error('suggestion-devis', champ, err?.statut ?? err?.name ?? 'erreur');
    const indisponible = err?.statut === 429 || err?.statut >= 500 || err?.name === 'TimeoutError';
    return json(res, 502, { ok: false, erreur: indisponible ? 'service de suggestion indisponible, réessayez dans un instant' : 'suggestion impossible' }, cors);
  }
}

export async function handler(req, res) {
  const cors = corsHeaders(req);
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const ip =
    (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || '?';

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    if (tropDeRequetes(ip)) return json(res, 429, { ok: false, erreur: 'trop de requêtes' }, cors);

    if (req.method === 'POST' && url.pathname === '/api/demande-devis') {
      return await creerDemande(req, res, cors);
    }
    if (url.pathname === '/api/relances' && (req.method === 'POST' || req.method === 'GET')) {
      return await relancerDevis(req, res, cors);
    }
    if (req.method === 'POST' && url.pathname === '/api/envoi-expedition') {
      return await notifierExpedition(req, res, cors);
    }
    if (req.method === 'POST' && url.pathname === '/api/envoi-devis') {
      return await envoyerDevis(req, res, cors);
    }
    if (req.method === 'POST' && url.pathname === '/api/suggestion-devis') {
      return await suggererDevis(req, res, cors);
    }
    if (req.method === 'GET' && url.pathname === '/api/suivi') {
      return await chercherSuivi(req, res, cors, url);
    }
    if (req.method === 'GET' && url.pathname === '/api/sante') {
      return json(res, 200, { ok: true }, cors);
    }
    return json(res, 404, { ok: false, erreur: 'route inconnue' }, cors);
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, erreur: 'erreur interne' }, cors);
  }
}
