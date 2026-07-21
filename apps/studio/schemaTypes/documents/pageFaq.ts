import { defineType, defineField } from 'sanity';

export const pageFaq = defineType({
  name: 'pageFaq',
  title: 'Page FAQ',
  type: 'document',
  groups: [
    { name: 'hero', title: 'En-tête' },
    { name: 'categories', title: 'Catégories' },
    { name: 'cta', title: 'CTA' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'titre', title: 'Titre interne', type: 'string', validation: (r) => r.required() }),

    defineField({
      name: 'hero',
      title: 'En-tête',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'description', title: 'Description (avant le lien contact)', type: 'text', rows: 2 }),
        defineField({ name: 'lienContact', title: 'Texte du lien contact', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'categories',
      title: 'Catégories (ordre et titres des sections)',
      type: 'array',
      group: 'categories',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'cle',
              title: 'Clé (doit correspondre à la catégorie des questions)',
              type: 'string',
              options: {
                list: [
                  { title: 'Expéditions', value: 'expeditions' },
                  { title: 'Tarifs & délais', value: 'tarifs' },
                  { title: 'Conteneurs d’occasion', value: 'conteneurs' },
                ],
              },
            }),
            defineField({ name: 'titre', title: 'Titre affiché', type: 'string' }),
          ],
          preview: { select: { title: 'titre', subtitle: 'cle' } },
        },
      ],
    }),

    defineField({
      name: 'cta',
      title: 'CTA',
      type: 'object',
      group: 'cta',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'sousTitre', title: 'Sous-titre (mono)', type: 'string' }),
        defineField({ name: 'bouton', title: 'Texte du bouton', type: 'string' }),
        defineField({ name: 'lien', title: 'Lien du bouton', type: 'string' }),
      ],
    }),

    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2, group: 'seo' }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language', media: 'hero.image' } },
});
