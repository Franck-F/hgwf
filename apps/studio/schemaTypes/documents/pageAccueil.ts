import { defineType, defineField } from 'sanity';

export const pageAccueil = defineType({
  name: 'pageAccueil',
  title: 'Page Accueil',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'services', title: 'Services' },
    { name: 'zones', title: 'Destinations' },
    { name: 'demenagement', title: 'Déménagement' },
    { name: 'delais', title: 'Délais' },
    { name: 'conteneurs', title: 'Conteneurs' },
    { name: 'faq', title: 'FAQ courte' },
    { name: 'ctaSuivi', title: 'Bandeau suivi' },
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
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (doré)', type: 'string' }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
        defineField({ name: 'boutonPrincipal', title: 'Bouton principal', type: 'string' }),
        defineField({ name: 'boutonPrincipalLien', title: 'Lien du bouton principal', type: 'string' }),
        defineField({ name: 'boutonSecondaire', title: 'Bouton secondaire', type: 'string' }),
        defineField({ name: 'boutonSecondaireLien', title: 'Lien du bouton secondaire', type: 'string' }),
        defineField({ name: 'badge', title: 'Badge (mono)', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'services',
      title: 'Cartes services (4)',
      type: 'array',
      group: 'services',
      validation: (r) => r.max(4),
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'titre', title: 'Titre', type: 'string' }),
            defineField({ name: 'texte', title: 'Texte', type: 'string' }),
            defineField({ name: 'lien', title: 'Lien', type: 'string' }),
            defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
          ],
          preview: { select: { title: 'titre', media: 'image' } },
        },
      ],
    }),

    defineField({
      name: 'promesse',
      title: 'Promesse (titre central)',
      type: 'object',
      group: 'services',
      fields: [
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 3 }),
      ],
    }),

    defineField({
      name: 'zones',
      title: 'Destinations',
      type: 'object',
      group: 'zones',
      fields: [
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (doré)', type: 'string' }),
        defineField({ name: 'badge', title: 'Badge (mono)', type: 'string' }),
        defineField({ name: 'bouton', title: 'Bouton', type: 'string' }),
        defineField({ name: 'boutonLien', title: 'Lien du bouton', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
        defineField({
          name: 'cartes',
          title: 'Cartes zones',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({ name: 'titre', title: 'Titre', type: 'string' }),
                defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 2 }),
              ],
              preview: { select: { title: 'titre' } },
            },
          ],
        }),
      ],
    }),

    defineField({
      name: 'demenagement',
      title: 'Déménagement',
      type: 'object',
      group: 'demenagement',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({ name: 'titreFin', title: 'Fin du titre (après le mot accentué)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 3 }),
        defineField({ name: 'points', title: 'Points (checklist)', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'bouton', title: 'Bouton', type: 'string' }),
        defineField({ name: 'boutonLien', title: 'Lien du bouton', type: 'string' }),
        defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
        defineField({ name: 'badgeValeur', title: 'Badge — valeur (mono)', type: 'string' }),
        defineField({ name: 'badgeTexte', title: 'Badge — texte', type: 'string' }),
      ],
    }),

    defineField({
      name: 'delais',
      title: 'Délais',
      type: 'object',
      group: 'delais',
      fields: [
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 3 }),
        defineField({ name: 'lienFaq', title: 'Texte du lien FAQ', type: 'string' }),
        defineField({
          name: 'barres',
          title: 'Barres de délais',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({ name: 'destination', title: 'Destination', type: 'string' }),
                defineField({ name: 'delai', title: 'Délai (mono)', type: 'string' }),
                defineField({
                  name: 'pourcentage',
                  title: 'Remplissage (%)',
                  type: 'number',
                  validation: (r) => r.min(0).max(100),
                }),
                defineField({
                  name: 'couleur',
                  title: 'Couleur',
                  type: 'string',
                  options: { list: ['corail', 'ciel', 'or', 'marine'] },
                  initialValue: 'ciel',
                }),
              ],
              preview: { select: { title: 'destination', subtitle: 'delai' } },
            },
          ],
        }),
      ],
    }),

    defineField({
      name: 'conteneurs',
      title: 'Conteneurs « dernier voyage »',
      type: 'object',
      group: 'conteneurs',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 3 }),
        defineField({ name: 'chips', title: 'Pastilles (mono)', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'bouton', title: 'Bouton', type: 'string' }),
        defineField({ name: 'boutonLien', title: 'Lien du bouton', type: 'string' }),
        defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'faqCourte',
      title: 'FAQ courte',
      type: 'object',
      group: 'faq',
      fields: [
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte (avant le lien)', type: 'string' }),
        defineField({ name: 'lienTexte', title: 'Texte du lien FAQ', type: 'string' }),
        defineField({ name: 'bouton', title: 'Bouton', type: 'string' }),
        defineField({
          name: 'items',
          title: 'Questions (versions courtes)',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({ name: 'question', title: 'Question', type: 'string' }),
                defineField({ name: 'reponse', title: 'Réponse', type: 'text', rows: 3 }),
              ],
              preview: { select: { title: 'question' } },
            },
          ],
        }),
      ],
    }),

    defineField({
      name: 'ctaSuivi',
      title: 'Bandeau suivi',
      type: 'object',
      group: 'ctaSuivi',
      fields: [
        defineField({ name: 'eyebrow', title: 'Sur-titre', type: 'string' }),
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (doré)', type: 'string' }),
        defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 2 }),
        defineField({ name: 'boutonPrincipal', title: 'Bouton principal', type: 'string' }),
        defineField({ name: 'boutonSecondaire', title: 'Bouton secondaire', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2, group: 'seo' }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language', media: 'hero.image' } },
});
