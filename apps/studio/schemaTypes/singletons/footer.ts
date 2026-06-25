import { defineType, defineField } from 'sanity';

export const footer = defineType({
  name: 'footer',
  title: 'Pied de page',
  type: 'document',
  fields: [
    defineField({ name: 'texteFr', title: 'Texte FR', type: 'text', rows: 2 }),
    defineField({ name: 'texteEn', title: 'Texte EN', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Pied de page' }) },
});
