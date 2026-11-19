/**
 * Articles de blog envoyés par BabyLoveGrowth (webhook « Send articles to your
 * webhook URL »), rangés dans le dataset public `production` de Sanity, d'où le
 * site statique les lit à sa prochaine construction.
 *
 * Contrat du webhook (docs BabyLoveGrowth, novembre 2026) : POST JSON, secret
 * dans `Authorization: Bearer <secret>` (et en double dans `X-API-Key`), champs
 * id, title, slug, metaDescription, languageCode / lang, content_html,
 * content_markdown, jsonLd, faqJsonLd, heroImageUrl, heroImageAlt, keywords,
 * createdAt. Réponse attendue : 2xx avec `{ success, link }` en JSON. Les
 * erreurs 429/5xx sont rejouées trois fois : le traitement est idempotent
 * (même article = même document `article-blg-<id>`).
 *
 * Sécurité : le HTML vient d'un service extérieur et sera publié tel quel sur
 * hgwf-cargo.fr. Il est nettoyé ici, avec une liste blanche de balises et
 * d'attributs : pas de script, pas de style, pas d'iframe, pas d'attribut
 * d'événement, liens en http(s) ou mailto uniquement.
 */
import sanitizeHtml from 'sanitize-html';
import { cleValide } from './securite.js';

export const SITE_URL = 'https://hgwf-cargo.fr';
export const LANGUES = ['fr', 'en'];
const IMAGE_MAX = 8 * 1024 * 1024;

const OPTIONS_HTML = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub', 'mark', 'small',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'code', 'pre', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    ol: ['start'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  // La page porte déjà son <h1> (le titre) : un h1 du contenu devient h2.
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => {
      const externe = attribs.target === '_blank';
      return {
        tagName,
        attribs: { ...attribs, ...(externe ? { rel: 'noopener noreferrer' } : {}) },
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy', decoding: 'async' } }),
  },
};

export function nettoyerHtml(html) {
  return sanitizeHtml(String(html ?? ''), OPTIONS_HTML).trim();
}

/** « Fret maritime : 5 conseils ! » → « fret-maritime-5-conseils ». */
export function nettoyerSlug(brut) {
  return String(brut ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/** « fr », « fr-FR », « French » → « fr » ; null si la langue n'est pas publiée sur le site. */
export function langueDe(corps) {
  const brut = String(corps?.lang || corps?.languageCode || 'fr').trim().toLowerCase();
  const code = brut.startsWith('fr') || brut === 'french' || brut === 'français' ? 'fr' : brut.startsWith('en') || brut === 'english' ? 'en' : null;
  return code;
}

/** Données structurées : objet ou chaîne JSON valide → chaîne JSON compacte ; sinon null. */
export function jsonLdPropre(valeur) {
  if (valeur == null || valeur === '') return null;
  try {
    const objet = typeof valeur === 'string' ? JSON.parse(valeur) : valeur;
    if (!objet || typeof objet !== 'object') return null;
    const texte = JSON.stringify(objet);
    return texte.length > 100_000 ? null : texte;
  } catch {
    return null;
  }
}

const idSur = (v) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
const texte = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Valide et normalise le corps du webhook. Renvoie `{ ok: true, article }` ou
 * `{ ok: false, erreur }` (message lisible, renvoyé à BabyLoveGrowth).
 */
export function lireArticle(corps) {
  if (!corps || typeof corps !== 'object') return { ok: false, erreur: 'corps JSON attendu' };
  const id = idSur(corps.id);
  const titre = texte(corps.title, 200);
  const slug = nettoyerSlug(corps.slug || corps.title);
  const langue = langueDe(corps);
  const contenu = nettoyerHtml(corps.content_html);
  if (!id) return { ok: false, erreur: 'champ id manquant' };
  if (!titre) return { ok: false, erreur: 'champ title manquant' };
  if (!slug) return { ok: false, erreur: 'champ slug manquant' };
  if (!langue) return { ok: false, erreur: `langue non publiée sur le site (${texte(corps.lang || corps.languageCode, 20)}) : seulement fr et en` };
  if (!contenu) return { ok: false, erreur: 'champ content_html vide' };

  const motsCles = (Array.isArray(corps.keywords) ? corps.keywords : String(corps.keywords ?? '').split(','))
    .map((m) => texte(m, 80))
    .filter(Boolean)
    .slice(0, 20);
  const heroImageUrl = /^https:\/\//i.test(String(corps.heroImageUrl ?? '')) ? String(corps.heroImageUrl).slice(0, 2000) : null;
  const date = new Date(corps.createdAt ?? Date.now());

  return {
    ok: true,
    article: {
      id,
      titre,
      slug,
      langue,
      description: texte(corps.metaDescription, 320),
      motsCles,
      contenu,
      jsonLd: jsonLdPropre(corps.jsonLd),
      faqJsonLd: jsonLdPropre(corps.faqJsonLd),
      heroImageUrl,
      heroImageAlt: texte(corps.heroImageAlt, 300),
      publieLe: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    },
  };
}

export const lienArticle = (a) => `${SITE_URL}/${a.langue}/blog/${a.slug}/`;

/** Le secret arrive en `Authorization: Bearer …` ou, à défaut, en `X-API-Key`. */
export function secretValide(entetes, attendu) {
  if (!attendu) return false;
  const auth = String(entetes?.authorization ?? '');
  const porteur = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return cleValide(porteur, attendu) || cleValide(String(entetes?.['x-api-key'] ?? ''), attendu);
}

async function importerImage({ url, nom, sanity, fetchImpl }) {
  const rep = await fetchImpl(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
  if (!rep.ok) throw new Error(`image ${rep.status}`);
  const type = rep.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`image : type ${type || 'inconnu'}`);
  const taille = Number(rep.headers.get('content-length') ?? 0);
  if (taille > IMAGE_MAX) throw new Error('image trop lourde');
  const octets = Buffer.from(await rep.arrayBuffer());
  if (octets.length > IMAGE_MAX) throw new Error('image trop lourde');
  const asset = await sanity.assets.upload('image', octets, { filename: nom, contentType: type });
  return asset._id;
}

async function relancerConstruction({ env, fetchImpl }) {
  // Facultatif : sans jeton GitHub, la construction quotidienne publie l'article.
  const jeton = env.GITHUB_DISPATCH_TOKEN;
  const depot = env.GITHUB_DEPOT || 'Franck-F/hgwf';
  if (!jeton) return false;
  const rep = await fetchImpl(`https://api.github.com/repos/${depot}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'sanity-publish', client_payload: { origine: 'blog' } }),
    signal: AbortSignal.timeout(10_000),
  });
  return rep.status === 204;
}

/**
 * Traite un appel du webhook. `sanity` est un client du dataset `production`.
 * Renvoie `{ status, corps }` ; le corps est toujours un objet JSON.
 */
export async function traiterArticle({ corps, entetes, sanity, env = process.env, fetchImpl = fetch }) {
  const secret = env.BABYLOVEGROWTH_WEBHOOK_SECRET;
  if (!secret) return { status: 503, corps: { success: false, error: 'webhook non configuré (BABYLOVEGROWTH_WEBHOOK_SECRET absent)' } };
  if (!secretValide(entetes, secret)) return { status: 401, corps: { success: false, error: 'secret invalide' } };

  const lu = lireArticle(corps);
  if (!lu.ok) return { status: 400, corps: { success: false, error: lu.erreur } };
  const a = lu.article;
  const _id = `article-blg-${a.id}`;

  const existant = await sanity.fetch(`*[_id == $id][0]{_id, verrouille, "imageRef": imagePrincipale.asset._ref, "source": source.imageUrl}`, { id: _id });
  // L'équipe peut figer un article retouché dans le Studio : il n'est plus écrasé.
  if (existant?.verrouille) {
    return { status: 200, corps: { success: true, link: lienArticle(a), note: 'article verrouillé dans le Studio, non modifié' } };
  }

  // Un autre article occupe déjà ce slug dans cette langue : suffixe -2, -3…
  let slug = a.slug;
  for (let n = 2; n < 50; n += 1) {
    const pris = await sanity.fetch(`count(*[_type == "article" && langue == $langue && slug.current == $slug && _id != $id && !(_id in path("drafts.**"))])`, { langue: a.langue, slug, id: _id });
    if (!pris) break;
    slug = `${a.slug}-${n}`.slice(0, 120);
  }
  const article = { ...a, slug };

  // Image principale importée dans Sanity (le site ne dépend pas du CDN de
  // BabyLoveGrowth) ; réutilisée si la même URL a déjà été importée.
  let imageRef = existant?.source === a.heroImageUrl ? existant?.imageRef ?? null : null;
  if (a.heroImageUrl && !imageRef) {
    try {
      imageRef = await importerImage({ url: a.heroImageUrl, nom: `${slug}.jpg`, sanity, fetchImpl });
    } catch (err) {
      console.error(`[blog] image non importée pour ${_id} : ${err?.message ?? err}`);
    }
  }

  await sanity.createOrReplace({
    _id,
    _type: 'article',
    titre: article.titre,
    slug: { _type: 'slug', current: slug },
    langue: article.langue,
    description: article.description,
    motsCles: article.motsCles,
    contenuHtml: article.contenu,
    ...(imageRef ? { imagePrincipale: { _type: 'image', asset: { _type: 'reference', _ref: imageRef }, alt: article.heroImageAlt || article.titre } } : {}),
    jsonLd: article.jsonLd ?? undefined,
    faqJsonLd: article.faqJsonLd ?? undefined,
    publieLe: article.publieLe,
    verrouille: false,
    source: { service: 'BabyLoveGrowth', idExterne: a.id, imageUrl: a.heroImageUrl ?? undefined, recuLe: new Date().toISOString() },
  });

  let reconstruction = false;
  try {
    reconstruction = await relancerConstruction({ env, fetchImpl });
  } catch (err) {
    console.error(`[blog] relance de la construction impossible : ${err?.message ?? err}`);
  }
  console.log(`[blog] ${_id} → ${lienArticle(article)} (${reconstruction ? 'construction relancée' : 'publication à la prochaine construction'})`);
  return { status: 200, corps: { success: true, link: lienArticle(article) } };
}
