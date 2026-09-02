import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('cgv', {
  fr: {
    titre: 'Conditions générales de vente · HGWF Cargo',
    description:
      'Conditions générales de vente et d’organisation de transport de HGWF Cargo : devis, délais, responsabilité, assurance et paiement.',
  },
  en: {
    titre: 'Terms and conditions of sale · HGWF Cargo',
    description:
      'HGWF Cargo terms of sale and transport organisation: quotes, transit times, liability, insurance and payment.',
  },
});

export { generateMetadata };
export default Page;
