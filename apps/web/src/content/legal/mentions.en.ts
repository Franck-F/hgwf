import { p, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

// Traduction anglaise de MENTIONS_FR (mentions.ts). Dénominations sociales,
// adresses et numéros d'immatriculation ne sont pas traduits : ce sont les
// mêmes données, décrites dans une autre langue.
export const MENTIONS_EN: ContenuLegal = {
  eyebrow: 'Legal information',
  titrePage: 'Legal notice.',
  chapo:
    'Information about the publisher of the hgwf-cargo.fr website and its hosting provider, in accordance with the French law for confidence in the digital economy (LCEN).',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Publisher',
      ancre: 'editeur',
      corps: [
        p('HGWF CARGO, société par actions simplifiée (a French simplified joint-stock company).'),
        p('Registered office: avenue Faidherbe, 93110 Rosny-sous-Bois, France.'),
        p('Logistics address: 10 rue Diderot, 93110 Rosny-sous-Bois.'),
        p(
          'Email: ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' — Phone: ',
          lien('+33 6 27 05 69 34', 'tel:+33627056934'),
          '.',
        ),
      ],
    },
    {
      titre: 'Company registration',
      ancre: 'immatriculation',
      corps: [
        p(
          'Registered with the Registre du commerce et des sociétés (Trade and Companies Register) of Bobigny, under number 940 048 051.',
        ),
        p('Intra-Community VAT number: FR18940048051.'),
        p('Business activity code (code APE): 49.41B — road freight transport.'),
      ],
    },
    {
      titre: 'Publication director',
      ancre: 'direction',
      corps: [p('Publication director: Marie Rioltha Bagassien, President.')],
    },
    {
      titre: 'Hosting',
      ancre: 'hebergement',
      corps: [
        p('This site is hosted by OVH SAS.'),
        p('2 rue Kellermann, 59100 Roubaix, France.'),
        p('Phone: ', lien('+33 9 72 10 10 07', 'tel:+33972101007'), '.'),
      ],
    },
    {
      titre: 'Intellectual property',
      ancre: 'propriete-intellectuelle',
      corps: [
        p(
          'All content on this site — text, images, visual identity, logos — is protected by intellectual property law. Any reproduction or representation, in whole or in part, without prior written authorisation is prohibited.',
        ),
      ],
    },
    {
      titre: 'Personal data',
      ancre: 'donnees-personnelles',
      corps: [
        p(
          'The processing of data collected on this site is described in our ',
          lien('privacy policy', '/confidentialite'),
          '.',
        ),
      ],
    },
  ],
};
