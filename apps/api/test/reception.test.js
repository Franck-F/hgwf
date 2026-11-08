// Réception des réponses clients : signature Svix, référence, idempotence,
// cas sans dossier, lecture Resend refusée. Aucun réseau : fetch, client Sanity
// et envoi d'e-mail sont factices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  adresseReponse,
  extraireReference,
  horodatageParis,
  pieceBloquee,
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
function fauxSanity({ demande = { _id: 'dem-1', reference: 'HGWF-2026-1234', email: 'Marie@Client.fr' }, existant = null } = {}) {
  const s = { crees: [], patchs: [], uploads: [] };
  s.fetch = async (q) => (q.includes('_id == $id') ? existant : q.includes('demandeDevis') ? demande : null);
  s.createIfNotExists = async (doc) => { s.crees.push(doc); return doc; };
  s.patch = (id) => ({ set: (champs) => ({ commit: async () => { s.patchs.push({ id, champs }); } }) });
  s.assets = { upload: async (type, contenu, opts) => { s.uploads.push({ type, taille: contenu.length, ...opts }); return { _id: 'file-xyz' }; } };
  return s;
}

// ── Faux Resend ───────────────────────────────────────────────────────────────
function fauxFetch({ statutLecture = 200, pieces = [], from = 'Marie <marie@client.fr>', headers } = {}) {
  const appels = [];
  const f = async (url) => {
    appels.push(String(url));
    if (url.includes('/attachments')) return { ok: true, status: 200, json: async () => ({ data: pieces.map((p) => ({ ...p, download_url: 'https://dl/' + p.filename })) }) };
    if (url.startsWith('https://dl/')) return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('contenu').buffer };
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

const ENV = { RESEND_WEBHOOK_SECRET: SECRET, RESEND_API_KEY: 're_test', EMAIL_INTERNE: 'contact@hgwf-cargo.fr' };

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

test('vérification de l\'expéditeur et verdict d\'authentification', () => {
  const demande = { _id: 'd', email: ' Marie@Client.FR ' };
  assert.equal(verifierExpediteur({ de: 'Marie <marie@client.fr>', demande }).fiable, true);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr.pirate.net', demande }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr', demande: { _id: 'd' } }).fiable, false);
  assert.equal(verifierExpediteur({ de: 'marie@client.fr', demande: null }).fiable, false);
  assert.equal(verdictAuthentification([{ name: 'authentication-results', value: 'spf=fail; dkim=pass' }]), 'inconnu');
  assert.equal(verdictAuthentification([{ name: 'Authentication-Results', value: 'spf=fail; dkim=fail' }]), 'echec');
  // Un faux « pass » glissé par l'expéditeur n'efface pas le « fail » du serveur.
  assert.equal(verdictAuthentification({ 'authentication-results': ['dmarc=pass', 'dmarc=fail'] }), 'echec');
  assert.equal(verdictAuthentification(undefined), 'inconnu');
});

test('pièces dangereuses écartées, les autres conservées', async () => {
  assert.equal(pieceBloquee('facture.exe'), true);
  assert.equal(pieceBloquee('facture.EXE. '), true);
  assert.equal(pieceBloquee('tarifs.xlsm'), true);
  assert.equal(pieceBloquee('page.bin', 'text/html'), true);
  assert.equal(pieceBloquee('liste.xlsx', 'application/vnd.ms-excel.sheet.macroEnabled.12'), true);
  assert.equal(pieceBloquee('devis.pdf', 'application/pdf'), false);
  assert.equal(pieceBloquee('photo.jpg', 'image/jpeg'), false);

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
  const r = await lancer({ sanity, fetchImpl: fauxFetch({ pieces: [{ id: 'p1', filename: 'gros.zip', content_type: 'application/zip', size: 50_000_000 }] }) });
  assert.equal(r.status, 200);
  assert.equal(sanity.uploads.length, 0);
  assert.match(sanity.crees[0].erreur, /gros\.zip \(trop volumineuse\)/);
});
