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

/**
 * BabyLoveGrowth répète en tête du contenu le titre (<h1>) et l'image
 * principale, que la page affiche déjà dans son en-tête. On retire ce premier
 * <h1> et l'image dont l'adresse est celle de l'image principale reçue
 * (`source.imageUrl`). Fait sur le HTML brut, AVANT le nettoyage, qui reste la
 * seule barrière de sécurité.
 */
export function retirerEnTeteDoublon(html: string, imagePrincipaleSource: string | null): string {
  let sortie = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  if (imagePrincipaleSource) {
    // L'image principale reçue est réutilisée telle quelle dans le contenu
    // (souvent dans un <p>) : on retire la balise qui pointe exactement dessus.
    const echappee = imagePrincipaleSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sortie = sortie.replace(new RegExp(`<img\\b[^>]*\\bsrc=["']${echappee}["'][^>]*>`, 'i'), '');
  }
  return sortie;
}

export function nettoyerHtmlArticle(html: string | null | undefined, imagePrincipaleSource: string | null = null): string {
  return sanitizeHtml(retirerEnTeteDoublon(String(html ?? ''), imagePrincipaleSource), {
    ...OPTIONS,
    // Un paragraphe vidé (l'image retirée) laisserait un trou.
    exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && frame.mediaChildren.length === 0,
  });
}
