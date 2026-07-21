import { defineType, defineField } from 'sanity';

export const pageContact = defineType({
  name: 'pageContact',
  title: 'Page Contact',
  type: 'document',
  groups: [
    { name: 'hero', title: 'En-tête' },
    { name: 'coordonnees', title: 'Coordonnées' },
    { name: 'formulaire', title: 'Formulaire' },
    { name: 'centre', title: 'Centre logistique' },
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
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'coordonnees',
      title: 'Cartes de coordonnées',
      type: 'array',
      group: 'coordonnees',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'libelle', title: 'Libellé (E-mail, Marie…)', type: 'string' }),
            defineField({ name: 'valeur', title: 'Valeur affichée', type: 'string' }),
            defineField({
              name: 'type',
              title: 'Type',
              type: 'string',
              options: { list: ['email', 'tel'], layout: 'radio' },
              initialValue: 'tel',
            }),
          ],
          preview: { select: { title: 'libelle', subtitle: 'valeur' } },
        },
      ],
    }),

    defineField({
      name: 'formulaire',
      title: 'Formulaire',
      type: 'object',
      group: 'formulaire',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'placeholderNom', title: 'Placeholder nom', type: 'string' }),
        defineField({ name: 'placeholderTel', title: 'Placeholder téléphone', type: 'string' }),
        defineField({ name: 'placeholderEmail', title: 'Placeholder e-mail', type: 'string' }),
        defineField({ name: 'placeholderMessage', title: 'Placeholder message', type: 'text', rows: 2 }),
        defineField({
          name: 'sujets',
          title: 'Sujets proposés',
          type: 'array',
          of: [{ type: 'string' }],
        }),
        defineField({ name: 'boutonEnvoyer', title: 'Bouton envoyer', type: 'string' }),
        defineField({ name: 'confirmationTitre', title: 'Confirmation — titre', type: 'string' }),
        defineField({
          name: 'confirmationTexte',
          title: 'Confirmation — texte',
          description: '{nom} sera remplacé par le nom saisi dans le formulaire.',
          type: 'text',
          rows: 2,
        }),
        defineField({ name: 'boutonReinitialiser', title: 'Bouton nouveau message', type: 'string' }),
      ],
    }),

    defineField({
      name: 'centre',
      title: 'Centre logistique',
      type: 'object',
      group: 'centre',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 3 }),
        defineField({ name: 'adresse', title: 'Adresse (une ligne par ligne affichée)', type: 'text', rows: 2 }),
        defineField({ name: 'noteFaq', title: 'Note avant le lien FAQ', type: 'string' }),
        defineField({ name: 'noteFaqLien', title: 'Texte du lien FAQ', type: 'string' }),
        defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2, group: 'seo' }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language', media: 'hero.image' } },
});
