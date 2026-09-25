import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('mentions-legales', {
  fr: {
    titre: 'Mentions légales · HGWF Cargo, commissionnaire de transport',
    description: 'Mentions légales de HGWF Cargo, commissionnaire de transport à Rosny-sous-Bois : éditeur, immatriculation, direction de la publication et hébergeur.',
  },
  en: {
    titre: 'Legal notice · HGWF Cargo, international freight forwarder',
    description: 'Legal notice for HGWF Cargo, international freight forwarder in Rosny-sous-Bois (France): publisher, registration, publication director and hosting.',
  },
});

export { generateMetadata };
export default Page;
