import { defineType, defineField } from 'sanity';

export const blocServices = defineType({
  name: 'blocServices',
  title: 'Bloc services',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre de section', type: 'string' }),
    defineField({
      name: 'services',
      title: 'Services mis en avant',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc services' }) },
});
