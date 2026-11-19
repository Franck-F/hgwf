import { defineType, defineField } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons';

/**
 * Article de blog. Les articles arrivent de BabyLoveGrowth par le webhook de
 * l'API (`/api/blog-article`) et sont publiés sur /<langue>/blog/<slug>/ à la
 * construction suivante du site. Le contenu est du HTML déjà nettoyé par l'API.
 *
 * Retoucher un article ici : cocher « Ne plus mettre à jour depuis
 * BabyLoveGrowth », sinon une nouvelle version envoyée par le service écrase
 * les retouches.
 */
export const article = defineType({
  name: 'article',
  title: 'Article de blog',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'contenu', title: 'Contenu', default: true },
    { name: 'referencement', title: 'Référencement' },
    { name: 'source', title: 'Origine' },
  ],
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string', group: 'contenu', validation: (r) => r.required().max(200) }),
    defineField({
      name: 'slug',
      title: 'Adresse (slug)',
      type: 'slug',
      group: 'contenu',
      description: 'L’article est publié sur hgwf-cargo.fr/<langue>/blog/<slug>/. Changer le slug change l’adresse.',
      options: { source: 'titre', maxLength: 120 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'langue',
      title: 'Langue',
      type: 'string',
      group: 'contenu',
      options: { list: [{ title: 'Français', value: 'fr' }, { title: 'Anglais', value: 'en' }], layout: 'radio', direction: 'horizontal' },
      initialValue: 'fr',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'publieLe', title: 'Date de publication', type: 'datetime', group: 'contenu', validation: (r) => r.required() }),
    defineField({
      name: 'imagePrincipale',
      title: 'Image principale',
      type: 'image',
      group: 'contenu',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Texte alternatif', type: 'string' })],
    }),
    defineField({
      name: 'contenuHtml',
      title: 'Contenu (HTML)',
      type: 'text',
      group: 'contenu',
      rows: 24,
      description: 'HTML de l’article. Les balises script, style, iframe et les attributs d’événement sont retirés à la réception.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'verrouille',
      title: 'Ne plus mettre à jour depuis BabyLoveGrowth',
      type: 'boolean',
      group: 'contenu',
      description: 'À cocher après une retouche ici : une nouvelle version envoyée par BabyLoveGrowth ne l’écrasera plus.',
      initialValue: false,
    }),
    defineField({ name: 'description', title: 'Description (balise meta)', type: 'text', rows: 3, group: 'referencement', validation: (r) => r.max(320) }),
    defineField({ name: 'motsCles', title: 'Mots-clés', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' }, group: 'referencement' }),
    defineField({ name: 'jsonLd', title: 'Données structurées (JSON-LD)', type: 'text', rows: 6, group: 'referencement' }),
    defineField({ name: 'faqJsonLd', title: 'FAQ structurée (JSON-LD)', type: 'text', rows: 6, group: 'referencement' }),
    defineField({
      name: 'source',
      title: 'Origine',
      type: 'object',
      group: 'source',
      readOnly: true,
      fields: [
        defineField({ name: 'service', title: 'Service', type: 'string' }),
        defineField({ name: 'idExterne', title: 'Identifiant chez le service', type: 'string' }),
        defineField({ name: 'imageUrl', title: 'Image d’origine', type: 'url' }),
        defineField({ name: 'recuLe', title: 'Reçu le', type: 'datetime' }),
      ],
    }),
  ],
  orderings: [{ title: 'Plus récents', name: 'publieLeDesc', by: [{ field: 'publieLe', direction: 'desc' }] }],
  preview: {
    select: { title: 'titre', langue: 'langue', date: 'publieLe', media: 'imagePrincipale' },
    prepare: ({ title, langue, date, media }) => ({
      title,
      subtitle: [String(langue ?? '').toUpperCase(), date ? new Date(date).toLocaleDateString('fr-FR') : ''].filter(Boolean).join(' · '),
      media,
    }),
  },
});
