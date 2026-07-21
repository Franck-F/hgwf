import { defineType, defineField } from 'sanity';

export const pageSuivi = defineType({
  name: 'pageSuivi',
  title: 'Page Suivi',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'resultat', title: 'Carte résultat' },
    { name: 'demo', title: 'Démo suivi' },
    { name: 'voyage', title: 'Voyage en images' },
    { name: 'cta', title: 'Bandeau CTA' },
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
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
        defineField({ name: 'placeholderRecherche', title: 'Placeholder du champ de recherche', type: 'string' }),
        defineField({ name: 'boutonRecherche', title: 'Texte du bouton de recherche', type: 'string' }),
        defineField({ name: 'noteDemo', title: 'Note (données de démonstration)', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({
      name: 'resultat',
      title: 'Carte résultat — libellés',
      type: 'object',
      group: 'resultat',
      fields: [
        defineField({ name: 'libelleLatitude', title: 'Libellé latitude', type: 'string' }),
        defineField({ name: 'libelleLongitude', title: 'Libellé longitude', type: 'string' }),
        defineField({ name: 'libelleSignal', title: 'Libellé signal (horloge)', type: 'string' }),
        defineField({ name: 'cartePosition', title: 'Titre carte « Position »', type: 'string' }),
        defineField({ name: 'carteNavire', title: 'Titre carte « Navire »', type: 'string' }),
        defineField({ name: 'carteProgression', title: 'Titre carte « Progression »', type: 'string' }),
        defineField({ name: 'carteEta', title: 'Titre carte « ETA »', type: 'string' }),
        defineField({ name: 'noteContact', title: 'Note sous la carte', type: 'string' }),
        defineField({ name: 'noteContactLien', title: 'Texte du lien de la note', type: 'string' }),
        defineField({ name: 'positionAvantDepart', title: 'Position avant départ', type: 'string' }),
        defineField({ name: 'navireAttente', title: 'Navire — en attente d’embarquement', type: 'string' }),
        defineField({ name: 'suffixeDebarque', title: 'Navire — suffixe après débarquement', type: 'string' }),
        defineField({ name: 'libelleVitesse', title: 'Libellé vitesse (pastille)', type: 'string' }),
        defineField({ name: 'libelleCap', title: 'Libellé cap (pastille)', type: 'string' }),
      ],
    }),

    defineField({
      name: 'etapes',
      title: 'Les 5 étapes du suivi (jalons)',
      description: 'Dans l’ordre : prise en charge, au port, en mer, port d’arrivée, livré.',
      type: 'array',
      group: 'resultat',
      validation: (r) => r.length(5),
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'jalon', title: 'Libellé du jalon', type: 'string' }),
            defineField({ name: 'statut', title: 'Badge de statut (majuscules)', type: 'string' }),
            defineField({ name: 'position', title: 'Libellé de position en direct', type: 'string' }),
            defineField({ name: 'chipA', title: 'Pastille 1 (vide = vitesse)', type: 'string' }),
            defineField({ name: 'chipB', title: 'Pastille 2 (vide = cap)', type: 'string' }),
            defineField({
              name: 'image',
              title: 'Image représentative du statut',
              description: 'Affichée à la place du globe pour cette étape (sauf « En mer », qui garde le globe).',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: { select: { title: 'jalon', subtitle: 'statut', media: 'image' } },
        },
      ],
    }),

    defineField({
      name: 'portDepart',
      title: 'Port de départ',
      type: 'string',
      group: 'demo',
    }),

    defineField({
      name: 'trajetsDemo',
      title: 'Trajets de démonstration',
      description:
        'Le numéro saisi sélectionne un de ces trajets. Latitude/longitude en degrés décimaux (négatif = Sud / Ouest).',
      type: 'array',
      group: 'demo',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'destination', title: 'Destination (complète)', type: 'string' }),
            defineField({ name: 'destinationCourt', title: 'Destination (courte, majuscules)', type: 'string' }),
            defineField({ name: 'navire', title: 'Navire', type: 'string' }),
            defineField({ name: 'positionMer', title: 'Position en mer (texte)', type: 'string' }),
            defineField({ name: 'latMer', title: 'Latitude en mer', type: 'number' }),
            defineField({ name: 'lonMer', title: 'Longitude en mer', type: 'number' }),
            defineField({ name: 'latArrivee', title: 'Latitude du port d’arrivée', type: 'number' }),
            defineField({ name: 'lonArrivee', title: 'Longitude du port d’arrivée', type: 'number' }),
            defineField({ name: 'cap', title: 'Cap (degrés)', type: 'number' }),
          ],
          preview: { select: { title: 'destination', subtitle: 'navire' } },
        },
      ],
    }),

    defineField({
      name: 'voyage',
      title: 'Voyage en images',
      type: 'object',
      group: 'voyage',
      fields: [
        defineField({ name: 'titre', title: 'Titre (avant le mot accentué)', type: 'string' }),
        defineField({ name: 'titreAccent', title: 'Mot accentué (corail)', type: 'string' }),
        defineField({
          name: 'etapes',
          title: 'Étapes (3 cartes)',
          type: 'array',
          validation: (r) => r.max(3),
          of: [
            {
              type: 'object',
              fields: [
                defineField({ name: 'titre', title: 'Titre', type: 'string' }),
                defineField({ name: 'texte', title: 'Texte', type: 'text', rows: 2 }),
                defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
              ],
              preview: { select: { title: 'titre', media: 'image' } },
            },
          ],
        }),
      ],
    }),

    defineField({
      name: 'cta',
      title: 'Bandeau CTA',
      type: 'object',
      group: 'cta',
      fields: [
        defineField({ name: 'titre', title: 'Titre', type: 'string' }),
        defineField({ name: 'sousTitre', title: 'Sous-titre (mono)', type: 'string' }),
        defineField({ name: 'bouton', title: 'Texte du bouton', type: 'string' }),
        defineField({ name: 'lien', title: 'Lien du bouton', type: 'string' }),
        defineField({ name: 'image', title: 'Image de fond', type: 'image', options: { hotspot: true } }),
      ],
    }),

    defineField({ name: 'seoTitre', title: 'SEO — Title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO — Description', type: 'text', rows: 2, group: 'seo' }),
    defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
  ],
  preview: { select: { title: 'titre', subtitle: 'language', media: 'hero.image' } },
});
