import { defineType, defineField } from 'sanity';

export const profil = defineType({
  name: 'profil',
  title: 'Profil / persona',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({ name: 'accroche', title: 'Accroche', type: 'text', rows: 2 }),
    defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
