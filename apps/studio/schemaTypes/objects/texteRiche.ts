import { defineType } from 'sanity';

export const texteRiche = defineType({
  name: 'texteRiche',
  title: 'Texte riche',
  type: 'object',
  fields: [{ name: 'contenu', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }],
  preview: { prepare: () => ({ title: 'Texte riche' }) },
});
