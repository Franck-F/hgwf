import { defineType, defineField } from 'sanity';

export const pageLegale = defineType({
  name: 'pageLegale',
  title: 'Page légale',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre interne', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Identifiant de page',
      type: 'slug',
      options: { source: 'titre' },
      description: 'mentions-legales, confidentialite ou cgv — doit correspondre à la route du site.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
    defineField({ name: 'titrePage', title: 'Titre affiché', type: 'string' }),
    defineField({ name: 'chapo', title: 'Préambule', type: 'text', rows: 3 }),
    defineField({
      name: 'dateMaj',
      title: 'Dernière mise à jour',
      type: 'date',
      description: 'Affichée en haut de page. À changer à chaque modification du texte.',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'ancre',
              title: 'Ancre',
              type: 'slug',
              options: { source: 'titre' },
              description: 'Permet de lier directement cette section (ex. #cookies).',
            }),
            defineField({ name: 'corps', title: 'Contenu', type: 'array', of: [{ type: 'block' }] }),
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
