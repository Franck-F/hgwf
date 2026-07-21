import { defineType, defineField } from 'sanity';

export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question', title: 'Question', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'reponse', title: 'Réponse', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'categorie',
      title: 'Catégorie',
      type: 'string',
      options: {
        list: [
          { title: 'Expéditions', value: 'expeditions' },
          { title: 'Tarifs & délais', value: 'tarifs' },
          { title: 'Conteneurs d’occasion', value: 'conteneurs' },
        ],
      },
      initialValue: 'expeditions',
    }),
    defineField({
      name: 'ordre',
      title: 'Ordre d’affichage',
      type: 'number',
      description: 'Les questions sont triées par ordre croissant dans leur catégorie.',
    }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  orderings: [
    {
      title: 'Catégorie puis ordre',
      name: 'categorieOrdre',
      by: [
        { field: 'categorie', direction: 'asc' },
        { field: 'ordre', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'question', categorie: 'categorie', ordre: 'ordre' },
    prepare: ({ title, categorie, ordre }) => {
      const libelles: Record<string, string> = {
        expeditions: 'Expéditions',
        tarifs: 'Tarifs & délais',
        conteneurs: 'Conteneurs d’occasion',
      };
      return {
        title,
        subtitle: `${libelles[categorie as string] ?? categorie ?? ''}${ordre != null ? ` · n°${ordre}` : ''}`,
      };
    },
  },
});
