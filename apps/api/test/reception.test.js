// Réception des réponses clients : signature Svix, référence, idempotence,
// cas sans dossier, lecture Resend refusée. Aucun réseau : fetch, client Sanity
// et envoi d'e-mail sont factices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import {
  FIN_ADRESSES_SANS_JETON,
  analyserAdresseDossier,
  jetonReponse,
  adresseDe,
  adresseReponse,
  contenuConforme,
  extraireReference,
  horodatageParis,
  pieceBloquee,
  relireEchange,
  traiterReception,
  verdictAuthentification,
  verifierExpediteur,
  verifierSignature,
} from '../src/reception.js';

const SECRET_BRUT = Buffer.from('cle-de-test-0123456789abcdef');
const SECRET = `whsec_${SECRET_BRUT.toString('base64')}`;
const MAINTENANT = Date.UTC(2026, 10, 8, 10, 0, 0);

function signer(corps, { id = 'msg_1', ts = Math.floor(MAINTENANT / 1000) } = {}) {
  const sig = createHmac('sha256', SECRET_BRUT).update(`${id}.${ts}.${corps}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` };
}

const webhook = (data = {}) =>
  Buffer.from(
    JSON.stringify({
      type: 'email.received',
      data: { email_id: 'abc-123', from: 'Marie <marie@client.fr>', to: ['dossier-hgwf-2026-1234@reponses.hgwf-cargo.fr'], subject: 'Re: Votre devis', created_at: '2026-11-08T09:59:00Z', ...data },
    }),
  );

// ── Faux Sanity ───────────────────────────────────────────────────────────────
function fauxSanity({ demande = { _id: 'dem-1', _createdAt: '2026-11-01T10:00:00Z', reference: 'HGWF-2026-1234', email: 'Marie@Client.fr' }, existant = null } = {}) {
  const s = { crees: [], patchs: [], uploads: [] };
  s.fetch = async (q) => (q.includes('_id == $id') ? existant : q.includes('demandeDevis') ? demande : null);
  s.createIfNotExists = async (doc) => { s.crees.push(doc); return doc; };
  s.patch = (id) => ({ set: (champs) => ({ commit: async () => { s.patchs.push({ id, champs }); } }) });
  s.assets = { upload: async (type, contenu, opts) => { s.uploads.push({ type, taille: contenu.length, ...opts }); return { _id: 'file-xyz' }; } };
  return s;
}

// ── Faux Resend ───────────────────────────────────────────────────────────────
// En-tête ajouté par le serveur de réception pour un message authentique de client.fr.
const SERVEUR = 'mx.resend.test';
const AUTH_OK = { 'authentication-results': `${SERVEUR}; spf=pass smtp.mailfrom=client.fr; dkim=pass header.d=client.fr; dmarc=pass header.from=client.fr` };
// Contenus de test dont la signature correspond à l'extension.
const CONTENUS = { jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), pdf: Buffer.from('%PDF-1.7') };
const tampon = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.length);

// Petit ZIP (méthode deflate) pour tester le contrôle des documents Office.
function zip(fichiers) {
  const locaux = [];
  const centraux = [];
  let decalage = 0;
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const n = Buffer.from(nom);
    const donnees = deflateRawSync(Buffer.from(contenu));
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(donnees.length, 18); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(donnees.length, 20); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(decalage, 42);
    locaux.push(l, n, donnees);
    centraux.push(c, n);
    decalage += 30 + n.length + donnees.length;
  }
  const cd = Buffer.concat(centraux);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(fichiers).length, 8); e.writeUInt16LE(Object.keys(fichiers).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(decalage, 16);
  return Buffer.concat([...locaux, cd, e]);
}

function fauxFetch({ statutLecture = 200, pieces = [], from = 'Marie <marie@client.fr>', headers = AUTH_OK } = {}) {
  const appels = [];
  const f = async (url) => {
    appels.push(String(url));
    if (url.includes('/attachments')) return { ok: true, status: 200, json: async () => ({ data: pieces.map((p) => ({ ...p, download_url: 'https://dl/' + p.filename })) }) };
    if (url.startsWith('https://dl/')) return { ok: true, status: 200, arrayBuffer: async () => tampon(CONTENUS[url.split('.').pop()] ?? Buffer.from('contenu')) };
    if (statutLecture !== 200) return { ok: false, status: statutLecture, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ text: 'Je valide.', to: ['dossier-hgwf-2026-1234@reponses.hgwf-cargo.fr'], from, subject: 'Re: Votre devis', headers, attachments: pieces.map((p) => ({ id: p.id, filename: p.filename })) }) };
  };
  f.appels = appels;
  return f;
}

function fauxEnvoi(ok = true) {
  const envoyes = [];
  const f = async (m) => { envoyes.push(m); return ok ? { ok: true } : { ok: false, raison: 'HTTP 500' }; };
  f.envoyes = envoyes;
  return f;
}

const ENV = { RESEND_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: 're_test', EMAIL_INTERNE: 'contact@hgwf-cargo.fr', RECEPTION_AUTHSERV_ID: `autre.test, ${SERVEUR}` };

function lancer({ corps = webhook(), entetes, sanity = fauxSanity(), fetchImpl = fauxFetch(), envoyer = fauxEnvoi(), env = ENV } = {}) {
  return traiterReception({ corps, entetes: entetes ?? signer(corps.toString()), sanity, env, fetchImpl, envoyer, maintenant: () => MAINTENANT });
}

// ── Signature ─────────────────────────────────────────────────────────────────
test('signature valide acceptée, y compris parmi plusieurs signatures', () => {
  const corps = Buffer.from('{"a":1}');
  const e = signer('{"a":1}');
  assert.equal(verifierSignature({ corps, entetes: e, secret: SECRET, maintenant: MAINTENANT }), true);
  const multi = { ...e, 'svix-signature': `v1,AAAA ${e['svix-signature']}` };
  assert.equal(verifierSignature({ corps, entetes: multi, secret: SECRET, maintenant: MAINTENANT }), true);
});

test('signature invalide, corps modifié ou secret absent : refusée', () => {
  const e = signer('{"a":1}');
  assert.equal(verifierSignature({ corps: Buffer.from('{"a":2}'), entetes: e, secret: SECRET, maintenant: MAINTENANT }), false);
  assert.equal(verifierSignature({ corps: Buffer.from('{"a":1}'), entetes: { ...e, 'svix-signature': 'v1,xx' }, secret: SECRET, maintenant: MAINTENANT }), false);
  assert.equal(verifierSignature({ corps: Buffer.from('{"a":1}'), entetes: e, secret: '', maintenant: MAINTENANT }), false);
  assert.equal(verifierSignature({ corps: Buffer.from('{"a":1}'), entetes: {}, secret: SECRET, maintenant: MAINTENANT }), false);
});

test('signature périmée (plus de 5 min) ou dans le futur : refusée', () => {
  const corps = Buffer.from('{"a":1}');
  const vieux = signer('{"a":1}', { ts: Math.floor(MAINTENANT / 1000) - 400 });
  assert.equal(verifierSignature({ corps, entetes: vieux, secret: SECRET, maintenant: MAINTENANT }), false);
  const futur = signer('{"a":1}', { ts: Math.floor(MAINTENANT / 1000) + 400 });
  assert.equal(verifierSignature({ corps, entetes: futur, secret: SECRET, maintenant: MAINTENANT }), false);
  const ok = signer('{"a":1}', { ts: Math.floor(MAINTENANT / 1000) - 200 });
  assert.equal(verifierSignature({ corps, entetes: ok, secret: SECRET, maintenant: MAINTENANT }), true);
});

test('appel non signé : 401 et rien n\'est écrit ni envoyé', async () => {
  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const r = await lancer({ entetes: { 'svix-id': 'x' }, sanity, envoyer });
  assert.equal(r.status, 401);
  assert.equal(sanity.crees.length + sanity.patchs.length + envoyer.envoyes.length, 0);
});

// ── Référence ─────────────────────────────────────────────────────────────────
test('extraction de la référence : casse, nom affiché, domaine, cc', () => {
  assert.equal(extraireReference(['dossier-hgwf-2026-1234@reponses.hgwf-cargo.fr']), 'HGWF-2026-1234');
  assert.equal(extraireReference(['x@y.fr', 'HGWF <Dossier-HGWF-2026-77@Reponses.hgwf-cargo.fr>']), 'HGWF-2026-77');
  assert.equal(extraireReference(['dossier-HGWF-2026-1234@autre.fr']), null);
  assert.equal(extraireReference(['contact@hgwf-cargo.fr']), null);
  assert.equal(extraireReference(['dossier-dev-2611-001@reponses.hgwf-cargo.fr']), 'DEV-2611-001');
  assert.equal(extraireReference(['Marie <dossier-dev-2611-001@reponses.hgwf-cargo.fr>']), 'DEV-2611-001');
  assert.equal(extraireReference(['dossier-HGWF-2026-5@exemple.test'], 'exemple.test'), 'HGWF-2026-5');
});

test('adresse de réponse : dossier, domaine configurable, ancien comportement', () => {
  assert.equal(adresseReponse('HGWF-2026-1234', { EMAIL_INTERNE: 'c@h.fr' }), 'dossier-hgwf-2026-1234@reponses.hgwf-cargo.fr');
  assert.equal(adresseReponse('HGWF-2026-1234', { REPONSES_DOMAINE: 'r.test' }), 'dossier-hgwf-2026-1234@r.test');
  assert.equal(adresseReponse('HGWF-2026-1234', { REPONSES_DOMAINE: '', EMAIL_INTERNE: 'c@h.fr' }), 'c@h.fr');
  assert.equal(adresseReponse(null, { EMAIL_INTERNE: 'c@h.fr' }), 'c@h.fr');
});

test('adresse de réponse signée : jeton lu, vérifié, et référence intacte', () => {
  const env = { RESEND_WEBHOOK_SECRET: SECRET };
  const jeton = jetonReponse('HGWF-2026-1234', env);
  assert.match(jeton, /^[0-9a-f]{10}$/);
  const adresse = adresseReponse('HGWF-2026-1234', env);
  assert.equal(adresse, `dossier-hgwf-2026-1234-${jeton}@reponses.hgwf-cargo.fr`);
  assert.deepEqual(analyserAdresseDossier([`Client <${adresse}>`], undefined, env), { reference: 'HGWF-2026-1234', jeton: 'valide' });
  // Jeton d'un autre dossier recollé sur une référence : refusé.
  const autre = jetonReponse('HGWF-2026-9999', env);
  assert.equal(analyserAdresseDossier([`dossier-hgwf-2026-1234-${autre}@reponses.hgwf-cargo.fr`], undefined, env).jeton, 'invalide');
  // Ancienne adresse sans jeton, y compris une référence saisie à la main.
  assert.deepEqual(analyserAdresseDossier(['dossier-dev-2611-001@reponses.hgwf-cargo.fr'], undefined, env), { reference: 'DEV-2611-001', jeton: 'absent' });
  assert.equal(extraireReference([adresse], undefined, env), 'HGWF-2026-1234');
});

test('réponse à une adresse signée : vérifiée sans en-tête d’authentification, pièces gardées', async () => {
  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const adresse = adresseReponse('HGWF-2026-1234', ENV);
  const fetchImpl = fauxFetch({ headers: {}, pieces: [{ id: 'p1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 7 }] });
  const corps = webhook({ to: [adresse] });
  const t = FIN_ADRESSES_SANS_JETON + 86_400_000;
  const r = await traiterReception({ corps, entetes: signer(corps.toString(), { ts: Math.floor(t / 1000) }), sanity, env: ENV, fetchImpl, envoyer, maintenant: () => t });
  assert.equal(r.status, 200);
  assert.equal(r.corps.verifie, true);
  assert.equal(sanity.crees[0].expediteurVerifie, true);
  assert.equal(sanity.uploads.length, 1);
});

test('horodatage au format du back-office, en heure de Paris', () => {
  assert.equal(horodatageParis(new Date(Date.UTC(2026, 10, 8, 10, 5))), '08/11/2026 à 11h05');
  assert.equal(horodatageParis(new Date(Date.UTC(2026, 6, 8, 10, 5))), '08/07/2026 à 12h05');
});

// ── Traitement ────────────────────────────────────────────────────────────────
test('réponse d\'un client : échange créé, demande remontée, copie à l\'équipe', async () => {
  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const r = await lancer({ sanity, envoyer, fetchImpl: fauxFetch({ pieces: [{ id: 'p1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 7 }] }) });
  assert.equal(r.status, 200);

  const [echange] = sanity.crees;
  assert.equal(echange._id, 'echange-abc-123');
  assert.equal(echange._type, 'echange');
  assert.equal(echange.reference, 'HGWF-2026-1234');
  assert.equal(echange.sens, 'recu');
  assert.equal(echange.lu, false);
  assert.equal(echange.texte, 'Je valide.');
  assert.deepEqual(echange.demande, { _type: 'reference', _weak: true, _ref: 'dem-1' });
  assert.equal(echange.pieces[0].fichier.asset._ref, 'file-xyz');
  assert.equal(echange.pieces[0].nom, 'photo.jpg');
  assert.equal(sanity.uploads.length, 1);

  const patchDemande = sanity.patchs.find((p) => p.id === 'dem-1');
  assert.deepEqual(Object.keys(patchDemande.champs), ['reponseClientLe']);
  assert.equal(patchDemande.champs.reponseClientLe, '08/11/2026 à 11h00');
  assert.ok(sanity.patchs.find((p) => p.id === 'echange-abc-123')?.champs.transfereLe);

  const [copie] = envoyer.envoyes;
  assert.equal(copie.to, 'contact@hgwf-cargo.fr');
  assert.equal(copie.subject, '[Réponse client HGWF-2026-1234] Re: Votre devis');
  assert.equal(copie.replyTo, 'marie@client.fr');
  assert.equal(copie.attachments.length, 1);
});

test('idempotence : un rejeu déjà transféré ne recrée ni ne renvoie rien', async () => {
  const sanity = fauxSanity({ existant: { _id: 'echange-abc-123', transfereLe: '2026-11-08T10:00:00Z' } });
  const envoyer = fauxEnvoi();
  const r = await lancer({ sanity, envoyer });
  assert.equal(r.status, 200);
  assert.equal(r.corps.doublon, true);
  assert.equal(sanity.crees.length + sanity.patchs.length + envoyer.envoyes.length, 0);
});

test('rejeu après copie échouée : pas de second échange, copie renvoyée', async () => {
  const sanity = fauxSanity({ existant: { _id: 'echange-abc-123' } });
  const envoyer = fauxEnvoi();
  const r = await lancer({ sanity, envoyer });
  assert.equal(r.status, 200);
  assert.equal(sanity.crees.length, 0);
  assert.equal(envoyer.envoyes.length, 1);
});

test('copie à l\'équipe impossible : 502 pour que Resend rejoue', async () => {
  const r = await lancer({ envoyer: fauxEnvoi(false) });
  assert.equal(r.status, 502);
});

test('adresse sans référence : copie texte seule, avertie, sans pièces jointes', async () => {
  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const corps = webhook({ to: ['contact@reponses.hgwf-cargo.fr'] });
  const appels = [];
  const fetchImpl = async (url) => {
    appels.push(String(url));
    return { ok: true, status: 200, json: async () => ({ text: 'Bonjour', to: ['contact@reponses.hgwf-cargo.fr'], from: 'z@y.fr', subject: 'Question', attachments: [{ id: 'p1', filename: 'facture.pdf' }] }) };
  };
  const r = await lancer({ corps, sanity, envoyer, fetchImpl });
  assert.equal(r.status, 200);
  assert.equal(sanity.crees.length + sanity.patchs.length + sanity.uploads.length, 0);
  assert.equal(appels.some((u) => u.includes('/attachments')), false);
  const [copie] = envoyer.envoyes;
  assert.equal(copie.subject, '[Message externe non vérifié] Question');
  assert.match(copie.text, /^ATTENTION/);
  assert.match(copie.text, /facture\.pdf/);
  assert.deepEqual(copie.attachments, []);
  assert.equal(copie.replyTo, 'z@y.fr');
});

test('référence inconnue du back-office : rien d\'enregistré, copie avertie', async () => {
  const sanity = fauxSanity({ demande: null });
  const envoyer = fauxEnvoi();
  const r = await lancer({ sanity, envoyer });
  assert.equal(r.status, 200);
  assert.equal(sanity.crees.length + sanity.patchs.length, 0);
  assert.equal(envoyer.envoyes[0].subject, '[Message externe non vérifié] Re: Votre devis');
  assert.match(envoyer.envoyes[0].text, /référence HGWF-2026-1234 inconnue/);
});

test('expéditeur différent de l\'adresse du dossier : rangé « à vérifier », sans pièces ni remontée', async () => {
  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const fetchImpl = fauxFetch({ from: 'Pirate <pirate@exemple.net>', pieces: [{ id: 'p1', filename: 'facture.pdf', content_type: 'application/pdf', size: 7 }] });
  const r = await lancer({ sanity, envoyer, fetchImpl, corps: webhook({ from: 'pirate@exemple.net' }) });
  assert.equal(r.status, 200);
  assert.equal(r.corps.verifie, false);
  assert.equal(fetchImpl.appels.some((u) => u.includes('/attachments')), false);
  assert.equal(sanity.uploads.length, 0);
  const [echange] = sanity.crees;
  assert.equal(echange.expediteurVerifie, false);
  assert.match(echange.motifNonVerifie, /pirate@exemple\.net n’est pas l’adresse e-mail enregistrée/);
  assert.deepEqual(echange.pieces, []);
  assert.match(echange.erreur, /expéditeur non vérifié \(facture\.pdf\)/);
  assert.equal(sanity.patchs.some((p) => p.id === 'dem-1'), false);
  const [copie] = envoyer.envoyes;
  assert.equal(copie.subject, '[À vérifier HGWF-2026-1234] Re: Votre devis');
  assert.match(copie.text, /^ATTENTION – expéditeur à vérifier/);
  assert.deepEqual(copie.attachments, []);
});

test('bonne adresse mais DMARC en échec : traité comme usurpé', async () => {
  const sanity = fauxSanity();
  const headers = { 'Authentication-Results': 'mx.resend; spf=fail smtp.mailfrom=client.fr; dkim=none; dmarc=fail header.from=client.fr' };
  const r = await lancer({ sanity, fetchImpl: fauxFetch({ headers }) });
  assert.equal(r.status, 200);
  assert.equal(sanity.crees[0].expediteurVerifie, false);
  assert.match(sanity.crees[0].motifNonVerifie, /SPF\/DKIM\/DMARC/);
  assert.equal(sanity.patchs.some((p) => p.id === 'dem-1'), false);
});

test('adresse du From : guillemets, commentaires et adresses multiples', () => {
  assert.equal(adresseDe('Marie <marie@client.fr>'), 'marie@client.fr');
  assert.equal(adresseDe('marie@client.fr'), 'marie@client.fr');
  assert.equal(adresseDe('"Dupont, Marie" <marie@client.fr>'), 'marie@client.fr');
  // L'adresse de la demande cachée dans le nom affiché ne trompe pas la vérification.
  assert.equal(adresseDe('"<marie@client.fr>" <pirate@x.net>'), 'pirate@x.net');
  assert.equal(adresseDe('(marie@client.fr) pirate@x.net'), 'pirate@x.net');
  assert.equal(adresseDe('marie@client.fr <pirate@x.net>'), 'pirate@x.net');
  assert.equal(adresseDe('a@b.fr, c@d.fr'), '');
  assert.equal(adresseDe('<a@b.fr> <c@d.fr>'), '');
  assert.equal(adresseDe('"ouvert <marie@client.fr>'), '');
  assert.equal(adresseDe(''), '');
});

test('vérification de l\'expéditeur : adresse de la demande ET authentification positive', () => {
  const demande = { _id: 'd', _createdAt: '2026-11-01T10:00:00Z', email: ' Marie@Client.FR ' };
  const s = [SERVEUR];
  const apres = FIN_ADRESSES_SANS_JETON + 1;
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, entetes: AUTH_OK, serveursFiables: s, maintenant: apres }).fiable, true);
  const sansPreuve = verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, serveursFiables: s, maintenant: apres });
  assert.equal(sansPreuve.fiable, false);
  assert.match(sansPreuve.motif, /ancienne adresse de dossier/);
  // Aucun serveur de réception déclaré et pas de jeton : non vérifié (après la transition).
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, entetes: AUTH_OK, maintenant: apres }).fiable, false);
  // Jeton valide : vérifié sans en-tête d'authentification ; jeton faux : refusé.
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, jeton: 'valide', maintenant: apres }).fiable, true);
  assert.match(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, jeton: 'invalide' }).motif, /jeton incorrect/);
  // Transition : ancienne adresse acceptée sur la seule adresse de l'expéditeur.
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande, maintenant: FIN_ADRESSES_SANS_JETON - 1 }).fiable, true);
  // Tolérance réservée aux demandes créées avant le jeton (et date illisible : aucune tolérance).
  const recente = { ...demande, _createdAt: '2026-11-20T10:00:00Z' };
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande: recente, maintenant: FIN_ADRESSES_SANS_JETON - 1 }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande: { ...demande, _createdAt: undefined }, maintenant: FIN_ADRESSES_SANS_JETON - 1 }).fiable, false);
  // Le jeton ne couvre jamais un autre expéditeur.
  assert.equal(verifierExpediteur({ de: 'pirate@x.net', demande, jeton: 'valide' }).fiable, false);
  assert.equal(verifierExpediteur({ de: '"<marie@client.fr>" <pirate@x.net>', demande, entetes: AUTH_OK, serveursFiables: s }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr.pirate.net', demande, entetes: AUTH_OK, serveursFiables: s }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr', demande: { _id: 'd' }, entetes: AUTH_OK, serveursFiables: s }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr', demande: null, entetes: AUTH_OK, serveursFiables: s }).fiable, false);
});

test('verdict d\'authentification : échec n\'importe où, succès seulement du serveur déclaré, en tête, domaine exact', () => {
  const ar = (...valeurs) => valeurs.map((value) => ({ name: 'Authentication-Results', value }));
  const s = ['mx'];
  assert.equal(verdictAuthentification(ar('mx; dmarc=pass header.from=client.fr'), 'client.fr', s), 'ok');
  assert.equal(verdictAuthentification(ar('mx 1; dkim=pass header.d=client.fr'), 'client.fr', s), 'ok');
  // Un « pass » d'un serveur non déclaré (forgé par l'expéditeur) ne compte pas.
  assert.equal(verdictAuthentification(ar('pirate.net; dmarc=pass header.from=client.fr'), 'client.fr', s), 'inconnu');
  assert.equal(verdictAuthentification(ar('mx; dmarc=pass header.from=client.fr'), 'client.fr', []), 'inconnu');
  // Alignement strict : ni domaine parent, ni sous-domaine, ni autre domaine.
  assert.equal(verdictAuthentification(ar('mx; dkim=pass header.d=fr'), 'client.fr', s), 'inconnu');
  assert.equal(verdictAuthentification(ar('mx; dkim=pass header.d=mail.client.fr'), 'client.fr', s), 'inconnu');
  assert.equal(verdictAuthentification(ar('mx; dkim=pass header.d=pirate.net'), 'client.fr', s), 'inconnu');
  assert.equal(verdictAuthentification(ar('mx; spf=fail; dkim=pass'), 'client.fr', s), 'inconnu');
  assert.equal(verdictAuthentification(ar('mx; spf=fail; dkim=fail'), 'client.fr', s), 'echec');
  // Faux « pass » glissé plus bas par l'expéditeur : ignoré.
  assert.equal(verdictAuthentification(ar('mx; dmarc=none', 'mx; dmarc=pass header.from=client.fr'), 'client.fr', s), 'inconnu');
  // Faux « pass » ne masque pas le « fail » du serveur.
  assert.equal(verdictAuthentification({ 'authentication-results': ['mx; dmarc=fail', 'mx; dmarc=pass header.from=client.fr'] }, 'client.fr', s), 'echec');
  assert.equal(verdictAuthentification(undefined, 'client.fr', s), 'inconnu');
});

test('liste blanche des pièces jointes et contrôle du contenu', () => {
  for (const nom of ['facture.exe', 'facture.EXE. ', 'tarifs.xlsm', 'archive.zip', 'ancien.doc', 'ancien.xls', 'notes.one', 'aide.chm', 'page.html', 'logo.svg', 'sansextension']) {
    assert.equal(pieceBloquee(nom), true, nom);
  }
  assert.equal(pieceBloquee('page.pdf', 'text/html'), true);
  assert.equal(pieceBloquee('liste.xlsx', 'application/vnd.ms-excel.sheet.macroEnabled.12'), true);
  for (const nom of ['devis.pdf', 'photo.JPG', 'colis.heic', 'liste.xlsx', 'contrat.docx', 'inventaire.csv']) {
    assert.equal(pieceBloquee(nom), false, nom);
  }
  assert.equal(contenuConforme('devis.pdf', Buffer.from('%PDF-1.7')), true);
  assert.equal(contenuConforme('devis.pdf', Buffer.from('MZ\x90\x00')), false);
  assert.equal(contenuConforme('photo.jpg', CONTENUS.jpg), true);
  const types = '<?xml version="1.0"?><Types/>';
  assert.equal(contenuConforme('liste.xlsx', zip({ '[Content_Types].xml': types, 'xl/workbook.xml': '<w/>', 'xl/printerSettings/printerSettings1.bin': 'x' })), true);
  assert.equal(contenuConforme('liste.xlsx', zip({ '[Content_Types].xml': types, 'xl/vbaProject.bin': 'x' })), false);
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/embeddings/oleObject1.bin': 'x' })), false);
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/activeX/activeX1.xml': '<a/>' })), false);
  const modeleDistant = '<Relationships><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="https://pirate.net/m.dotm" TargetMode="External"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/settings.xml.rels': modeleDistant })), false);
  const lien = '<Relationships><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://hgwf-cargo.fr" TargetMode="External"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/document.xml.rels': lien })), true);
  assert.equal(contenuConforme('doc.docx', zip({ 'word/document.xml': '<d/>' })), false);
  // Entité, préfixe d'espace de noms, « > » dans une valeur : toujours détectés.
  const ruse = '<Relationships><r:Relationship Target="a>b" Id="r1" TargetMode="&#69;xternal" Type="http://x/relationships/image"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/document.xml.rels': ruse })), false);
  const oleInterne = '<Relationships><Relationship Id="r1" Type="http://x/relationships/oleObject" Target="embeddings/objet.dat"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/document.xml.rels': oleInterne })), false);
  const typesMacro = '<Types><Override PartName="/word/x.dat" ContentType="application/vnd.ms-office.vbaProject"/></Types>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': typesMacro })), false);
  // Attribut préfixé qui se ferait passer pour un lien hypertexte : refus.
  const prefixe = '<Relationships><Relationship Id="r1" Type="http://x/relationships/attachedTemplate" x:Type="http://x/relationships/hyperlink" Target="https://p.net/m" TargetMode="External"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/settings.xml.rels': prefixe })), false);
  const double = '<Relationships><Relationship Id="r1" Type="http://x/relationships/hyperlink" Type="http://x/relationships/attachedTemplate" Target="h" TargetMode="External"/></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/settings.xml.rels': double })), false);
  const commentaire = '<Relationships><!-- <x a="--><Relationship Id="r1" Type="http://x/relationships/attachedTemplate" Target="h" TargetMode="External"/>" --></Relationships>';
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, 'word/_rels/settings.xml.rels': commentaire })), false);
  // Deux [Content_Types].xml (casse différente) : refus.
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, '[content_types].XML': typesMacro })), false);
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('<Relationships/>', 'utf16le')]);
  assert.equal(contenuConforme('doc.docx', zip({ '[Content_Types].xml': types, '_rels/.rels': utf16 })), false);
  assert.equal(contenuConforme('doc.docx', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('pas un zip')])), false);
  assert.equal(pieceBloquee('tableur.ods'), true);
  assert.equal(contenuConforme('notes.txt', Buffer.from('a\0b')), false);
  assert.equal(contenuConforme('vide.pdf', Buffer.alloc(0)), false);
});

test('pièces dangereuses écartées, les autres conservées', async () => {

  const sanity = fauxSanity();
  const envoyer = fauxEnvoi();
  const pieces = [
    { id: 'p1', filename: 'devis.pdf', content_type: 'application/pdf', size: 7 },
    { id: 'p2', filename: 'outil.exe', content_type: 'application/octet-stream', size: 7 },
  ];
  const r = await lancer({ sanity, envoyer, fetchImpl: fauxFetch({ pieces }) });
  assert.equal(r.status, 200);
  assert.deepEqual(sanity.crees[0].pieces.map((p) => p.nom), ['devis.pdf']);
  assert.match(sanity.crees[0].erreur, /outil\.exe \(type de fichier bloqué par sécurité\)/);
  assert.deepEqual(envoyer.envoyes[0].attachments.map((p) => p.filename), ['devis.pdf']);
});

test('Resend refuse la lecture (clé d\'envoi seul) : échange enregistré avec erreur, avis à l\'équipe', async () => {
  for (const statut of [401, 403]) {
    const sanity = fauxSanity();
    const envoyer = fauxEnvoi();
    const r = await lancer({ sanity, envoyer, fetchImpl: fauxFetch({ statutLecture: statut }) });
    assert.equal(r.status, 200);
    const [echange] = sanity.crees;
    assert.match(echange.erreur, new RegExp(`Resend ${statut}`));
    assert.equal(echange.de, 'Marie <marie@client.fr>');
    assert.equal(echange.objet, 'Re: Votre devis');
    // Ancienne adresse (sans jeton) pendant la transition : l'adresse de l'expéditeur suffit.
    assert.equal(echange.expediteurVerifie, true);
    assert.ok(sanity.patchs.some((p) => p.id === 'dem-1'));
    assert.match(envoyer.envoyes[0].text, /n'a pas pu être lu/);
    assert.equal(envoyer.envoyes[0].replyTo, 'marie@client.fr');
  }
});

test('panne passagère de Resend (500) : 503 pour rejeu, rien d\'écrit', async () => {
  const sanity = fauxSanity();
  const r = await lancer({ sanity, fetchImpl: fauxFetch({ statutLecture: 500 }) });
  assert.equal(r.status, 503);
  assert.equal(sanity.crees.length, 0);
});

test('autre type d\'événement : 200 ignoré', async () => {
  const corps = Buffer.from(JSON.stringify({ type: 'email.sent', data: {} }));
  const r = await lancer({ corps });
  assert.equal(r.status, 200);
  assert.equal(r.corps.ignore, true);
});

test('pièce trop volumineuse : omise et signalée', async () => {
  const sanity = fauxSanity();
  const r = await lancer({ sanity, fetchImpl: fauxFetch({ pieces: [{ id: 'p1', filename: 'gros.pdf', content_type: 'application/pdf', size: 50_000_000 }] }) });
  assert.equal(r.status, 200);
  assert.equal(sanity.uploads.length, 0);
  assert.match(sanity.crees[0].erreur, /gros\.pdf \(trop volumineuse\)/);
});

// ── Relecture d'un message rangé sans contenu ────────────────────────────────
const ID_RESEND = '0b8e2f4c-1a2b-4c3d-8e9f-001122334455';

function sanityRelecture({ echange = { _id: `echange-${ID_RESEND}`, reference: 'HGWF-2026-1234', nbPieces: 0 } } = {}) {
  const s = fauxSanity();
  const demande = { _id: 'dem-1', _createdAt: '2026-11-01T10:00:00Z', reference: 'HGWF-2026-1234', email: 'Marie@Client.fr' };
  s.fetch = async (q) => (q.includes('_type == "echange"') ? echange : q.includes('demandeDevis') ? demande : null);
  s.patch = (id) => {
    const p = { id, champs: null, retires: [] };
    const chaine = {
      set: (c) => { p.champs = c; return chaine; },
      unset: (l) => { p.retires = l; return chaine; },
      commit: async () => { s.patchs.push(p); },
    };
    return chaine;
  };
  return s;
}

test('relireEchange : refuse un échange qui ne vient pas du webhook (import OVH)', async () => {
  const r = await relireEchange({ echangeId: 'echange-ovh-216', sanity: sanityRelecture(), env: ENV, fetchImpl: fauxFetch() });
  assert.equal(r.status, 422);
});

test('relireEchange : clé limitée à l’envoi, message clair et rien d’écrit', async () => {
  const sanity = sanityRelecture();
  const r = await relireEchange({ echangeId: `echange-${ID_RESEND}`, sanity, env: ENV, fetchImpl: fauxFetch({ statutLecture: 401 }), maintenant: () => MAINTENANT });
  assert.equal(r.status, 503);
  assert.match(r.corps.erreur, /Full access/);
  assert.equal(sanity.patchs.length, 0);
});

test('relireEchange : remplit le texte, récupère les pièces d’un expéditeur vérifié et efface l’erreur', async () => {
  const sanity = sanityRelecture();
  const fetchImpl = fauxFetch({ pieces: [{ id: 'a1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 7 }] });
  const r = await relireEchange({ echangeId: `echange-${ID_RESEND}`, sanity, env: ENV, fetchImpl, maintenant: () => MAINTENANT });
  assert.equal(r.status, 200);
  assert.equal(r.corps.verifie, true);
  const [p] = sanity.patchs;
  assert.equal(p.id, `echange-${ID_RESEND}`);
  assert.equal(p.champs.texte, 'Je valide.');
  assert.equal(p.champs.expediteurVerifie, true);
  assert.equal(p.champs.pieces.length, 1);
  assert.deepEqual(p.retires.sort(), ['erreur', 'motifNonVerifie']);
  assert.equal(sanity.uploads.length, 1);
});

test('relireEchange : expéditeur différent de la demande, texte relu mais pièces non conservées', async () => {
  const sanity = sanityRelecture();
  const fetchImpl = fauxFetch({ from: 'Pirate <x@autre.fr>', pieces: [{ id: 'a1', filename: 'photo.jpg', content_type: 'image/jpeg', size: 7 }] });
  const r = await relireEchange({ echangeId: `echange-${ID_RESEND}`, sanity, env: ENV, fetchImpl, maintenant: () => MAINTENANT });
  assert.equal(r.status, 200);
  const [p] = sanity.patchs;
  assert.equal(p.champs.expediteurVerifie, false);
  assert.ok(p.champs.motifNonVerifie);
  assert.equal(p.champs.pieces, undefined);
  assert.match(p.champs.erreur, /non vérifié/);
  assert.equal(sanity.uploads.length, 0);
});
