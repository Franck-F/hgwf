import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('mentions-legales', {
  titre: 'Mentions légales — HGWF Cargo',
  description: 'Mentions légales du site HGWF Cargo — éditeur, immatriculation et hébergeur.',
});

export { generateMetadata };
export default Page;
