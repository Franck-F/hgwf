import { defineType, defineField } from 'sanity';

export const blocDestinations = defineType({
  name: 'blocDestinations',
  title: 'Bloc destinations',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre de section', type: 'string' }),
    defineField({
      name: 'destinations',
      title: 'Destinations mises en avant',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'destination' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Bloc destinations' }) },
});
