import { defineType, defineField } from 'sanity';

export const rotation = defineType({
  name: 'rotation',
  title: 'Rotation maritime',
  type: 'document',
  fields: [
    defineField({ name: 'nom', title: 'Rotation', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'cloture', title: 'Clôture (JJ/MM)', type: 'string' }),
    defineField({ name: 'depart', title: 'Départ (JJ/MM)', type: 'string' }),
    defineField({
      name: 'remplissage',
      title: 'Remplissage (%)',
      type: 'number',
      validation: (r) => r.min(0).max(100),
    }),
  ],
  preview: {
    select: { title: 'nom', cloture: 'cloture', remplissage: 'remplissage' },
    prepare: ({ title, cloture, remplissage }) => ({
      title,
      subtitle: `Clôture ${cloture ?? '—'} · ${remplissage ?? 0} %`,
    }),
  },
});
