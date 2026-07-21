import { defineType, defineField } from 'sanity';

export const STATUTS_CONTENEUR = ['Disponible', 'Réservé', 'Vendu'] as const;

export const conteneurOccasion = defineType({
  name: 'conteneurOccasion',
  title: 'Conteneur d’occasion',
  type: 'document',
  fields: [
    defineField({
      name: 'reference',
      title: 'Référence (ex. CTN-20-130)',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'taille', title: 'Taille', type: 'string' }),
    defineField({ name: 'etat', title: 'État (A / B / C)', type: 'string' }),
    defineField({ name: 'lieu', title: 'Lieu', type: 'string' }),
    defineField({ name: 'prix', title: 'Prix affiché', type: 'string' }),
    defineField({
      name: 'statut',
      title: 'Statut',
      type: 'number',
      initialValue: 0,
      options: {
        list: STATUTS_CONTENEUR.map((titre, value) => ({ title: titre, value })),
      },
    }),
  ],
  preview: {
    select: { title: 'reference', taille: 'taille', statut: 'statut' },
    prepare: ({ title, taille, statut }) => ({
      title: `${title} · ${taille ?? ''}`,
      subtitle: STATUTS_CONTENEUR[(statut as number) ?? 0],
    }),
  },
});
