import { defineType, defineField } from 'sanity';

export const bandeauCTA = defineType({
  name: 'bandeauCTA',
  title: 'Bandeau CTA',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'texteBouton', title: 'Texte du bouton', type: 'string' }),
    defineField({ name: 'lien', title: 'Lien', type: 'string' }),
  ],
  preview: { select: { title: 'titre' }, prepare: ({ title }) => ({ title: `CTA — ${title ?? ''}` }) },
});
