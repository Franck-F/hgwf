/**
 * API HGWF Cargo : pont entre le site statique et le dataset privé « operations ».
 *
 *   POST /api/demande-devis  → crée un document demandeDevis (formulaires publics)
 *   GET  /api/suivi?ref=XXX  → statut d'une expédition (trajet, étape, ETA, jamais le client)
 *   GET  /api/sante          → vérification de vie
 *
 * Ce module exporte le gestionnaire HTTP pur (req, res) : `src/server.js`
 * l'enveloppe dans un serveur Node pour le dev local, `api/index.js` l'expose
 * en fonction serverless sur Vercel.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { envoiConfigure, envoyerEmail, gabaritHtml } from './email.js';

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
    'Access-Control-Allow-Headers': 'Content-Type, x-hgwf-cle',
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

  await sanity.create({
    _type: 'demandeDevis',
    reference,
    clientNom: nom,
    contact,
    typeEnvoi: nettoyer(corps.typeEnvoi, 80) || 'Demande via le site',
    destination: nettoyer(corps.destination, 80),
    volume: nettoyer(corps.volume, 40),
    recueLe,
    statut: 0,
    message: details,
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
  await notifierDemande({ reference, nom, email, destination: nettoyer(corps.destination, 80), typeEnvoi: nettoyer(corps.typeEnvoi, 80), volume: nettoyer(corps.volume, 40) });

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

  const d = await sanity.fetch(
    `*[_type == "demandeDevis" && reference == $ref][0]{reference, clientNom, contact, destination, montantDevis, descriptionPrestation, delaiEstime}`,
    { ref: reference },
  );
  if (!d) return json(res, 404, { ok: false, erreur: 'demande introuvable' }, cors);

  const email = (d.contact ?? '').match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  if (!email) return json(res, 422, { ok: false, erreur: 'aucune adresse e-mail sur cette demande' }, cors);
  if (!d.montantDevis) return json(res, 422, { ok: false, erreur: 'montant du devis absent' }, cors);

  const prenom = (d.clientNom ?? '').trim().split(/\s+/)[0] || '';
  const lignes = [
    ['Montant', d.montantDevis],
    d.descriptionPrestation ? ['Prestation', d.descriptionPrestation] : null,
    d.delaiEstime ? ['Délai estimé', d.delaiEstime] : null,
  ].filter(Boolean);

  const texteDefaut = [
    `Bonjour${prenom ? ' ' + prenom : ''},`,
    '',
    `Voici votre devis${d.destination ? ' pour ' + d.destination : ''}, référence ${d.reference}.`,
    '',
    ...lignes.map(([l, v]) => `  ${l} : ${v}`),
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
  const objetDefaut = `Votre devis HGWF Cargo — ${d.montantDevis}`;

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
  const paragraphes = texte
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean);

  const r = await envoyerEmail({
    to: email,
    subject: objet,
    text: texte,
    html: gabaritHtml({
      titre: 'Votre devis est prêt',
      paragraphes,
      lignes,
    }),
    replyTo: process.env.EMAIL_INTERNE || undefined,
    attachments: [{ filename: `Devis-${d.reference}.pdf`, content: pdfBase64 }],
  });

  if (!r.ok) return json(res, 502, { ok: false, erreur: r.raison }, cors);

  console.log(`[devis] ${reference} envoyé à ${email}`);
  return json(res, 200, { ok: true, destinataire: email }, cors);
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
  await Promise.allSettled(envois);
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
    if (req.method === 'POST' && url.pathname === '/api/envoi-devis') {
      return await envoyerDevis(req, res, cors);
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
