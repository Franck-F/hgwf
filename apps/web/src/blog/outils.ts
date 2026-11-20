/**
 * Petites fonctions du blog, pures et testées : textes, dates, données
 * structurées. Les articles arrivent de BabyLoveGrowth (webhook de l'API), leur
 * HTML est déjà nettoyé à la réception.
 */
import type { Locale } from '@hgwf/shared';

export const TEXTES_BLOG = {
  fr: {
    eyebrow: 'Conseils & actualités',
    titre: 'Le blog HGWF Cargo',
    description:
      'Conseils pratiques pour expédier vers les Antilles, la Guyane, Haïti, l’Afrique et le reste du monde : groupage, conteneurs, véhicules, formalités et délais.',
    vide: 'Les premiers articles arrivent très bientôt.',
    lire: 'Lire l’article',
    retour: 'Tous les articles',
    publieLe: 'Publié le',
    appelTitre: 'Un envoi à préparer ?',
    appelTexte: 'Décrivez votre envoi en deux minutes : l’équipe vous répond avec un devis sous 24 heures ouvrées.',
    appelBouton: 'Demander un devis',
    lienPied: 'Conseils & actualités',
    seoTitre: 'Blog : conseils pour vos envois maritimes et aériens · HGWF Cargo',
    seoDescription:
      'Conseils pratiques d’HGWF Cargo pour expédier un colis, un véhicule ou un déménagement vers l’Outre-mer et l’international.',
  },
  en: {
    eyebrow: 'Tips & news',
    titre: 'The HGWF Cargo blog',
    description:
      'Practical advice for shipping to the Caribbean, French Guiana, Haiti, Africa and worldwide: groupage, containers, vehicles, paperwork and transit times.',
    vide: 'The first articles are coming soon.',
    lire: 'Read the article',
    retour: 'All articles',
    publieLe: 'Published on',
    appelTitre: 'Got a shipment to prepare?',
    appelTexte: 'Describe your shipment in two minutes: our team replies with a quote within one business day.',
    appelBouton: 'Request a quote',
    lienPied: 'Blog',
    seoTitre: 'Blog: tips for your sea and air shipments · HGWF Cargo',
    seoDescription: 'Practical advice from HGWF Cargo for shipping parcels, vehicles and household moves overseas.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

type LienMenu = { libelle: string; href: string };

/** Menu du haut : ajoute « Blog » avant « Nous contacter » (sinon en dernier), sans doublon. */
export function avecBlog(liens: LienMenu[], ilYADesArticles: boolean): LienMenu[] {
  const chemin = (h: string) => h.replace(/\/$/, '');
  if (!ilYADesArticles || liens.some((l) => chemin(l.href) === '/blog')) return liens;
  const blog = { libelle: 'Blog', href: '/blog' };
  const contact = liens.findIndex((l) => chemin(l.href) === '/contact');
  return contact === -1 ? [...liens, blog] : [...liens.slice(0, contact), blog, ...liens.slice(contact)];
}

/** « 19 novembre 2026 » / « November 19, 2026 » ; chaîne vide si la date est illisible. */
export function dateLisible(locale: Locale, iso: string | null | undefined): string {
  const d = new Date(iso ?? '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
}

/**
 * Données structurées « BlogPosting » construites depuis l'article, quand
 * BabyLoveGrowth n'en envoie pas. Rattachées à la fiche entreprise du site
 * (`#organisation`, voir components/DonneesStructurees.tsx).
 */
export function jsonLdArticle(a: {
  locale: Locale;
  slug: string;
  titre: string;
  description: string | null;
  publieLe: string;
  imageUrl: string | null;
}): string {
  const site = 'https://hgwf-cargo.fr';
  const url = `${site}/${a.locale}/blog/${a.slug}/`;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titre,
    ...(a.description ? { description: a.description } : {}),
    datePublished: a.publieLe,
    inLanguage: a.locale === 'en' ? 'en' : 'fr',
    ...(a.imageUrl ? { image: a.imageUrl } : {}),
    url,
    mainEntityOfPage: url,
    author: { '@id': `${site}/#organisation` },
    publisher: { '@id': `${site}/#organisation` },
  }).replace(/</g, '\\u003c');
}

/**
 * JSON-LD prêt à injecter dans une balise <script> : relu, réécrit, et sans
 * « < » (un « </script> » dans une valeur fermerait la balise). Null si le
 * texte n'est pas un objet JSON.
 */
export function jsonLdInjectable(texte: string | null | undefined): string | null {
  if (!texte) return null;
  try {
    const objet: unknown = JSON.parse(texte);
    if (!objet || typeof objet !== 'object') return null;
    return JSON.stringify(objet).replace(/</g, '\\u003c');
  } catch {
    return null;
  }
}
