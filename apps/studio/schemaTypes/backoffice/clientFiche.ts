import { defineType, defineField } from 'sanity';

export const clientFiche = defineType({
  name: 'clientFiche',
  title: 'Client',
  type: 'document',
  fields: [
    defineField({ name: 'nom', title: 'Nom', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'contact', title: 'Contact (mail · tél)', type: 'string' }),
    defineField({ name: 'destination', title: 'Destination habituelle', type: 'string' }),
    defineField({ name: 'envois', title: 'Nombre d’envois', type: 'number', initialValue: 0 }),
    defineField({ name: 'volume', title: 'Volume cumulé', type: 'string' }),
  ],
  preview: { select: { title: 'nom', subtitle: 'destination' } },
});
