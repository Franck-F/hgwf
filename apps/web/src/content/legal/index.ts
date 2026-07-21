import type { Locale } from '@hgwf/shared';
import type { ContenuLegal } from '@/components/legal/PageLegale';
import { MENTIONS_FR } from './mentions';

export type SlugLegal = 'mentions-legales' | 'confidentialite' | 'cgv';

const CONTENUS: Record<SlugLegal, Partial<Record<Locale, ContenuLegal>> & { fr: ContenuLegal }> = {
  'mentions-legales': { fr: MENTIONS_FR },
  confidentialite: { fr: MENTIONS_FR }, // remplacé en tâche 6
  cgv: { fr: MENTIONS_FR }, // remplacé en tâche 7
};

// Repli sur le français quand une traduction n'existe pas : c'est le cas voulu
// pour les CGV, dont seule la version française fait foi.
export function contenuLegal(slug: SlugLegal, locale: Locale): ContenuLegal {
  const entree = CONTENUS[slug];
  return entree[locale] ?? entree.fr;
}
