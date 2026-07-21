// Fabriques de blocs Portable Text, pour écrire les contenus légaux par défaut
// sans les noyer sous les `_type` et `children`.

export type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
export type MarkDef = { _type: 'link'; _key: string; href: string };
export type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h3';
  listItem?: 'bullet' | 'number';
  level?: number;
  children: Span[];
  markDefs: MarkDef[];
};
export type Lien = { texte: string; href: string };

let compteur = 0;
const cle = (prefixe: string) => `${prefixe}-${(compteur += 1).toString(36)}`;

export function lien(texte: string, href: string): Lien {
  return { texte, href };
}

function bloc(style: Bloc['style'], parts: (string | Lien)[], listItem?: Bloc['listItem']): Bloc {
  const markDefs: MarkDef[] = [];
  const children = parts.map((part) => {
    if (typeof part === 'string') return { _type: 'span' as const, _key: cle('s'), text: part, marks: [] };
    const def: MarkDef = { _type: 'link', _key: cle('m'), href: part.href };
    markDefs.push(def);
    return { _type: 'span' as const, _key: cle('s'), text: part.texte, marks: [def._key] };
  });
  return {
    _type: 'block',
    _key: cle('b'),
    style,
    ...(listItem ? { listItem, level: 1 } : {}),
    children,
    markDefs,
  };
}

export const p = (...parts: (string | Lien)[]): Bloc => bloc('normal', parts);
export const titre3 = (texte: string): Bloc => bloc('h3', [texte]);
export const liste = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'bullet'));
export const listeNum = (...items: string[]): Bloc[] => items.map((i) => bloc('normal', [i], 'number'));
