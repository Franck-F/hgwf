import { defineType, defineField } from 'sanity';

export const pageMentions = defineType({
  name: 'pageMentions',
  title: 'Page Mentions légales',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre interne', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
    defineField({ name: 'titrePage', title: 'Titre affiché', type: 'string' }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'titre', title: 'Titre', type: 'string' }),
            defineField({
              name: 'corps',
              title: 'Contenu (une ligne par ligne affichée)',
              type: 'text',
              rows: 4,
            }),
          ],
          preview: { select: { title: 'titre' } },
        },
      ],
    }),
    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2 }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
