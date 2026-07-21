import { defineType, defineField } from 'sanity';

export const ETAPES_EXPEDITION = [
  'Pris en charge',
  'Au port du Havre',
  'En mer',
  "Port d'arrivée",
  'Livré',
] as const;

export const expedition = defineType({
  name: 'expedition',
  title: 'Expédition',
  type: 'document',
  fields: [
    defineField({ name: 'reference', title: 'Référence', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'clientNom', title: 'Client', type: 'string' }),
    defineField({ name: 'trajet', title: 'Trajet', type: 'string' }),
    defineField({
      name: 'etape',
      title: 'Étape',
      type: 'number',
      initialValue: 0,
      options: {
        list: ETAPES_EXPEDITION.map((titre, value) => ({ title: titre, value })),
      },
    }),
    defineField({ name: 'eta', title: 'ETA', type: 'string' }),
  ],
  preview: {
    select: { title: 'reference', trajet: 'trajet', etape: 'etape' },
    prepare: ({ title, trajet, etape }) => ({
      title: `${title} — ${trajet ?? ''}`,
      subtitle: ETAPES_EXPEDITION[(etape as number) ?? 0],
    }),
  },
});
