import { p, titre3, liste, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

// Traduction anglaise de CONFIDENTIALITE_FR (confidentialite.ts). Mêmes
// traitements, mêmes bases légales, mêmes durées de conservation — seule la
// langue change. Dénominations sociales, adresses et numéros ne sont pas
// traduits.
export const CONFIDENTIALITE_EN: ContenuLegal = {
  eyebrow: 'Data protection',
  titrePage: 'Privacy policy.',
  chapo:
    'This policy describes the personal data we collect on this site, why we process it, how long we keep it and the rights available to you.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Data controller',
      ancre: 'responsable',
      corps: [
        p(
          'HGWF CARGO, société par actions simplifiée (a French simplified joint-stock company), registered office at avenue Faidherbe, 93110 Rosny-sous-Bois, registered with the Registre du commerce et des sociétés (Trade and Companies Register) of Bobigny under number 940 048 051.',
        ),
        p(
          'For any question relating to your data: ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Data collected and purposes',
      ancre: 'finalites',
      corps: [
        p('We only collect data that you provide to us voluntarily.'),
        titre3('Quote request'),
        p(
          'Name, email address, phone number, destination, port of departure, package dimensions and quantity, free-text message. This data is used to prepare your quote and to respond to you. Legal basis: the performance of pre-contractual measures taken at your request. Retention period: three years from the last contact.',
        ),
        titre3('Contact form'),
        p(
          'Name, email address, phone number, subject and message. This data is used to handle your enquiry. Legal basis: our legitimate interest in responding to enquiries addressed to us. Retention period: three years from the last contact.',
        ),
        titre3('Shipment tracking'),
        p(
          'File reference or container number, status, location and contact details linked to the file. Legal basis: the performance of the transport contract. Retention period: for the duration of the contract, then five years under the French commercial limitation period, and ten years for accounting records.',
        ),
        titre3('Service security'),
        p(
          'Your IP address is used to limit the number of requests sent to our forms and to prevent abuse. Legal basis: our legitimate interest in protecting the service. This data remains in volatile memory and is not stored.',
        ),
      ],
    },
    {
      titre: 'Recipients',
      ancre: 'destinataires',
      corps: [
        p('Your data is accessible only to those who need it:'),
        ...liste(
          'HGWF Cargo staff responsible for sales and operations',
          'our technical service providers, who act as processors and only use your data on our instructions',
          'our carriers, port agents and customs brokers, where required for the performance of your shipment',
        ),
        p('Your data is never sold, rented or transferred for advertising purposes.'),
      ],
    },
    {
      titre: 'Transfers outside the European Union',
      ancre: 'transferts',
      corps: [
        p(
          'The requests you send us are recorded in our content management tool, Sanity, whose servers are located in the United States. This transfer is governed by the safeguards set out in Chapter V of the GDPR, described in the data processing agreement concluded with this provider.',
        ),
        p(
          'You can request a copy of these safeguards by writing to ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Your rights',
      ancre: 'vos-droits',
      corps: [
        p('You have the following rights over the data concerning you:'),
        ...liste(
          'right of access: to obtain a copy of the data we hold about you',
          'right to rectification: to have inaccurate information corrected',
          'right to erasure, where retention is no longer justified',
          'right to restriction of processing',
          'right to object, in particular to processing based on our legitimate interest',
          'right to data portability for the data you have provided to us',
        ),
        p(
          'To exercise these rights, write to ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' specifying your request. We respond within one month, which may be extended by two months if the request is complex — we would inform you of this.',
        ),
        p(
          'If our response does not satisfy you, you may contact the Commission nationale de l’informatique et des libertés (CNIL), the French supervisory authority, at 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, or lodge a complaint at ',
          lien('cnil.fr', 'https://www.cnil.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Cookies',
      ancre: 'cookies',
      corps: [
        p(
          'This site does not set any cookies and does not use any trackers: no audience measurement, no advertising pixels, no embedded social media buttons. No consent is therefore requested from you, and no information is stored in your browser.',
        ),
        p(
          'If we were ever to add an audience measurement tool, a banner would let you accept or decline it before any cookie is set, and this page would be updated accordingly.',
        ),
      ],
    },
    {
      titre: 'Security',
      ancre: 'securite',
      corps: [
        p(
          "Exchanges with this site are encrypted in transit. Requests are stored in a private area, separate from the site's public content, and write access is limited to our servers. We do not make any automated decisions producing legal effects concerning you, and we do not carry out any profiling.",
        ),
      ],
    },
  ],
};
