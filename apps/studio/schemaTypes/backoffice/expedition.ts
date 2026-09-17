import { defineType, defineField } from 'sanity';

/**
 * Deux séries d'états cohabitent, et il ne faut pas les confondre.
 *
 *   ETAPES_EXPEDITION  — ce que le client voit sur la page Suivi. Elle décrit
 *                        le voyage de la marchandise.
 *   STATUTS_PRISE_EN_CHARGE — ce que l'équipe voit au quotidien. Elle décrit
 *                        l'avancement du dossier à l'entrepôt.
 *
 * Un dossier « Prêt » côté exploitation n'est pas « En mer » côté client.
 * Les index sont stockés en base : ne jamais réordonner ces tableaux.
 */
export const ETAPES_EXPEDITION = [
  'Pris en charge',
  'Au port du Havre',
  'En mer',
  "Port d'arrivée",
  'Livré',
] as const;

export const STATUTS_PRISE_EN_CHARGE = [
  'À préparer',
  'Prêt',
  'Expédié',
  'Livré',
  'Incident',
  'Annulé',
] as const;

export const MODES_ENVOI = [
  'Groupage maritime',
  'Conteneur complet',
  'Fret aérien',
  'Véhicule',
  'Routier',
] as const;

export const expedition = defineType({
  name: 'expedition',
  title: 'Expédition',
  type: 'document',
  groups: [
    { name: 'suivi', title: 'Suivi client', default: true },
    { name: 'exploitation', title: 'Prise en charge' },
  ],
  fields: [
    defineField({
      name: 'reference',
      title: 'Référence',
      type: 'string',
      group: 'suivi',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'clientNom', title: 'Client', type: 'string', group: 'suivi' }),
    defineField({
      name: 'contact',
      title: 'Contact client (mail · tél · préférence)',
      type: 'string',
      group: 'suivi',
      description: 'Recopié depuis la demande de devis à la conversion.',
    }),
    defineField({
      name: 'demandeRef',
      title: 'Demande d’origine (référence)',
      type: 'string',
      group: 'suivi',
      readOnly: true,
    }),
    defineField({ name: 'trajet', title: 'Trajet', type: 'string', group: 'suivi' }),
    defineField({
      name: 'etape',
      title: 'Étape (visible du client)',
      type: 'number',
      group: 'suivi',
      initialValue: 0,
      options: {
        list: ETAPES_EXPEDITION.map((titre, value) => ({ title: titre, value })),
      },
    }),
    defineField({ name: 'eta', title: 'ETA', type: 'string', group: 'suivi' }),

    // ── Prise en charge ─────────────────────────────────────────────────────
    // Ces champs n'existaient pas : le back-office savait convertir une demande
    // en expédition, mais rien ne permettait de préparer le dossier ni de
    // déclencher son départ. Ils sont volontairement plats (pas d'objets
    // imbriqués) pour rester lisibles dans le tableau du back-office.
    defineField({
      name: 'statutPriseEnCharge',
      title: 'Statut de prise en charge',
      type: 'number',
      group: 'exploitation',
      initialValue: 0,
      options: {
        list: STATUTS_PRISE_EN_CHARGE.map((titre, value) => ({ title: titre, value })),
      },
      description: 'État du dossier côté équipe. À ne pas confondre avec l’étape vue par le client.',
    }),
    defineField({
      name: 'mode',
      title: 'Mode d’acheminement',
      type: 'string',
      group: 'exploitation',
      options: { list: MODES_ENVOI.map((m) => ({ title: m, value: m })) },
    }),

    defineField({
      name: 'expediteurNom',
      title: 'Expéditeur — nom',
      type: 'string',
      group: 'exploitation',
    }),
    defineField({
      name: 'expediteurAdresse',
      title: 'Expéditeur — adresse complète',
      type: 'text',
      rows: 2,
      group: 'exploitation',
      description: 'Adresse d’enlèvement ou de dépôt. Obligatoire pour déclencher la prise en charge.',
    }),
    defineField({
      name: 'expediteurTel',
      title: 'Expéditeur — téléphone',
      type: 'string',
      group: 'exploitation',
    }),

    defineField({
      name: 'destinataireNom',
      title: 'Destinataire — nom',
      type: 'string',
      group: 'exploitation',
    }),
    defineField({
      name: 'destinataireAdresse',
      title: 'Destinataire — adresse complète',
      type: 'text',
      rows: 2,
      group: 'exploitation',
      description: 'Indispensable à destination. Obligatoire pour déclencher la prise en charge.',
    }),
    defineField({
      name: 'destinataireTel',
      title: 'Destinataire — téléphone',
      type: 'string',
      group: 'exploitation',
    }),

    defineField({
      name: 'colisNombre',
      title: 'Nombre de colis',
      type: 'number',
      group: 'exploitation',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'colisPoids',
      title: 'Poids total (kg)',
      type: 'number',
      group: 'exploitation',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'colisVolume',
      title: 'Volume (m³)',
      type: 'number',
      group: 'exploitation',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'colisNature',
      title: 'Nature de la marchandise',
      type: 'text',
      rows: 2,
      group: 'exploitation',
      description: 'Ce que contient l’envoi. Base de la déclaration d’export et de l’assurance.',
    }),
    defineField({
      name: 'valeurDeclaree',
      title: 'Valeur déclarée (€)',
      type: 'number',
      group: 'exploitation',
      validation: (r) => r.min(0),
    }),

    // ── Règlement : condition de départ ──────────────────────────────────────
    // Règle validée le 17/09/2026 : la marchandise ne part pas tant que le
    // règlement n'est pas encaissé. Tant que l'encaissement n'est pas branché,
    // la case est posée à la main par une personne autorisée.
    defineField({
      name: 'reglementRecu',
      title: 'Règlement reçu',
      type: 'boolean',
      group: 'exploitation',
      initialValue: false,
      description:
        'Coché à la main tant que l’encaissement n’est pas automatisé. Conditionne le départ.',
    }),
    defineField({
      name: 'derogationDepart',
      title: 'Départ autorisé sans règlement',
      type: 'boolean',
      group: 'exploitation',
      initialValue: false,
      description: 'Dérogation exceptionnelle. Exige un motif écrit ci-dessous.',
    }),
    defineField({
      name: 'derogationMotif',
      title: 'Motif de la dérogation',
      type: 'string',
      group: 'exploitation',
      description: 'Qui a autorisé le départ, et pourquoi. Sans motif, la dérogation est refusée.',
    }),

    // ── Références externes, saisies à la main ───────────────────────────────
    // La réservation de fret maritime n'est pas automatisable pour une TPE
    // sans contrat armateur : le back-office stocke le numéro, il ne le crée
    // pas. Ce n'est pas un pis-aller, c'est la conception retenue.
    defineField({
      name: 'numeroReservation',
      title: 'Numéro de réservation (booking)',
      type: 'string',
      group: 'exploitation',
      description: 'Communiqué par la compagnie ou le transitaire. Saisi à la main.',
    }),
    defineField({
      name: 'numeroConteneur',
      title: 'Numéro de conteneur ou de LTA',
      type: 'string',
      group: 'exploitation',
    }),
    defineField({
      name: 'notesExploitation',
      title: 'Notes d’exploitation',
      type: 'text',
      rows: 3,
      group: 'exploitation',
      description: 'Jamais visibles du client : incidents, particularités, consignes.',
    }),
    defineField({
      name: 'derniereEtapeNotifiee',
      title: 'Dernière étape notifiée au client',
      type: 'number',
      group: 'exploitation',
      readOnly: true,
      description:
        'Posé automatiquement à chaque notification. Empêche de prévenir deux fois de la même étape.',
    }),
    defineField({
      name: 'derniereNotificationLe',
      title: 'Dernière notification client le',
      type: 'string',
      group: 'exploitation',
      readOnly: true,
    }),
    defineField({
      name: 'priseEnChargeLe',
      title: 'Prise en charge déclenchée le (JJ/MM/AAAA)',
      type: 'string',
      group: 'exploitation',
      readOnly: true,
      description: 'Posé automatiquement au déclenchement.',
    }),
  ],
  preview: {
    select: {
      title: 'reference',
      trajet: 'trajet',
      etape: 'etape',
      statut: 'statutPriseEnCharge',
    },
    prepare: ({ title, trajet, etape, statut }) => ({
      title: `${title} — ${trajet ?? ''}`,
      subtitle: [
        ETAPES_EXPEDITION[(etape as number) ?? 0],
        STATUTS_PRISE_EN_CHARGE[(statut as number) ?? 0],
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
