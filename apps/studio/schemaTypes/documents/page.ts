import { defineType, defineField } from 'sanity';

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'titre' }, validation: (r) => r.required() }),
    defineField({
      name: 'pageBuilder',
      title: 'Contenu de la page',
      type: 'array',
      of: [
        { type: 'hero' },
        { type: 'blocServices' },
        { type: 'blocDestinations' },
        { type: 'blocConteneurs' },
        { type: 'faqSection' },
        { type: 'temoignagesBloc' },
        { type: 'bandeauCTA' },
        { type: 'texteRiche' },
      ],
    }),
    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2 }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language' } },
});
