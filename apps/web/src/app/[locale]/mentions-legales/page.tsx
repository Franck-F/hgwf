import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('mentions-legales', {
  fr: {
    titre: 'Mentions légales · HGWF Cargo',
    description: 'Mentions légales du site HGWF Cargo : éditeur, immatriculation et hébergeur.',
  },
  en: {
    titre: 'Legal notice · HGWF Cargo',
    description: 'Legal notice for the HGWF Cargo website: publisher, registration and hosting provider.',
  },
});

export { generateMetadata };
export default Page;
