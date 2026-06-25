import { defineType, defineField } from 'sanity';

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'sousTitre', title: 'Sous-titre', type: 'text', rows: 2 }),
    defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'cta', title: 'Texte du bouton', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'Lien du bouton', type: 'string' }),
  ],
  preview: { select: { title: 'titre' }, prepare: ({ title }) => ({ title: `Hero — ${title ?? ''}` }) },
});
