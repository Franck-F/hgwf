import { defineType, defineField } from 'sanity';

export const pageDevis = defineType({
  name: 'pageDevis',
  title: 'Page Demande de devis',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'parcours', title: 'Parcours (4 étapes)' },
    { name: 'donnees', title: 'Types / destinations' },
    { name: 'reassurance', title: 'Réassurance' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'titre', title: 'Titre interne', type: 'string', validation: (r) => r.required() }),

    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (doré)', type: 'string' }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'etapeLabels',
      title: 'Libellés des 4 étapes',
      type: 'array',
      group: 'parcours',
      validation: (r) => r.length(4),
      of: [{ type: 'string' }],
    }),

    defineField({
      name: 'etapeType',
      title: 'Étape 1 — Type d’envoi',
      type: 'object',
      group: 'parcours',
      fields: [defineField({ name: 'titre', title: 'Titre', type: 'string' })],
    }),

    defineField({
      name: 'etapeDestination',
      title: 'Étape 2 — Destination',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'libelleDestination', title: 'Libellé du champ destination', type: 'string' }),
        defineField({ name: 'libelleDepart', title: 'Libellé du champ départ', type: 'string' }),
        defineField({ name: 'libelleDelai', title: 'Libellé du délai moyen', type: 'string' }),
      ],
    }),

    defineField({
      name: 'etapeVolume',
      title: 'Étape 3 — Volume',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte d’aide', type: 'text', rows: 2 }),
        defineField({ name: 'boutonAjouter', title: 'Bouton ajouter un colis', type: 'string' }),
      ],
    }),

    defineField({
      name: 'etapeCoordonnees',
      title: 'Étape 4 — Coordonnées',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'placeholderNom', title: 'Placeholder nom', type: 'string' }),
        defineField({ name: 'placeholderEmail', title: 'Placeholder e-mail', type: 'string' }),
        defineField({ name: 'placeholderTel', title: 'Placeholder téléphone', type: 'string' }),
        defineField({ name: 'placeholderMessage', title: 'Placeholder message', type: 'text', rows: 2 }),
      ],
    }),

    defineField({
      name: 'recap',
      title: 'Récapitulatif (colonne visuelle)',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'libelleType', title: 'Libellé type', type: 'string' }),
        defineField({ name: 'libelleDestination', title: 'Libellé destination', type: 'string' }),
        defineField({ name: 'libelleDepart', title: 'Libellé départ', type: 'string' }),
        defineField({ name: 'libelleVolume', title: 'Libellé volume', type: 'string' }),
      ],
    }),

    defineField({
      name: 'confirmation',
      title: 'Confirmation',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte ({nom} = prénom saisi)', type: 'text', rows: 3 }),
        defineField({ name: 'boutonContact', title: 'Bouton contact', type: 'string' }),
        defineField({ name: 'boutonAccueil', title: 'Bouton accueil', type: 'string' }),
      ],
    }),

    defineField({
      name: 'boutons',
      title: 'Boutons de navigation',
      type: 'object',
      group: 'parcours',
      fields: [
        defineField({ name: 'precedent', title: 'Précédent', type: 'string' }),
        defineField({ name: 'suivant', title: 'Suivant', type: 'string' }),
        defineField({ name: 'envoyer', title: 'Envoyer', type: 'string' }),
      ],
    }),

    defineField({
      name: 'typesEnvoi',
      title: 'Types d’envoi',
      type: 'array',
      group: 'donnees',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Libellé', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'label' } },
        },
      ],
    }),

    defineField({
      name: 'destinations',
      title: 'Destinations proposées',
      type: 'array',
      group: 'donnees',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'nom', title: 'Nom', type: 'string' }),
            defineField({ name: 'delai', title: 'Délai moyen (majuscules)', type: 'string' }),
          ],
          preview: { select: { title: 'nom', subtitle: 'delai' } },
        },
      ],
    }),

    defineField({
      name: 'portsDepart',
      title: 'Points de départ proposés',
      type: 'array',
      group: 'donnees',
      of: [{ type: 'string' }],
    }),

    defineField({
      name: 'imagesEtapes',
      title: 'Images des 4 étapes (colonne visuelle)',
      type: 'array',
      group: 'parcours',
      validation: (r) => r.max(4),
      of: [{ type: 'image', options: { hotspot: true } }],
    }),

    defineField({
      name: 'reassurance',
      title: 'Cartes de réassurance',
      type: 'array',
      group: 'reassurance',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'valeur', title: 'Valeur (mono, colorée)', type: 'string' }),
            defineField({ name: 'titre', title: 'Titre', type: 'string' }),
            defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'titre', subtitle: 'valeur' } },
        },
      ],
    }),

    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2, group: 'seo' }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language', media: 'hero.image' } },
});
