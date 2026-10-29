import { defineType, defineField } from 'sanity';
import { erreurSiret, MENTION_EXONERATION, montantAnnonce } from '../../tools/backoffice/chiffrage';

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
  // Des fieldsets plutôt que des onglets (groups) : l'opérateur voit le
  // chiffrage et la facturation sur la même page que la demande, sans
  // basculer d'un onglet à l'autre pendant qu'il rédige le devis.
  fieldsets: [
    {
      name: 'chiffrage',
      title: 'Chiffrage du devis',
      description: 'Repris dans le message de réponse et le devis PDF.',
    },
    {
      name: 'facturation',
      title: 'Facturation',
      description:
        'Collectée à la validation du devis, jamais dans le formulaire public. Alimente l’encadré « Client » du PDF et la préparation de la facture.',
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    defineField({ name: 'reference', title: 'Référence', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'clientNom', title: 'Client', type: 'string' }),
    // Les trois moyens de contact sont saisis séparément par le formulaire.
    // Ils l'étaient déjà : l'API les recollait en une seule chaîne, qu'il
    // fallait ensuite redécouper à l'expression régulière avant chaque envoi.
    // Une faute de frappe dans la chaîne suffisait à perdre l'adresse.
    defineField({
      name: 'email',
      title: 'E-mail du client',
      type: 'string',
      description: 'Adresse à laquelle partent l’accusé, le devis et les relances.',
    }),
    defineField({ name: 'telephone', title: 'Téléphone du client', type: 'string' }),
    defineField({
      name: 'preferenceContact',
      title: 'Préférence de contact',
      type: 'string',
      options: {
        list: ['E-mail', 'Téléphone', 'WhatsApp'].map((t) => ({ title: t, value: t })),
      },
    }),
    defineField({
      name: 'contact',
      title: 'Contact (version lisible)',
      type: 'string',
      readOnly: true,
      description:
        'Recomposé à partir des trois champs ci-dessus. Conservé pour les demandes antérieures au 18/09/2026.',
    }),
    defineField({ name: 'typeEnvoi', title: 'Type d’envoi', type: 'string' }),
    defineField({
      name: 'ficheService',
      title: 'Fiche service',
      type: 'reference',
      to: [{ type: 'ficheService' }],
      // Faible : supprimer une fiche ne doit pas être bloqué par les demandes.
      weak: true,
      description:
        'Posée quand l’opérateur choisit la fiche à la main. Sinon, le back-office la déduit du type d’envoi.',
    }),
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
    // ── Traitement : chiffrage ──────────────────────────────────────────────
    // Depuis le 29/09/2026, le montant est un nombre HT accompagné de son taux :
    // TVA et TTC se recalculent (tools/backoffice/chiffrage.ts), au lieu d'une
    // chaîne libre où rien ne distinguait un HT d'un TTC. Aucun des deux n'est
    // obligatoire : une demande se crée avant d'être chiffrée.
    defineField({
      name: 'montantHT',
      title: 'Montant HT (€)',
      type: 'number',
      fieldset: 'chiffrage',
      description:
        'Hors taxes, en euros, au centime près. La TVA et le total TTC se calculent à partir du taux ci-dessous : ne jamais saisir le TTC ici.',
      validation: (r) => r.min(0).precision(2),
    }),
    defineField({
      name: 'tauxTVA',
      title: 'Taux de TVA',
      type: 'number',
      fieldset: 'chiffrage',
      description: `Pratique constatée : 0 % pour le transport lié à l’export (Outre-mer compris), 20 % sinon. À faire valider par l’expert-comptable. À 0 %, le devis porte la mention « ${MENTION_EXONERATION} »`,
      options: {
        list: [
          { title: '0 % — transport lié à l’export', value: 0 },
          { title: '20 %', value: 20 },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      // Un montant HT sans taux ne donne aucun chiffrage : le devis partirait
      // sans montant, ou retomberait sur l'ancien format. Avertissement
      // seulement, pour ne pas bloquer l'enregistrement d'un brouillon.
      // Test par == null : 0 est un taux valide, le plus courant.
      validation: (r) =>
        r
          .custom((taux, { document }) =>
            typeof document?.montantHT === 'number' && taux == null
              ? 'Choisir un taux : sans lui, le montant HT n’apparaît ni dans le message ni dans le PDF.'
              : true,
          )
          .warning(),
    }),
    // Ancien format, conservé pour les demandes chiffrées avant le 29/09/2026.
    // Lu seulement quand le couple montantHT + tauxTVA est incomplet ; jamais
    // converti, car on ne sait pas s'il était HT ou TTC. Masqué quand vide,
    // donc sur toute nouvelle demande.
    defineField({
      name: 'montantDevis',
      title: 'Montant (ancien format)',
      type: 'string',
      fieldset: 'chiffrage',
      readOnly: true,
      hidden: ({ value }) => !value,
      description:
        'Saisi en texte libre avant le 29/09/2026, repris tel quel tant que le montant HT et son taux ne sont pas tous deux renseignés. Le montant se saisit désormais en HT, avec son taux de TVA.',
    }),
    defineField({
      name: 'descriptionPrestation',
      title: 'Description de la prestation',
      type: 'text',
      rows: 2,
      fieldset: 'chiffrage',
      description:
        'Ce que couvre le devis (ex. groupage maritime port à port, dédouanement inclus). Reprise dans le message et le PDF.',
    }),
    defineField({
      name: 'delaiEstime',
      title: 'Délai estimé (ex. 3 à 5 semaines)',
      type: 'string',
      fieldset: 'chiffrage',
      description: 'Repris automatiquement dans le message de réponse et le devis PDF.',
    }),
    defineField({
      name: 'devisEnvoyeLe',
      title: 'Devis envoyé le (JJ/MM/AAAA)',
      type: 'string',
      description: 'Posé automatiquement quand la demande passe à « Devis envoyé ».',
    }),
    // ── Facturation ─────────────────────────────────────────────────────────
    // Champs plats préfixés, comme le volet exploitation des expéditions : ils
    // se lisent et se vident un par un (patch.unset), sans objet imbriqué à
    // reconstruire. Tous facultatifs : ce qui manque pour facturer est listé
    // par manquesFacturation, pas bloqué ici.
    defineField({
      name: 'facturationType',
      title: 'Type de client',
      type: 'string',
      fieldset: 'facturation',
      options: {
        list: [
          { title: 'Particulier', value: 'particulier' },
          { title: 'Professionnel', value: 'professionnel' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'facturationNom',
      title: 'Nom ou raison sociale',
      type: 'string',
      fieldset: 'facturation',
      description: 'Tel qu’il doit figurer sur la facture.',
    }),
    defineField({
      name: 'facturationAdresse',
      title: 'Adresse',
      type: 'text',
      rows: 3,
      fieldset: 'facturation',
      description:
        'Numéro, voie, complément : une ligne par ligne d’adresse. Code postal et ville se saisissent ci-dessous.',
    }),
    defineField({
      name: 'facturationCodePostal',
      title: 'Code postal',
      type: 'string',
      fieldset: 'facturation',
    }),
    defineField({ name: 'facturationVille', title: 'Ville', type: 'string', fieldset: 'facturation' }),
    defineField({ name: 'facturationPays', title: 'Pays', type: 'string', fieldset: 'facturation' }),
    // SIRET et TVA intracommunautaire ne concernent que les professionnels :
    // masqués sinon, et ignorés par le PDF même s'ils restent en base.
    defineField({
      name: 'facturationSiret',
      title: 'SIRET',
      type: 'string',
      fieldset: 'facturation',
      hidden: ({ document }) => document?.facturationType !== 'professionnel',
      description:
        'Requis pour facturer un professionnel. SIRET à 14 chiffres de préférence ; un SIREN à 9 chiffres est accepté. Espaces tolérés.',
      // Avertissement et non erreur : un numéro incomplet ne doit pas empêcher
      // d'enregistrer le reste. Rien à signaler sur un champ masqué, que
      // l'opérateur ne pourrait pas corriger.
      validation: (r) =>
        r
          .custom((siret, { document }) =>
            document?.facturationType !== 'professionnel' ? true : (erreurSiret(siret) ?? true),
          )
          .warning(),
    }),
    defineField({
      name: 'facturationTvaIntracom',
      title: 'N° de TVA intracommunautaire',
      type: 'string',
      fieldset: 'facturation',
      hidden: ({ document }) => document?.facturationType !== 'professionnel',
      description: 'Facultatif. Pour une entreprise française : FR suivi de 11 caractères.',
    }),
    // ── Traçabilité des envois ──────────────────────────────────────────────
    // Posés automatiquement par l'API. Sans eux, savoir si un client a reçu
    // quelque chose obligeait à fouiller les journaux du serveur.
    defineField({
      name: 'accuseReceptionLe',
      title: 'Accusé de réception envoyé le',
      type: 'string',
      readOnly: true,
      description: 'Horodatage de l’accusé automatique envoyé à la réception de la demande.',
    }),
    defineField({
      name: 'devisEnvoyeA',
      title: 'Devis envoyé à (adresse)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'relanceEnvoyeeLe',
      title: 'Relance envoyée le',
      type: 'string',
      readOnly: true,
      description: 'Une seule relance automatique par devis. Renseigné, elle ne repartira pas.',
    }),
    defineField({
      name: 'complementDemandeLe',
      title: 'Compléments demandés le',
      type: 'string',
      readOnly: true,
      description: 'Date d’envoi de la demande d’informations complémentaires (devis provisoire joint).',
    }),
    defineField({
      name: 'complementDemandeA',
      title: 'Compléments demandés à',
      type: 'string',
      readOnly: true,
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
    select: {
      title: 'reference',
      clientNom: 'clientNom',
      statut: 'statut',
      montantHT: 'montantHT',
      tauxTVA: 'tauxTVA',
      montantDevis: 'montantDevis',
    },
    prepare: ({ title, clientNom, statut, montantHT, tauxTVA, montantDevis }) => ({
      title: `${title} — ${clientNom ?? ''}`,
      // montantAnnonce rend déjà une chaîne (« 0,00 € TTC » compris) ou null :
      // le filtre ne voit jamais un nombre, un montant ou un taux à zéro ne
      // peut pas disparaître du sous-titre.
      subtitle: [
        STATUTS_DEMANDE[(statut as number) ?? 0],
        montantAnnonce({ montantHT, tauxTVA, montantDevis }),
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
