import { p, liste, listeNum, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

// Traduction de courtoisie, fournie à titre d'information : seule la version
// française (cgv.ts) fait foi, comme rappelé dans le chapo et la dernière
// section. Traduction générée automatiquement — à faire relire avant toute
// utilisation contractuelle.
export const CGV_EN: ContenuLegal = {
  eyebrow: 'Terms and conditions',
  titrePage: 'Terms and conditions of sale.',
  chapo:
    'These terms govern the transport organisation and logistics services provided by HGWF Cargo. They apply to every order unless otherwise agreed in writing. This English version is provided for information only: only the French version is legally binding.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Scope',
      ancre: 'champ-application',
      corps: [
        p(
          'HGWF Cargo acts as a freight forwarder (commissionnaire de transport): we freely organise, on your behalf and in our own name, the carriage of your goods by the means of our choosing. We do not carry out the main transport ourselves.',
        ),
        p(
          'Any order implies unreserved acceptance of these terms, which prevail over the customer’s purchasing terms unless we agree otherwise in writing.',
        ),
      ],
    },
    {
      titre: 'Quotes and orders',
      ancre: 'devis',
      corps: [
        p(
          'Our quotes are prepared on the basis of the information you provide and are valid for thirty days unless stated otherwise. Prices are exclusive of taxes.',
        ),
        p('Unless expressly stated in the quote, the following are not included:'),
        ...liste(
          'customs duties, taxes and charges payable at destination',
          'demurrage, storage or detention costs not attributable to HGWF Cargo',
          'exceptional handling services not provided for in the order',
        ),
        p(
          'Any change to the characteristics of the shipment (weight, dimensions, nature, destination) entails a price revision.',
        ),
      ],
    },
    {
      titre: 'Customer obligations',
      ancre: 'obligations-client',
      corps: [
        p('You undertake to:'),
        ...listeNum(
          'accurately declare the nature, weight, dimensions and value of the goods',
          'provide packaging suited to the mode of transport and the duration of carriage',
          'supply in good time the documents required for transport and customs clearance',
          'inform us of any dangerous, regulated or high-value goods',
        ),
        p(
          'Unless agreed in writing beforehand, the following are excluded from carriage: cash, precious metals and stones, works of art, weapons, narcotics, live animals, non-refrigerated perishable goods and any goods whose circulation is prohibited. An inaccurate declaration makes you liable for all resulting consequences.',
        ),
      ],
    },
    {
      titre: 'Transit times',
      ancre: 'delais',
      corps: [
        p(
          'The transit times announced, including those shown on this site, are indicative only. They depend on shipping rotations, weather conditions, port operations and customs inspections, which are beyond our control.',
        ),
        p(
          'Exceeding a transit time does not give rise to compensation or to cancellation of the order, unless we have expressly guaranteed a date in writing.',
        ),
      ],
    },
    {
      titre: 'Liability',
      ancre: 'responsabilite',
      corps: [
        p(
          'Our liability as freight forwarder is exercised within the limits set by the standard freight-forwarding contract annexed to French decree no. 2013-293 of 5 April 2013, applicable in the absence of a written agreement to the contrary.',
        ),
        p(
          'Liability for substituted carriers is further limited by the conventions applicable to the mode of transport used:',
        ),
        ...liste(
          'international road transport: Geneva Convention of 19 May 1956, known as CMR',
          'sea transport: Brussels Convention of 1924 and its protocols, known as the Hague-Visby Rules',
          'air transport: Montreal Convention of 28 May 1999',
        ),
        p(
          'In any event, our compensation cannot exceed what we can obtain from the substituted carrier, within the applicable legal ceilings. Intangible damage and business losses are not compensated.',
        ),
      ],
    },
    {
      titre: 'Cargo insurance',
      ancre: 'assurance',
      corps: [
        p(
          'The compensation limits mentioned above are often far below the real value of the goods. We recommend taking out ad valorem insurance.',
        ),
        p(
          'This insurance is never taken out automatically: it must be requested in writing, stating the nature and value to be insured, before pick-up.',
        ),
      ],
    },
    {
      titre: 'Payment',
      ancre: 'paiement',
      corps: [
        p(
          'Unless otherwise agreed, our services are payable on receipt of invoice. No discount is granted for early payment.',
        ),
        p(
          'Any late payment automatically incurs penalties calculated at the interest rate applied by the European Central Bank to its most recent refinancing operation, increased by ten points, plus a fixed recovery fee of €40, in accordance with article L.441-10 of the French commercial code.',
        ),
        p(
          'In accordance with article L.132-2 of the French commercial code, we hold a lien and a right of retention over the goods for claims arising in connection with them.',
        ),
      ],
    },
    {
      titre: 'Purchases and VAT (France / European Union)',
      ancre: 'tva',
      corps: [
        p(
          'Our prices are exclusive of taxes. French VAT at the applicable rate is added where due. Sales of goods in France, in particular used containers, are subject to VAT at the standard rate, unless a special regime applies.',
        ),
        p(
          'International transport services and directly related operations may qualify for a VAT exemption under article 262 of the French general tax code.',
        ),
        p(
          'Business customers established in the European Union outside France: upon communication of a valid intra-Community VAT number before invoicing, services are invoiced exclusive of tax; VAT is then self-assessed by the customer in their Member State, in accordance with article 196 of directive 2006/112/EC. The corresponding wording appears on the invoice.',
        ),
        p('The VAT regime applicable to each operation is specified on the quote and then on the invoice.'),
      ],
    },
    {
      titre: 'Claims',
      ancre: 'reclamations',
      corps: [
        p(
          'Any damage or partial loss must be the subject of precise, substantiated reservations on delivery, confirmed to the carrier and to us in writing within three working days of receipt. Failing this, the goods are deemed delivered in good condition.',
        ),
        p(
          'Actions arising from the freight-forwarding contract are time-barred one year after delivery, or after the date on which it should have taken place.',
        ),
      ],
    },
    {
      titre: 'Consumer customers',
      ancre: 'consommateurs',
      corps: [
        p(
          'These terms do not deprive consumer customers of any of the rights granted to them by the French consumer code, in particular regarding statutory warranties.',
        ),
        p(
          'In the event of a dispute, you may use a consumer mediator free of charge after sending us a written complaint. The contact details of the appointed mediator will be provided on request at ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Governing law',
      ancre: 'droit-applicable',
      corps: [
        p(
          'These terms are governed by French law. Only the French version is authentic; any translation is provided for information only.',
        ),
        p(
          'Seule la version française de ces conditions fait foi. Only the French version of these terms is legally binding.',
        ),
        p(
          'Failing amicable resolution, disputes fall under the jurisdiction of the Bobigny commercial court for business customers. For consumer customers, the statutory jurisdiction rules apply.',
        ),
      ],
    },
  ],
};
