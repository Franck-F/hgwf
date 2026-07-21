import type { ContenuLegal, SectionLegale } from '@/components/legal/PageLegale';
import type { PageLegaleData } from '@/sanity/queries';
import type { Bloc } from '@/components/legal/portable';

function ancrer(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Une section Sanity sans corps ne doit jamais s'afficher : c'est la règle qui
// garantit qu'une donnée légale non renseignée reste absente plutôt que fausse.
function sectionsUtiles(data: PageLegaleData | null): SectionLegale[] {
  const brutes = data?.sections ?? [];
  return brutes
    .filter((s) => s?.titre && Array.isArray(s.corps) && s.corps.length > 0)
    .map((s) => ({
      titre: s.titre as string,
      ancre: s.ancre || ancrer(s.titre as string),
      corps: s.corps as Bloc[],
    }));
}

export function fusionner(defaut: ContenuLegal, data: PageLegaleData | null): ContenuLegal {
  const sections = sectionsUtiles(data);
  return {
    eyebrow: data?.eyebrow || defaut.eyebrow,
    titrePage: data?.titrePage || defaut.titrePage,
    chapo: data?.chapo || defaut.chapo,
    dateMaj: data?.dateMaj || defaut.dateMaj,
    sections: sections.length > 0 ? sections : defaut.sections,
  };
}
