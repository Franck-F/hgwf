import { defineType, defineField } from 'sanity';

export const statsMensuelles = defineType({
  name: 'statsMensuelles',
  title: 'Statistiques mensuelles',
  type: 'document',
  fields: [
    defineField({ name: 'volumeMoisEnCours', title: 'Volume du mois en cours (ex. 142 m³)', type: 'string' }),
    defineField({ name: 'progression', title: 'Progression (ex. +18 % vs juin)', type: 'string' }),
    defineField({
      name: 'barres',
      title: 'Volumes des derniers mois (m³)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'mois', title: 'Mois (ex. FÉV)', type: 'string' }),
            defineField({ name: 'valeur', title: 'Volume (m³)', type: 'number' }),
          ],
          preview: { select: { title: 'mois', subtitle: 'valeur' } },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Statistiques mensuelles' }) },
});
