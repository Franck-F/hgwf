import { defineType, defineField } from 'sanity';

export const temoignages = defineType({
  name: 'temoignagesBloc',
  title: 'Bloc témoignages',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Témoignages',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'temoignage' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc témoignages' }) },
});
