import { defineType, defineField, defineArrayMember } from 'sanity';

/**
 * Réponse d'un client à un e-mail envoyé par le back-office (devis, demande de
 * compléments, relance, accusé de réception, notification d'expédition).
 *
 * Ces documents sont créés par l'API (webhook de réception Resend), jamais à la
 * main : tout est en lecture seule sauf « lu », que l'équipe coche depuis le
 * dossier du back-office. L'identifiant est « echange-<id e-mail Resend> », ce
 * qui rend le traitement idempotent si Resend rejoue le webhook.
 */
export const echange = defineType({
  name: 'echange',
  title: 'Réponse client',
  type: 'document',
  fields: [
    defineField({
      name: 'reference',
      title: 'Référence de la demande',
      type: 'string',
      readOnly: true,
      description: 'Lue dans l’adresse de réponse « dossier-<RÉFÉRENCE>@reponses… ».',
    }),
    defineField({
      name: 'demande',
      title: 'Demande liée',
      type: 'reference',
      to: [{ type: 'demandeDevis' }],
      weak: true,
      readOnly: true,
      description: 'Absente si aucune demande ne porte cette référence : la réponse reste lisible ici.',
    }),
    defineField({
      name: 'sens',
      title: 'Sens',
      type: 'string',
      readOnly: true,
      options: { list: [{ title: 'Reçu du client', value: 'recu' }] },
    }),
    defineField({ name: 'de', title: 'De', type: 'string', readOnly: true }),
    defineField({ name: 'a', title: 'À', type: 'string', readOnly: true }),
    defineField({ name: 'objet', title: 'Objet', type: 'string', readOnly: true }),
    defineField({ name: 'texte', title: 'Message', type: 'text', rows: 10, readOnly: true }),
    defineField({ name: 'recuLe', title: 'Reçu le', type: 'datetime', readOnly: true }),
    defineField({
      name: 'pieces',
      title: 'Pièces jointes',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pieceEchange',
          fields: [
            defineField({ name: 'nom', title: 'Nom du fichier', type: 'string' }),
            defineField({ name: 'typeMime', title: 'Type', type: 'string' }),
            defineField({ name: 'taille', title: 'Taille (octets)', type: 'number' }),
            defineField({ name: 'fichier', title: 'Fichier', type: 'file' }),
          ],
          preview: { select: { title: 'nom', subtitle: 'typeMime' } },
        }),
      ],
    }),
    defineField({
      name: 'lu',
      title: 'Lu par l’équipe',
      type: 'boolean',
      initialValue: false,
      description: 'Le seul champ modifiable : décoché, la réponse fait remonter le dossier dans « À faire ».',
    }),
    defineField({
      name: 'transfereLe',
      title: 'Copie envoyée à l’équipe le',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'expediteurVerifie',
      title: 'Expéditeur vérifié',
      type: 'boolean',
      readOnly: true,
      description:
        'Coché si le message vient de l’adresse e-mail de la demande. Sinon : pièces jointes non conservées et dossier non avancé, à vérifier auprès du client.',
    }),
    defineField({
      name: 'motifNonVerifie',
      title: 'Pourquoi l’expéditeur n’est pas vérifié',
      type: 'string',
      readOnly: true,
      hidden: ({ document }) => document?.expediteurVerifie !== false,
    }),
    defineField({
      name: 'erreur',
      title: 'Incident de traitement',
      type: 'string',
      readOnly: true,
      description: 'Renseigné si une étape a échoué (pièce jointe non récupérée, copie non transmise…).',
    }),
  ],
  orderings: [
    { title: 'Plus récentes d’abord', name: 'recuLeDesc', by: [{ field: 'recuLe', direction: 'desc' }] },
  ],
  preview: {
    select: { objet: 'objet', de: 'de', recuLe: 'recuLe', lu: 'lu', verifie: 'expediteurVerifie' },
    prepare: ({ objet, de, recuLe, lu, verifie }) => {
      const date = recuLe ? new Date(recuLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
      return {
        title: `${lu ? '' : '● '}${verifie === false ? '[À vérifier] ' : ''}${objet || '(sans objet)'}`,
        subtitle: [de, date].filter(Boolean).join(' · '),
      };
    },
  },
});
