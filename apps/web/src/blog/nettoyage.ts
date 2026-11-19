/**
 * Nettoyage du HTML d'un article au moment de la construction du site (code
 * serveur uniquement : rien de ceci n'est envoyé au navigateur).
 *
 * C'est le SEUL nettoyage : l'API range le HTML de BabyLoveGrowth tel que reçu
 * (voir apps/api/src/blog.js pour la raison), et l'équipe peut aussi le
 * modifier dans le Studio. Tout ce qui s'affiche sur hgwf-cargo.fr passe donc
 * par ici. Garder sanitize-html à jour (failles corrigées en 2.17.6, 2.17.7,
 * 2.18.0 et 2.18.1).
 */
import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
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
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy', decoding: 'async' } }),
  },
};

export function nettoyerHtmlArticle(html: string | null | undefined): string {
  return sanitizeHtml(String(html ?? ''), OPTIONS);
}
