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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(res, status, corps, extra = {}) {
  const data = JSON.stringify(corps);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extra });
  res.end(data);
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 50_000) {
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
  return json(res, 201, { ok: true, reference }, cors);
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
