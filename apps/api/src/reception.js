/**
 * Réception des réponses des clients (webhook Resend « email.received »).
 *
 * Chaque e-mail sortant du back-office porte une adresse de réponse propre au
 * dossier : « dossier-<REFERENCE>@reponses.hgwf-cargo.fr ». Quand le client
 * répond, Resend appelle POST /api/reception-email. On range alors la réponse
 * dans le dossier (document `echange`), on fait remonter la demande
 * (`reponseClientLe`) et on envoie une copie à l'équipe, qui continue de lire
 * ses messages dans Outlook.
 *
 * Le webhook ne contient que des métadonnées : le corps et les pièces jointes
 * se lisent ensuite par l'API Resend (voir `lireEmailRecu`).
 *
 * Sécurité : connaître une référence ne suffit pas pour écrire dans un dossier.
 * L'expéditeur doit être l'adresse e-mail de la demande, et l'authentification
 * du message (SPF/DKIM/DMARC) ne doit pas avoir échoué (`verifierExpediteur`).
 * Sinon le message est rangé mais signalé « à vérifier », sans pièces jointes
 * ni remontée de la demande. Un message sans dossier n'est pas enregistré :
 * l'équipe en reçoit une copie texte, sans pièces jointes, avec un avertissement
 * (l'adresse ne doit pas servir à faire entrer des fichiers piégés sous le nom
 * du domaine HGWF). Les exécutables, scripts, pages HTML et documents à macros
 * sont toujours écartés (`pieceBloquee`).
 *
 * Tout est injectable (fetch, client Sanity, envoi) pour les tests : aucun
 * appel réseau dans test/reception.test.js.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { envoyerEmail } from './email.js';

const RESEND_RECEPTION = 'https://api.resend.com/emails/receiving';
export const DOMAINE_PAR_DEFAUT = 'reponses.hgwf-cargo.fr';

// Au-delà, le webhook n'est pas celui de Resend (il ne porte que des métadonnées).
export const TAILLE_MAX_WEBHOOK = 256_000;
// Tolérance sur l'horodatage signé : borne la rejouabilité d'un appel intercepté.
const TOLERANCE_S = 300;
const PIECE_MAX = 10 * 1024 * 1024;
// Resend plafonne un envoi à 40 Mo ; on garde de la marge (base64 : +33 %).
const COPIE_MAX_TOTAL = 25 * 1024 * 1024;
const NB_PIECES_MAX = 20;

// ── Signature Svix ────────────────────────────────────────────────────────────
// Contenu signé : « id.timestamp.corps brut », HMAC-SHA256 avec la clé décodée
// du secret « whsec_<base64> ». L'en-tête peut porter plusieurs signatures
// (« v1,xxx v1,yyy ») pendant une rotation de secret.
export function verifierSignature({ corps, entetes, secret, maintenant = Date.now(), toleranceS = TOLERANCE_S }) {
  const id = entetes['svix-id'];
  const horodatage = entetes['svix-timestamp'];
  const signatures = entetes['svix-signature'];
  if (!secret || !id || !horodatage || !signatures) return false;

  const ts = Number(horodatage);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(maintenant / 1000 - ts) > toleranceS) return false;

  const cle = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const attendue = createHmac('sha256', cle).update(`${id}.${horodatage}.`).update(corps).digest();

  for (const candidate of String(signatures).split(' ')) {
    const [version, valeur] = candidate.split(',');
    if (version !== 'v1' || !valeur) continue;
    const recue = Buffer.from(valeur, 'base64');
    // timingSafeEqual exige deux tampons de même longueur.
    if (recue.length === attendue.length && timingSafeEqual(recue, attendue)) return true;
  }
  return false;
}

// ── Adresses et référence ─────────────────────────────────────────────────────
const toutesAdresses = (...listes) =>
  listes
    .flat()
    .filter(Boolean)
    .map((a) => (typeof a === 'string' ? a : (a?.email ?? a?.address ?? '')))
    .filter(Boolean);

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Adresse de réponse d'un dossier, ou celle de l'équipe (ancien comportement)
 * quand REPONSES_DOMAINE est vide ou la référence inconnue. REPONSES_DOMAINE
 * absent = domaine par défaut ; défini mais vide = fonction désactivée. */
export function adresseReponse(reference, env = process.env) {
  const domaine = env.REPONSES_DOMAINE === undefined ? DOMAINE_PAR_DEFAUT : env.REPONSES_DOMAINE.trim();
  const ref = String(reference ?? '').trim();
  if (!domaine || !ref) return env.EMAIL_INTERNE || undefined;
  return `dossier-${ref.toLowerCase()}@${domaine}`;
}

/** « dossier-HGWF-2026-1234@domaine » → « HGWF-2026-1234 » (null si aucune).
 * Accepte toute référence de demande (HGWF-AAAA-N du site, DEV-AAMM-NNN des
 * demandes saisies à la main), car adresseReponse() les écrit toutes. */
export function extraireReference(adresses, domaine = DOMAINE_PAR_DEFAUT) {
  const re = new RegExp(`(?<![a-z0-9._-])dossier-([a-z0-9][a-z0-9-]{2,40})@${echapper(domaine)}`, 'i');
  for (const a of adresses) {
    const m = String(a).match(re);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Adresse seule d'un « Nom <adresse> ». */
export function adresseDe(texte) {
  const s = String(texte ?? '');
  return s.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ?? s.match(/[^\s<>",;]+@[^\s<>",;]+/)?.[0] ?? '';
}

// ── Vérification de l'expéditeur ──────────────────────────────────────────────
/**
 * Verdict tiré des en-têtes « Authentication-Results » quand Resend les
 * transmet (objet ou liste {name, value}). On ne s'en sert que pour REFUSER :
 * un expéditeur malveillant peut glisser un faux « pass » dans ses propres
 * en-têtes, jamais effacer le « fail » ajouté par le serveur de réception.
 * @returns {'echec' | 'inconnu'}
 */
export function verdictAuthentification(entetes) {
  const valeurs = [];
  const garder = (nom, valeur) => {
    if (/^authentication-results$/i.test(String(nom ?? ''))) valeurs.push(...[valeur].flat().map(String));
  };
  if (Array.isArray(entetes)) for (const h of entetes) garder(h?.name ?? h?.key, h?.value);
  else if (entetes && typeof entetes === 'object') for (const [k, v] of Object.entries(entetes)) garder(k, v);
  const t = valeurs.join(' ').toLowerCase();
  if (/\bdmarc=fail\b/.test(t)) return 'echec';
  if (/\bspf=fail\b/.test(t) && !/\bdkim=pass\b/.test(t)) return 'echec';
  return 'inconnu';
}

/**
 * Le message vient-il bien du client du dossier ? Adresse identique à celle de
 * la demande (casse ignorée) et authentification non échouée.
 * @returns {{ fiable: boolean, motif?: string }}
 */
export function verifierExpediteur({ de, demande, entetes }) {
  if (!demande) return { fiable: false, motif: 'aucun dossier correspondant' };
  const adresse = adresseDe(de).trim().toLowerCase();
  const attendue = String(demande.email ?? '').trim().toLowerCase();
  if (!adresse) return { fiable: false, motif: 'expéditeur absent du message' };
  if (!attendue || adresse !== attendue) {
    return { fiable: false, motif: `l’expéditeur ${adresse} n’est pas l’adresse e-mail enregistrée dans la demande` };
  }
  if (verdictAuthentification(entetes) === 'echec') {
    return { fiable: false, motif: 'l’authentification du message (SPF/DKIM/DMARC) a échoué : l’adresse a pu être usurpée' };
  }
  return { fiable: true };
}

// Jamais conservées ni transmises : programmes, scripts, raccourcis, images
// disque, pages HTML/SVG (scripts possibles) et documents Office à macros.
const EXTENSIONS_BLOQUEES =
  /\.(exe|com|scr|pif|bat|cmd|msi|msp|dll|cpl|jar|js|jse|mjs|vbs|vbe|wsf|wsh|hta|ps1|psm1|sh|lnk|url|reg|iso|img|vhdx?|html?|xhtml?|svg|docm|dotm|xlsm|xltm|xlam|pptm|potm|ppsm|sldm)$/i;
const TYPES_BLOQUES =
  /^(text\/html|image\/svg\+xml|application\/(x-msdownload|x-msdos-program|x-dosexec|x-ms-installer|x-msi|javascript|x-javascript|x-sh|hta|xhtml\+xml|vnd\.ms-[a-z.]*macroenabled[a-z.0-9]*))\b/i;

export function pieceBloquee(nom, typeMime) {
  // Windows ignore les points et espaces finaux : « facture.exe. » est un .exe.
  const propre = String(nom ?? '').replace(/[\s.]+$/, '');
  return EXTENSIONS_BLOQUEES.test(propre) || TYPES_BLOQUES.test(String(typeMime ?? '').trim());
}

// ── Texte ─────────────────────────────────────────────────────────────────────
const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function htmlEnTexte(html) {
  return String(html ?? '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(Number(e.slice(1))) : (ENTITES[e.toLowerCase()] ?? m),
    )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Format du back-office (« JJ/MM/AAAA à HHhMM »), en heure de Paris : sur
// Vercel l'horloge est en UTC, alors que l'équipe lit l'heure française.
export function horodatageParis(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} à ${p.hour}h${p.minute}`;
}

// ── API Resend ────────────────────────────────────────────────────────────────
class ErreurResend extends Error {
  constructor(statut) {
    super(`Resend ${statut}`);
    this.statut = statut;
  }
}

async function appelResend(chemin, cle, fetchImpl) {
  const rep = await fetchImpl(`${RESEND_RECEPTION}/${chemin}`, {
    headers: { Authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!rep.ok) throw new ErreurResend(rep.status);
  return rep.json();
}

// Refus définitif de lecture (clé limitée à l'envoi, ou e-mail introuvable) :
// inutile de faire rejouer le webhook, on enregistre ce qu'on sait.
const refusDefinitif = (err) => err instanceof ErreurResend && [400, 401, 403, 404].includes(err.statut);

async function telechargerPieces(liste, fetchImpl) {
  const pieces = [];
  const omises = [];
  for (const p of liste.slice(0, NB_PIECES_MAX)) {
    const nom = p.filename || 'piece-jointe';
    if (pieceBloquee(nom, p.content_type)) { omises.push(`${nom} (type de fichier bloqué par sécurité)`); continue; }
    if (!p.download_url) { omises.push(`${nom} (lien absent)`); continue; }
    if (p.size > PIECE_MAX) { omises.push(`${nom} (trop volumineuse)`); continue; }
    try {
      const rep = await fetchImpl(p.download_url, { signal: AbortSignal.timeout(30_000) });
      if (!rep.ok) { omises.push(`${nom} (téléchargement ${rep.status})`); continue; }
      const contenu = Buffer.from(await rep.arrayBuffer());
      if (contenu.length > PIECE_MAX) { omises.push(`${nom} (trop volumineuse)`); continue; }
      pieces.push({ nom, typeMime: p.content_type || 'application/octet-stream', contenu });
    } catch {
      omises.push(`${nom} (téléchargement impossible)`);
    }
  }
  if (liste.length > NB_PIECES_MAX) omises.push(`${liste.length - NB_PIECES_MAX} pièce(s) au-delà de ${NB_PIECES_MAX}`);
  return { pieces, omises };
}

/** Lit le message (texte, en-têtes, liste des pièces), sans les pièces. */
function lireEmailRecu(emailId, cle, fetchImpl) {
  // cid : garde les images intégrées en références, sinon le HTML embarquerait
  // chaque image en base64 et pourrait peser plusieurs dizaines de Mo.
  return appelResend(`${encodeURIComponent(emailId)}?html_format=cid`, cle, fetchImpl);
}

/**
 * Télécharge les pièces jointes, une fois l'expéditeur vérifié. Un refus
 * définitif n'empêche pas de garder le texte : il est consigné dans `omises`.
 */
async function lirePiecesRecues(emailId, cle, fetchImpl, attendues) {
  try {
    const liste = await appelResend(`${encodeURIComponent(emailId)}/attachments`, cle, fetchImpl);
    return await telechargerPieces(liste.data ?? [], fetchImpl);
  } catch (err) {
    if (!refusDefinitif(err)) throw err;
    return { pieces: [], omises: [`${attendues.length} pièce(s) jointe(s) illisible(s) (Resend ${err.statut})`] };
  }
}

const nomsPieces = (attendues) => {
  const noms = attendues.map((p) => p?.filename).filter(Boolean);
  return noms.length ? ` (${noms.join(', ')})` : '';
};

// ── Traitement d'un e-mail reçu ───────────────────────────────────────────────
const idEchange = (emailId) => `echange-${String(emailId).replace(/[^A-Za-z0-9_.-]/g, '-')}`;

function pieceCopie(pieces) {
  const joints = [];
  let total = 0;
  const trop = [];
  for (const p of pieces) {
    total += p.contenu.length;
    if (total > COPIE_MAX_TOTAL) { trop.push(p.nom); continue; }
    joints.push({ filename: p.nom, content: p.contenu.toString('base64') });
  }
  return { joints, trop };
}

/**
 * @returns {Promise<{status: number, corps: object}>} 200 = traité (ou à ne
 * pas rejouer) ; 5xx = Resend doit réessayer.
 */
async function traiterEmail(data, deps) {
  const { sanity, env, fetchImpl, envoyer, maintenant } = deps;
  const emailId = data.email_id ?? data.id;
  if (!emailId) return { status: 400, corps: { ok: false, erreur: 'email_id absent' } };

  const domaine = env.REPONSES_DOMAINE || DOMAINE_PAR_DEFAUT;
  const _id = idEchange(emailId);

  // Déjà traité jusqu'à la copie à l'équipe : on ne refait rien (Resend rejoue
  // un webhook en cas de doute, et l'équipe ne doit pas recevoir deux copies).
  const existant = await sanity.fetch(`*[_id == $id][0]{_id, transfereLe}`, { id: _id });
  if (existant?.transfereLe) return { status: 200, corps: { ok: true, doublon: true } };

  // Panne passagère de Resend : mieux vaut un rejeu qu'un message perdu.
  const rejouer = (err) => {
    console.error(`[reception] lecture impossible (${err?.statut ?? err?.name ?? 'erreur'}), nouvel essai demandé`);
    return { status: 503, corps: { ok: false, erreur: 'lecture temporairement impossible' } };
  };

  // Lecture du contenu. Refus définitif : on garde les métadonnées du webhook.
  let mail = null;
  const problemes = [];
  if (!env.RESEND_API_KEY) {
    problemes.push('RESEND_API_KEY absente : contenu non lu');
  } else {
    try {
      mail = await lireEmailRecu(emailId, env.RESEND_API_KEY, fetchImpl);
    } catch (err) {
      if (!refusDefinitif(err)) return rejouer(err);
      problemes.push(
        `Contenu du message illisible (Resend ${err.statut}) : la clé RESEND_API_KEY est probablement limitée à l'envoi. Ouvrir le message dans le tableau de bord Resend (Emails > Receiving).`,
      );
    }
  }

  const source = mail ?? {};
  const de = source.from ?? data.from ?? '';
  const a = toutesAdresses(source.to ?? data.to).join(', ');
  const objet = (source.subject ?? data.subject ?? '(sans objet)').trim();
  const texte = (source.text || htmlEnTexte(source.html) || '').trim();
  const recuLe = source.created_at ?? data.created_at ?? new Date(maintenant()).toISOString();

  // Destinataires possibles de la référence : to/cc, mais aussi received_for
  // (cas d'une redirection où l'adresse de dossier n'est qu'en enveloppe).
  const reference = extraireReference(
    toutesAdresses(data.to, data.cc, data.bcc, source.to, source.cc, source.received_for, data.received_for),
    domaine,
  );

  const demande = reference
    ? await sanity.fetch(`*[_type == "demandeDevis" && reference == $ref][0]{_id, reference, email}`, { ref: reference })
    : null;
  const verification = verifierExpediteur({ de, demande, entetes: source.headers });
  const fiable = verification.fiable;

  // Pièces jointes : téléchargées seulement pour un expéditeur vérifié.
  let pieces = [];
  let omises = [];
  const attendues = source.attachments ?? data.attachments ?? [];
  if (attendues.length) {
    if (!fiable) {
      omises = [`${attendues.length} pièce(s) jointe(s) non récupérée(s), expéditeur non vérifié${nomsPieces(attendues)}`];
    } else if (mail) {
      try {
        ({ pieces, omises } = await lirePiecesRecues(emailId, env.RESEND_API_KEY, fetchImpl, attendues));
      } catch (err) {
        return rejouer(err);
      }
    }
  }
  if (omises.length) problemes.push(`Pièces non récupérées : ${omises.join(', ')}`);

  // ── Rangement dans le dossier ──────────────────────────────────────────────
  // Seulement pour une demande existante : une référence inventée ne doit pas
  // créer de documents dans le back-office.
  if (demande) {
    // Pièces envoyées à Sanity seulement à la première passe : un rejeu ne
    // doit pas les téléverser une seconde fois.
    const piecesSanity = [];
    if (!existant) {
      for (const [i, p] of pieces.entries()) {
        try {
          const asset = await sanity.assets.upload('file', p.contenu, { filename: p.nom, contentType: p.typeMime });
          piecesSanity.push({
            _key: `p${i}`,
            nom: p.nom,
            typeMime: p.typeMime,
            taille: p.contenu.length,
            fichier: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
          });
        } catch {
          problemes.push(`Pièce ${p.nom} non enregistrée dans Sanity`);
        }
      }
      await sanity.createIfNotExists({
        _id,
        _type: 'echange',
        reference,
        demande: { _type: 'reference', _weak: true, _ref: demande._id },
        sens: 'recu',
        de,
        a,
        objet,
        texte,
        recuLe,
        pieces: piecesSanity,
        lu: false,
        expediteurVerifie: fiable,
        ...(fiable ? {} : { motifNonVerifie: verification.motif }),
        ...(problemes.length ? { erreur: problemes.join(' | ') } : {}),
      });
    }
    // Pose seule du champ : aucune autre valeur de la demande n'est touchée.
    // Format du back-office V2 : « JJ/MM/AAAA à HHhMM ». Un expéditeur non
    // vérifié ne fait pas avancer le dossier : l'équipe juge d'abord.
    if (fiable) {
      await sanity.patch(demande._id).set({ reponseClientLe: horodatageParis(new Date(maintenant())) }).commit();
    }
  }

  // ── Copie à l'équipe ───────────────────────────────────────────────────────
  const interne = env.EMAIL_INTERNE;
  if (!interne) return { status: 200, corps: { ok: true, reference, copie: false } };

  const { joints, trop } = pieceCopie(pieces);
  const notes = [...problemes, ...(trop.length ? [`Pièces trop lourdes pour la copie : ${trop.join(', ')}`] : [])];
  const prefixe = fiable
    ? `[Réponse client ${reference}]`
    : demande
      ? `[À vérifier ${reference}]`
      : '[Message externe non vérifié]';
  const prudence = 'Ne cliquez sur aucun lien et ne transmettez aucune information avant d’avoir vérifié l’expéditeur.';
  const avertissement = fiable
    ? ''
    : demande
      ? `ATTENTION – expéditeur à vérifier : ${verification.motif}. Les pièces jointes n’ont été ni conservées ni transmises. ${prudence}`
      : `ATTENTION – message reçu sur ${domaine} sans dossier correspondant${reference ? ` (référence ${reference} inconnue)` : ''}. Il n’a pas été enregistré dans le back-office et ses pièces jointes n’ont pas été transmises. ${prudence}`;
  const corpsTexte = mail
    ? texte || '(message sans texte)'
    : `Le contenu de ce message n'a pas pu être lu automatiquement. Expéditeur : ${de || '?'}.`;
  const lignes = [
    ...(avertissement ? [avertissement, ''] : []),
    corpsTexte,
    ...(notes.length ? ['', `— Avertissement : ${notes.join(' | ')}`] : []),
  ];
  const envoi = await envoyer({
    to: interne,
    subject: `${prefixe} ${objet}`,
    text: lignes.join('\n'),
    // Répondre depuis Outlook écrit directement à l'expéditeur.
    replyTo: adresseDe(de) || undefined,
    attachments: fiable ? joints : [],
  });

  if (!envoi.ok) {
    console.error(`[reception] copie à l'équipe échouée : ${envoi.raison}`);
    // Sans configuration d'envoi, rejouer n'y changera rien.
    if (envoi.raison?.startsWith('envoi non configuré')) return { status: 200, corps: { ok: true, reference, copie: false } };
    return { status: 502, corps: { ok: false, erreur: 'copie à l’équipe impossible' } };
  }

  if (demande) {
    await sanity.patch(_id).set({ transfereLe: new Date(maintenant()).toISOString() }).commit().catch(() => {});
  }
  return { status: 200, corps: { ok: true, reference, copie: true, verifie: fiable } };
}

/**
 * Point d'entrée : vérifie la signature puis traite l'événement.
 *
 * @param {object} p
 * @param {Buffer} p.corps   corps BRUT (la signature porte sur les octets reçus)
 * @param {object} p.entetes en-têtes HTTP en minuscules
 * @param {object} p.sanity  client Sanity
 */
export async function traiterReception({
  corps,
  entetes,
  sanity,
  env = process.env,
  fetchImpl = fetch,
  envoyer = envoyerEmail,
  maintenant = () => Date.now(),
}) {
  if (!verifierSignature({ corps, entetes, secret: env.RESEND_WEBHOOK_SECRET, maintenant: maintenant() })) {
    return { status: 401, corps: { ok: false, erreur: 'signature invalide' } };
  }

  let evenement;
  try {
    evenement = JSON.parse(corps.toString('utf8'));
  } catch {
    return { status: 400, corps: { ok: false, erreur: 'JSON invalide' } };
  }
  if (evenement?.type !== 'email.received') return { status: 200, corps: { ok: true, ignore: true } };

  try {
    return await traiterEmail(evenement.data ?? {}, { sanity, env, fetchImpl, envoyer, maintenant });
  } catch (err) {
    // Ni adresse ni contenu dans les journaux : le nom de l'erreur suffit.
    console.error(`[reception] échec : ${err?.name ?? 'erreur'} ${err?.statut ?? ''}`);
    return { status: 500, corps: { ok: false, erreur: 'traitement impossible' } };
  }
}
