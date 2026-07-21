import { defineType, defineField } from 'sanity';

export const STATUTS_DEMANDE = ['Nouvelle', 'En cours', 'Devis envoyé', 'Acceptée'] as const;

export const demandeDevis = defineType({
  name: 'demandeDevis',
  title: 'Demande de devis',
  type: 'document',
  fields: [
    defineField({ name: 'reference', title: 'Référence', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'clientNom', title: 'Client', type: 'string' }),
    defineField({ name: 'contact', title: 'Contact (mail · tél)', type: 'string' }),
    defineField({ name: 'typeEnvoi', title: 'Type d’envoi', type: 'string' }),
    defineField({ name: 'destination', title: 'Destination', type: 'string' }),
    defineField({ name: 'volume', title: 'Volume estimé', type: 'string' }),
    defineField({ name: 'recueLe', title: 'Reçue le (JJ/MM/AAAA)', type: 'string' }),
    defineField({
      name: 'statut',
      title: 'Statut',
      type: 'number',
      initialValue: 0,
      options: {
        list: STATUTS_DEMANDE.map((titre, value) => ({ title: titre, value })),
      },
    }),
    defineField({ name: 'message', title: 'Message', type: 'text', rows: 3 }),
  ],
  preview: {
    select: { title: 'reference', clientNom: 'clientNom', statut: 'statut' },
    prepare: ({ title, clientNom, statut }) => ({
      title: `${title} — ${clientNom ?? ''}`,
      subtitle: STATUTS_DEMANDE[(statut as number) ?? 0],
    }),
  },
});
