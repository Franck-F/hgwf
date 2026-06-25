import { defineType, defineField } from 'sanity';

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'liens',
      title: 'Liens du menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'libelleFr', title: 'Libellé FR', type: 'string' },
            { name: 'libelleEn', title: 'Libellé EN', type: 'string' },
            { name: 'href', title: 'Lien', type: 'string' },
          ],
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Navigation' }) },
});
