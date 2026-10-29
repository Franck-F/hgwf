import { defineType, defineField, defineArrayMember } from 'sanity';

// Fiche modèle d'un service (groupage, conteneur complet, véhicule…).
//
// La référence interne de l'équipe pour chiffrer et répondre : comment le prix
// se calcule, la grille, les délais, ce qui est compris ou non, les documents à
// réclamer, les pièges, et les textes types du devis. Elle vit dans le dataset
// privé « operations » : les tarifs ne sont jamais publiés.
//
// Elle sert aussi de seule source aux suggestions Gemini du back-office
// (apps/api/src/suggestion.js) : un prix absent de la grille n'est jamais
// inventé, la suggestion de montant revient vide avec la liste de ce qui manque.
// Remplir la grille, c'est donc ce qui rend la suggestion de montant utile.

const ligneTarif = defineArrayMember({
  type: 'object',
  name: 'ligneTarif',
  title: 'Ligne de tarif',
  fields: [
    defineField({ name: 'designation', title: 'Désignation', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'unite',
      title: 'Unité (ex. m³, conteneur, véhicule, kg, mois, envoi)',
      type: 'string',
    }),
    defineField({
      name: 'prixHT',
      title: 'Prix HT (€)',
      type: 'number',
      description: 'Vide tant que le tarif n’est pas arrêté : aucune suggestion de montant ne l’invente.',
      validation: (r) => r.min(0).precision(2),
    }),
    defineField({ name: 'note', title: 'Précision (destination, minimum, condition…)', type: 'string' }),
  ],
  preview: {
    select: { title: 'designation', unite: 'unite', prix: 'prixHT', note: 'note' },
    prepare: ({ title, unite, prix, note }) => ({
      title,
      subtitle: [
        typeof prix === 'number' ? `${prix} € HT${unite ? ` / ${unite}` : ''}` : `prix à compléter${unite ? ` (/ ${unite})` : ''}`,
        note,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});

const listeTextes = (name: string, title: string, description?: string) =>
  defineField({ name, title, description, type: 'array', of: [defineArrayMember({ type: 'string' })] });

export const ficheService = defineType({
  name: 'ficheService',
  title: 'Fiche service',
  type: 'document',
  fieldsets: [
    { name: 'tarifs', title: 'Tarification', options: { collapsible: true, collapsed: false } },
    { name: 'prestation', title: 'Contenu de la prestation', options: { collapsible: true, collapsed: false } },
    { name: 'modeles', title: 'Textes types du devis', options: { collapsible: true, collapsed: false } },
  ],
  fields: [
    defineField({ name: 'titre', title: 'Service', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'ordre', title: 'Ordre d’affichage', type: 'number' }),
    defineField({
      name: 'actif',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
      description: 'Une fiche inactive n’est plus proposée dans le back-office.',
    }),
    listeTextes(
      'libellesFormulaire',
      'Libellés reconnus',
      'Le « Type d’envoi » d’une demande est rattaché à cette fiche s’il correspond à l’un de ces libellés (formulaire du site en français et en anglais, sujet du formulaire de contact). Majuscules et accents ignorés.',
    ),
    defineField({ name: 'resume', title: 'En une phrase', type: 'text', rows: 2 }),

    defineField({
      name: 'methodeTarif',
      title: 'Comment le prix se calcule',
      type: 'text',
      rows: 3,
      fieldset: 'tarifs',
    }),
    defineField({
      name: 'grille',
      title: 'Grille tarifaire',
      type: 'array',
      of: [ligneTarif],
      fieldset: 'tarifs',
      description: 'Une ligne par prix : par destination, par format, par unité.',
    }),
    defineField({
      name: 'fraisAnnexes',
      title: 'Frais annexes possibles',
      type: 'array',
      of: [ligneTarif],
      fieldset: 'tarifs',
    }),
    defineField({
      name: 'tauxTVADefaut',
      title: 'Taux de TVA habituel',
      type: 'number',
      fieldset: 'tarifs',
      options: {
        list: [
          { title: '0 % — transport lié à l’export', value: 0 },
          { title: '20 %', value: 20 },
        ],
        layout: 'radio',
      },
      description: 'Pratique à faire valider par l’expert-comptable.',
    }),
    defineField({
      name: 'delais',
      title: 'Délais indicatifs',
      type: 'array',
      fieldset: 'tarifs',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'delaiZone',
          fields: [
            defineField({ name: 'zone', title: 'Zone / destination', type: 'string' }),
            defineField({ name: 'delai', title: 'Délai', type: 'string' }),
          ],
          preview: { select: { title: 'zone', subtitle: 'delai' } },
        }),
      ],
    }),

    { ...listeTextes('inclus', 'Compris dans la prestation'), fieldset: 'prestation' },
    { ...listeTextes('nonInclus', 'Non compris'), fieldset: 'prestation' },
    { ...listeTextes('documents', 'Documents à réclamer au client'), fieldset: 'prestation' },
    {
      ...listeTextes('infosAObtenir', 'Informations à obtenir avant de chiffrer'),
      fieldset: 'prestation',
    },
    { ...listeTextes('vigilance', 'Points de vigilance'), fieldset: 'prestation' },

    defineField({
      name: 'modeleDescription',
      title: 'Description type de la prestation (sur le devis)',
      type: 'text',
      rows: 4,
      fieldset: 'modeles',
    }),
    defineField({
      name: 'modeleMessage',
      title: 'Paragraphe propre au service dans la réponse au client',
      type: 'text',
      rows: 5,
      fieldset: 'modeles',
      description:
        'Ajouté au message du devis (e-mail, WhatsApp). « {destination} » est remplacé par la destination de la demande.',
    }),
    defineField({
      name: 'modeleNote',
      title: 'Liste de contrôle interne',
      type: 'text',
      rows: 5,
      fieldset: 'modeles',
    }),
    defineField({
      name: 'aCompleter',
      title: 'Reste à compléter par l’équipe',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      description: 'Ce que la fiche ne sait pas encore. À vider au fur et à mesure.',
    }),
  ],
  orderings: [{ title: 'Ordre', name: 'ordre', by: [{ field: 'ordre', direction: 'asc' }] }],
  preview: {
    select: { title: 'titre', actif: 'actif', grille: 'grille' },
    prepare: ({ title, actif, grille }) => {
      const lignes = (grille ?? []) as { prixHT?: number }[];
      const prix = lignes.filter((l) => typeof l.prixHT === 'number').length;
      return {
        title: `${title}${actif === false ? ' (inactive)' : ''}`,
        subtitle: lignes.length ? `${prix}/${lignes.length} prix renseignés` : 'grille vide',
      };
    },
  },
});
