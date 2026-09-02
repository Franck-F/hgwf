import type { Locale } from '@hgwf/shared';
import type { ContenuLegal } from '@/components/legal/PageLegale';
import { MENTIONS_FR } from './mentions';
import { MENTIONS_EN } from './mentions.en';
import { CONFIDENTIALITE_FR } from './confidentialite';
import { CONFIDENTIALITE_EN } from './confidentialite.en';
import { CGV_FR } from './cgv';
import { CGV_EN } from './cgv.en';

export type SlugLegal = 'mentions-legales' | 'confidentialite' | 'cgv';

const CONTENUS: Record<SlugLegal, Partial<Record<Locale, ContenuLegal>> & { fr: ContenuLegal }> = {
  'mentions-legales': { fr: MENTIONS_FR, en: MENTIONS_EN },
  confidentialite: { fr: CONFIDENTIALITE_FR, en: CONFIDENTIALITE_EN },
  cgv: { fr: CGV_FR, en: CGV_EN },
};

// Repli sur le français quand une traduction n'existe pas. Les CGV anglaises
// sont une traduction de courtoisie : seule la version française fait foi
// (rappelé dans leur chapo et leur dernière section).
export function contenuLegal(slug: SlugLegal, locale: Locale): ContenuLegal {
  const entree = CONTENUS[slug];
  return entree[locale] ?? entree.fr;
}
