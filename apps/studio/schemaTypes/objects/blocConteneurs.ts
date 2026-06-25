import { defineType, defineField } from 'sanity';

export const blocConteneurs = defineType({
  name: 'blocConteneurs',
  title: 'Bloc vente de conteneurs',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({
      name: 'formats',
      title: 'Formats disponibles',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: ['20 pieds', '40 pieds'] },
    }),
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
  ],
  preview: { prepare: () => ({ title: 'Bloc conteneurs' }) },
});
