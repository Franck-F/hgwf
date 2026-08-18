import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('cgv', {
  titre: 'Conditions générales de vente · HGWF Cargo',
  description:
    'Conditions générales de vente et d’organisation de transport de HGWF Cargo : devis, délais, responsabilité, assurance et paiement.',
});

export { generateMetadata };
export default Page;
