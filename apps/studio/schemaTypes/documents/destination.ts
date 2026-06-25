import { defineType, defineField } from 'sanity';

export const destination = defineType({
  name: 'destination',
  title: 'Destination',
  type: 'document',
  fields: [
    defineField({ name: 'nom', title: 'Nom', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'nom' }, validation: (r) => r.required() }),
    defineField({
      name: 'zone',
      title: 'Zone',
      type: 'string',
      options: { list: ['Pacifique', 'Caraïbes & Guyane', 'Afrique & Océan Indien'] },
    }),
    defineField({ name: 'delaiMoyen', title: 'Délai moyen', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'nom', subtitle: 'language' } },
});
