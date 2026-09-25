import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('cgv', {
  fr: {
    titre: 'Conditions générales de vente (CGV) transport · HGWF Cargo',
    description:
      'Conditions générales de vente et d’organisation de transport de HGWF Cargo : devis, délais, responsabilité, assurance et paiement.',
  },
  en: {
    titre: 'Terms and conditions of sale for freight · HGWF Cargo',
    description:
      'HGWF Cargo terms of sale and transport organisation for sea, air and road freight: quotes, transit times, liability, insurance and payment.',
  },
});

export { generateMetadata };
export default Page;
