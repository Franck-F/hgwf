import { defineType, defineField } from 'sanity';

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({ name: 'resume', title: 'Résumé', type: 'text', rows: 3 }),
    defineField({ name: 'icone', title: 'Icône', type: 'image' }),
    defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
