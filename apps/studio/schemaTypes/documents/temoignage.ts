import { defineType, defineField } from 'sanity';

export const temoignage = defineType({
  name: 'temoignage',
  title: 'Témoignage',
  type: 'document',
  fields: [
    defineField({ name: 'auteur', title: 'Auteur', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', title: 'Rôle / profil', type: 'string' }),
    defineField({ name: 'citation', title: 'Citation', type: 'text', rows: 3 }),
    defineField({ name: 'note', title: 'Note (1-5)', type: 'number', validation: (r) => r.min(1).max(5) }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'auteur', subtitle: 'role' } },
});
