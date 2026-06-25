import { defineType, defineField } from 'sanity';

export const faqSection = defineType({
  name: 'faqSection',
  title: 'Section FAQ',
  type: 'object',
  fields: [
    defineField({ name: 'titre', title: 'Titre', type: 'string' }),
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'faqItem' }] }],
    }),
  ],
  preview: { prepare: () => ({ title: 'Section FAQ' }) },
});
