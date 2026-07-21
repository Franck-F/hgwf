import { defineType, defineField } from 'sanity';

export const footer = defineType({
  name: 'footer',
  title: 'Pied de page',
  type: 'document',
  fields: [
    defineField({ name: 'texteFr', title: 'Texte FR', type: 'text', rows: 2 }),
    defineField({ name: 'texteEn', title: 'Texte EN', type: 'text', rows: 2 }),
    defineField({ name: 'ligneLegale', title: 'Ligne légale (mono)', type: 'text', rows: 2 }),
    defineField({
      name: 'colonnes',
      title: 'Colonnes de liens',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'titreFr', title: 'Titre FR', type: 'string' },
            { name: 'titreEn', title: 'Titre EN', type: 'string' },
            {
              name: 'liens',
              title: 'Liens',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'libelleFr', title: 'Libellé FR', type: 'string' },
                    { name: 'libelleEn', title: 'Libellé EN', type: 'string' },
                    {
                      name: 'href',
                      title: 'Lien',
                      type: 'string',
                      description: 'Chemin interne (/suivi, /faq…) ou ancre de l’accueil (/#zones).',
                    },
                  ],
                },
              ],
            },
          ],
          preview: { select: { title: 'titreFr' } },
        },
      ],
    }),
    defineField({ name: 'copyrightFr', title: 'Copyright FR', type: 'string' }),
    defineField({ name: 'copyrightEn', title: 'Copyright EN', type: 'string' }),
    defineField({ name: 'mentionsLibelleFr', title: 'Lien mentions légales — libellé FR', type: 'string' }),
    defineField({ name: 'mentionsLibelleEn', title: 'Lien mentions légales — libellé EN', type: 'string' }),
    defineField({ name: 'mentionsHref', title: 'Lien mentions légales — URL', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Pied de page' }) },
});
