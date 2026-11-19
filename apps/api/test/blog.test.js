import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdPropre, langueDe, lireArticle, nettoyerHtml, nettoyerSlug, secretValide, traiterArticle } from '../src/blog.js';

const SECRET = 'secret-de-test-assez-long';
const entetes = { authorization: `Bearer ${SECRET}` };
const corpsValide = (sup = {}) => ({
  id: 'abc-123',
  title: 'Envoyer un colis en Guadeloupe : le guide',
  slug: 'envoyer-un-colis-en-guadeloupe',
  languageCode: 'fr',
  metaDescription: 'Tout savoir pour envoyer un colis vers la Guadeloupe.',
  content_html: '<h1>Titre</h1><p>Bonjour <a href="https://exemple.fr" target="_blank">lien</a></p><script>alert(1)</script>',
  jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: 'x' },
  keywords: ['colis', 'guadeloupe'],
  heroImageUrl: 'https://cdn.exemple.com/image.jpg',
  heroImageAlt: 'Un conteneur',
  createdAt: '2026-11-19T08:00:00Z',
  ...sup,
});

/** Faux client Sanity : mémorise les écritures, répond aux lectures utiles. */
function fauxSanity({ existant = null, slugsPris = [] } = {}) {
  const ecrits = [];
  const televerses = [];
  return {
    ecrits,
    televerses,
    fetch: async (requete, params) => {
      if (requete.startsWith('count(')) return slugsPris.includes(params.slug) ? 1 : 0;
      return existant;
    },
    createOrReplace: async (doc) => {
      ecrits.push(doc);
      return doc;
    },
    assets: {
      upload: async (type, octets, options) => {
        televerses.push({ type, taille: octets.length, options });
        return { _id: 'image-abc-1200x800-jpg' };
      },
    },
  };
}

const fauxFetch = (type = 'image/jpeg') => async () => ({
  ok: true,
  status: 200,
  headers: new Map([['content-type', type], ['content-length', '4']]),
  arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
});

test('nettoyerHtml : retire script et événements, h1 devient h2, liens externes en noopener', () => {
  const sortie = nettoyerHtml('<h1>T</h1><p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">j</a><a href="https://a.fr" target="_blank">e</a><iframe src="https://x"></iframe><img src="http://x/i.png"><img src="https://x/i.png" onerror="x()">');
  assert.doesNotMatch(sortie, /script|onclick|onerror|iframe|javascript:/i);
  assert.match(sortie, /<h2>T<\/h2>/);
  assert.match(sortie, /rel="noopener noreferrer"/);
  assert.match(sortie, /<img src="https:\/\/x\/i.png" loading="lazy" decoding="async" \/>/);
  assert.doesNotMatch(sortie, /http:\/\/x/);
});

test('nettoyerSlug, langueDe, jsonLdPropre', () => {
  assert.equal(nettoyerSlug('Fret maritime : 5 conseils à Pointe-à-Pitre !'), 'fret-maritime-5-conseils-a-pointe-a-pitre');
  assert.equal(langueDe({ languageCode: 'fr-FR' }), 'fr');
  assert.equal(langueDe({ lang: 'en', languageCode: 'fr' }), 'en');
  assert.equal(langueDe({}), 'fr');
  assert.equal(langueDe({ languageCode: 'es' }), null);
  assert.equal(jsonLdPropre('{"a":1}'), '{"a":1}');
  assert.equal(jsonLdPropre('pas du json'), null);
  assert.equal(jsonLdPropre(null), null);
});

test('lireArticle : refuse un corps incomplet ou une langue non publiée', () => {
  assert.equal(lireArticle(corpsValide({ id: '' })).ok, false);
  assert.equal(lireArticle(corpsValide({ content_html: '<script>x</script>' })).ok, false);
  assert.match(lireArticle(corpsValide({ languageCode: 'de' })).erreur, /langue/);
  const lu = lireArticle(corpsValide());
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.article.motsCles, ['colis', 'guadeloupe']);
});

test('secretValide : Bearer ou X-API-Key', () => {
  assert.equal(secretValide({ authorization: `Bearer ${SECRET}` }, SECRET), true);
  assert.equal(secretValide({ 'x-api-key': SECRET }, SECRET), true);
  assert.equal(secretValide({ authorization: 'Bearer autre' }, SECRET), false);
  assert.equal(secretValide({}, SECRET), false);
  assert.equal(secretValide({ authorization: `Bearer ${SECRET}` }, undefined), false);
});

test('traiterArticle : 503 sans secret configuré, 401 avec un mauvais secret', async () => {
  const s = fauxSanity();
  assert.equal((await traiterArticle({ corps: corpsValide(), entetes, sanity: s, env: {} })).status, 503);
  const r = await traiterArticle({ corps: corpsValide(), entetes: { authorization: 'Bearer faux' }, sanity: s, env: { BABYLOVEGROWTH_WEBHOOK_SECRET: SECRET } });
  assert.equal(r.status, 401);
  assert.equal(s.ecrits.length, 0);
});

test('traiterArticle : range l’article (HTML nettoyé, image importée) et renvoie le lien', async () => {
  const s = fauxSanity();
  const r = await traiterArticle({ corps: corpsValide(), entetes, sanity: s, env: { BABYLOVEGROWTH_WEBHOOK_SECRET: SECRET }, fetchImpl: fauxFetch() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.corps, { success: true, link: 'https://hgwf-cargo.fr/fr/blog/envoyer-un-colis-en-guadeloupe/' });
  const doc = s.ecrits[0];
  assert.equal(doc._id, 'article-blg-abc-123');
  assert.equal(doc._type, 'article');
  assert.doesNotMatch(doc.contenuHtml, /script/);
  assert.equal(doc.imagePrincipale.asset._ref, 'image-abc-1200x800-jpg');
  assert.equal(doc.langue, 'fr');
  assert.equal(s.televerses.length, 1);
});

test('traiterArticle : slug déjà pris → suffixe ; article verrouillé → rien n’est écrit', async () => {
  const pris = fauxSanity({ slugsPris: ['envoyer-un-colis-en-guadeloupe'] });
  const r = await traiterArticle({ corps: corpsValide({ heroImageUrl: null }), entetes, sanity: pris, env: { BABYLOVEGROWTH_WEBHOOK_SECRET: SECRET } });
  assert.match(r.corps.link, /envoyer-un-colis-en-guadeloupe-2\/$/);

  const verrou = fauxSanity({ existant: { _id: 'article-blg-abc-123', verrouille: true } });
  const v = await traiterArticle({ corps: corpsValide(), entetes, sanity: verrou, env: { BABYLOVEGROWTH_WEBHOOK_SECRET: SECRET } });
  assert.equal(v.corps.success, true);
  assert.equal(verrou.ecrits.length, 0);
});

test('traiterArticle : une image refusée n’empêche pas la publication', async () => {
  const s = fauxSanity();
  const r = await traiterArticle({ corps: corpsValide(), entetes, sanity: s, env: { BABYLOVEGROWTH_WEBHOOK_SECRET: SECRET }, fetchImpl: fauxFetch('text/html') });
  assert.equal(r.status, 200);
  assert.equal(s.ecrits[0].imagePrincipale, undefined);
});
