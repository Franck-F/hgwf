import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('confidentialite', {
  titre: 'Politique de confidentialité · HGWF Cargo',
  description:
    'Données personnelles collectées sur le site HGWF Cargo : finalités, bases légales, durées de conservation et exercice de vos droits.',
});

export { generateMetadata };
export default Page;
