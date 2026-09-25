import { creerPageLegale } from '@/components/legal/creerPageLegale';

export { generateStaticParams } from '@/i18n/staticParams';

const { generateMetadata, Page } = creerPageLegale('confidentialite', {
  fr: {
    titre: 'Confidentialité et données personnelles (RGPD) · HGWF Cargo',
    description:
      'Données personnelles collectées sur le site HGWF Cargo : finalités, bases légales, durées de conservation et exercice de vos droits.',
  },
  en: {
    titre: 'Privacy policy and personal data (GDPR) · HGWF Cargo',
    description:
      'Personal data collected on the HGWF Cargo website and quote forms: purposes, legal bases, recipients, retention periods and your rights.',
  },
});

export { generateMetadata };
export default Page;
