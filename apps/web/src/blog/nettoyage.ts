/**
 * Nettoyage du HTML d'un article au moment de la construction du site (code
 * serveur uniquement : rien de ceci n'est envoyé au navigateur).
 *
 * L'API nettoie déjà le HTML reçu de BabyLoveGrowth. On recommence ici parce
 * que le contenu peut ensuite être modifié dans le Studio : un compte Sanity
 * compromis ne doit pas pouvoir injecter de script sur hgwf-cargo.fr. Même
 * liste blanche que apps/api/src/blog.js.
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
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
  },
};

export function nettoyerHtmlArticle(html: string | null | undefined): string {
  return sanitizeHtml(String(html ?? ''), OPTIONS);
}
