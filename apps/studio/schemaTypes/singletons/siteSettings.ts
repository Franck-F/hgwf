import { defineType, defineField } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Paramètres du site',
  type: 'document',
  fields: [
    defineField({ name: 'raisonSociale', title: 'Raison sociale', type: 'string' }),
    defineField({
      name: 'logoEmbleme',
      title: 'Logo — emblème (nav)',
      description: 'Vide = emblème par défaut du site.',
      type: 'image',
    }),
    defineField({
      name: 'logoFooter',
      title: 'Logo — pied de page (sur fond marine)',
      description: 'Vide = logo par défaut du site.',
      type: 'image',
    }),
    defineField({ name: 'nomCommercial', title: 'Nom commercial', type: 'string' }),
    defineField({ name: 'baseline', title: 'Baseline', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({
      name: 'telephones',
      title: 'Téléphones (WhatsApp)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'contact', title: 'Contact', type: 'string' },
            { name: 'numero', title: 'Numéro', type: 'string' },
          ],
        },
      ],
    }),
    defineField({ name: 'adresseSiege', title: 'Adresse siège social', type: 'text', rows: 2 }),
    defineField({ name: 'adresseLogistique', title: 'Centre logistique', type: 'text', rows: 2 }),
    defineField({
      name: 'reseaux',
      title: 'Réseaux sociaux',
      type: 'object',
      fields: [
        { name: 'facebook', title: 'Facebook', type: 'url' },
        { name: 'instagram', title: 'Instagram', type: 'url' },
        { name: 'tiktok', title: 'TikTok', type: 'url' },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Paramètres du site' }) },
});
