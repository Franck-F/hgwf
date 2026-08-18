import { defineType, defineField } from 'sanity';

/**
 * Cycle de vie d'une demande de devis :
 *   0 Nouvelle          — arrivée du site, personne ne l'a ouverte
 *   1 En cours          — prise en charge, chiffrage en préparation
 *   2 Devis envoyé      — le client a reçu le prix, on attend sa réponse
 *   3 Acceptée          — le client a dit oui, expédition à créer
 *   4 Convertie         — l'expédition existe (voir expeditionRef)
 *   5 Refusée / sans suite — sortie du pipeline, conservée pour l'historique
 * Les index sont stockés en base : ne jamais réordonner ce tableau.
 */
export const STATUTS_DEMANDE = [
  'Nouvelle',
  'En cours',
  'Devis envoyé',
  'Acceptée',
  'Convertie',
  'Refusée / sans suite',
] as const;

export const demandeDevis = defineType({
  name: 'demandeDevis',
  title: 'Demande de devis',
  type: 'document',
  fields: [
    defineField({ name: 'reference', title: 'Référence', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'clientNom', title: 'Client', type: 'string' }),
    defineField({ name: 'contact', title: 'Contact (mail · tél · préférence)', type: 'string' }),
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
      validation: (r) => r.min(0).max(STATUTS_DEMANDE.length - 1),
    }),
    defineField({ name: 'message', title: 'Message', type: 'text', rows: 3 }),
    // ── Traitement ──────────────────────────────────────────────────────────
    defineField({
      name: 'montantDevis',
      title: 'Montant du devis (ex. 1 250 €)',
      type: 'string',
      description: 'Repris automatiquement dans le message de réponse et le devis PDF.',
    }),
    defineField({
      name: 'descriptionPrestation',
      title: 'Description de la prestation',
      type: 'text',
      rows: 2,
      description:
        'Ce que couvre le devis (ex. groupage maritime port à port, dédouanement inclus). Reprise dans le message et le PDF.',
    }),
    defineField({
      name: 'delaiEstime',
      title: 'Délai estimé (ex. 3 à 5 semaines)',
      type: 'string',
      description: 'Repris automatiquement dans le message de réponse et le devis PDF.',
    }),
    defineField({
      name: 'devisEnvoyeLe',
      title: 'Devis envoyé le (JJ/MM/AAAA)',
      type: 'string',
      description: 'Posé automatiquement quand la demande passe à « Devis envoyé ».',
    }),
    defineField({
      name: 'notes',
      title: 'Notes internes',
      type: 'text',
      rows: 3,
      description: 'Jamais visibles du client : relances, particularités, accords.',
    }),
    defineField({
      name: 'expeditionRef',
      title: 'Expédition liée (référence)',
      type: 'string',
      readOnly: true,
      description: 'Rempli à la conversion : la même référence sert au suivi public.',
    }),
  ],
  orderings: [
    {
      title: 'Pipeline (statut puis plus récentes)',
      name: 'pipeline',
      by: [
        { field: 'statut', direction: 'asc' },
        { field: '_createdAt', direction: 'desc' },
      ],
    },
    { title: 'Plus récentes', name: 'recentes', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'reference', clientNom: 'clientNom', statut: 'statut', montant: 'montantDevis' },
    prepare: ({ title, clientNom, statut, montant }) => ({
      title: `${title} — ${clientNom ?? ''}`,
      subtitle: [STATUTS_DEMANDE[(statut as number) ?? 0], montant].filter(Boolean).join(' · '),
    }),
  },
});
