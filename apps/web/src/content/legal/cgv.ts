import { p, liste, listeNum, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

export const CGV_FR: ContenuLegal = {
  eyebrow: 'Conditions générales',
  titrePage: 'Conditions générales de vente.',
  chapo:
    'Ces conditions régissent les prestations d’organisation de transport et de logistique réalisées par HGWF Cargo. Elles s’appliquent à toute commande, sauf convention écrite contraire.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Champ d’application',
      ancre: 'champ-application',
      corps: [
        p(
          'HGWF Cargo intervient en qualité de commissionnaire de transport : nous organisons librement, pour votre compte et en notre nom, l’acheminement de vos marchandises par les moyens de notre choix. Nous ne réalisons pas nous-mêmes le transport principal.',
        ),
        p(
          'Toute commande emporte acceptation sans réserve des présentes conditions, qui prévalent sur les conditions d’achat du client, sauf accord écrit de notre part.',
        ),
      ],
    },
    {
      titre: 'Devis et commande',
      ancre: 'devis',
      corps: [
        p(
          'Nos devis sont établis sur la base des informations que vous nous communiquez et sont valables trente jours, sauf mention contraire. Les prix s’entendent hors taxes.',
        ),
        p('Sauf indication expresse au devis, ne sont pas compris :'),
        ...liste(
          'les droits de douane, taxes et redevances exigibles à destination',
          'les frais de stationnement, de magasinage ou d’immobilisation non imputables à HGWF Cargo',
          'les prestations de manutention exceptionnelle non prévues à la commande',
        ),
        p(
          'Toute modification des caractéristiques de l’envoi — poids, dimensions, nature, destination — entraîne la révision du prix.',
        ),
      ],
    },
    {
      titre: 'Obligations du client',
      ancre: 'obligations-client',
      corps: [
        p('Vous vous engagez à :'),
        ...listeNum(
          'déclarer avec exactitude la nature, le poids, les dimensions et la valeur des marchandises',
          'assurer un emballage adapté au mode de transport et à la durée d’acheminement',
          'fournir en temps utile les documents nécessaires au transport et au dédouanement',
          'nous signaler toute marchandise dangereuse, réglementée ou de valeur',
        ),
        p(
          'Sont exclus du transport, sauf accord écrit préalable : les espèces, métaux et pierres précieuses, les objets d’art, les armes, les stupéfiants, les animaux vivants, les denrées périssables non réfrigérées et toute marchandise dont la circulation est interdite. Une déclaration inexacte engage votre responsabilité pour l’ensemble des conséquences qui en découlent.',
        ),
      ],
    },
    {
      titre: 'Délais',
      ancre: 'delais',
      corps: [
        p(
          'Les délais annoncés, y compris ceux figurant sur ce site, sont donnés à titre indicatif. Ils dépendent des rotations maritimes, des conditions météorologiques, des opérations portuaires et des contrôles douaniers, qui échappent à notre maîtrise.',
        ),
        p(
          'Un dépassement de délai n’ouvre pas droit à indemnité, ni à l’annulation de la commande, sauf engagement écrit exprès de notre part sur une date garantie.',
        ),
      ],
    },
    {
      titre: 'Responsabilité',
      ancre: 'responsabilite',
      corps: [
        p(
          'Notre responsabilité de commissionnaire s’exerce dans les limites fixées par le contrat type de commission de transport annexé au décret n° 2013-293 du 5 avril 2013, applicable à défaut de convention écrite contraire.',
        ),
        p(
          'La responsabilité du fait des transporteurs substitués est en outre limitée par les conventions applicables au mode d’acheminement employé :',
        ),
        ...liste(
          'transport routier international : Convention de Genève du 19 mai 1956, dite CMR',
          'transport maritime : Convention de Bruxelles de 1924 et ses protocoles, dites Règles de La Haye-Visby',
          'transport aérien : Convention de Montréal du 28 mai 1999',
        ),
        p(
          'En toute hypothèse, notre indemnisation ne peut excéder celle que nous pouvons obtenir du transporteur substitué, dans la limite des plafonds légaux applicables. Les dommages immatériels et pertes d’exploitation ne sont pas indemnisés.',
        ),
      ],
    },
    {
      titre: 'Assurance des marchandises',
      ancre: 'assurance',
      corps: [
        p(
          'Les limitations d’indemnité rappelées ci-dessus sont souvent très inférieures à la valeur réelle des marchandises. Nous vous recommandons de souscrire une assurance ad valorem.',
        ),
        p(
          'Cette assurance n’est jamais souscrite d’office : elle doit faire l’objet d’une demande écrite de votre part, précisant la nature et la valeur à assurer, avant l’enlèvement.',
        ),
      ],
    },
    {
      titre: 'Paiement',
      ancre: 'paiement',
      corps: [
        p(
          'Sauf convention particulière, nos prestations sont payables à réception de facture. Aucun escompte n’est accordé pour paiement anticipé.',
        ),
        p(
          'Tout retard de paiement entraîne de plein droit des pénalités calculées au taux d’intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de dix points, ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 €, conformément à l’article L.441-10 du code de commerce.',
        ),
        p(
          'Conformément à l’article L.132-2 du code de commerce, nous disposons d’un privilège et d’un droit de rétention sur les marchandises pour les créances nées à leur occasion.',
        ),
      ],
    },
    {
      titre: 'Réclamations',
      ancre: 'reclamations',
      corps: [
        p(
          'Toute avarie ou perte partielle doit faire l’objet de réserves précises et motivées à la livraison, confirmées au transporteur et à nous-mêmes par écrit dans les trois jours ouvrables suivant la réception. À défaut, la marchandise est réputée livrée conforme.',
        ),
        p(
          'Les actions nées du contrat de commission de transport se prescrivent par un an à compter de la livraison, ou de la date à laquelle elle aurait dû intervenir.',
        ),
      ],
    },
    {
      titre: 'Clients particuliers',
      ancre: 'consommateurs',
      corps: [
        p(
          'Les présentes conditions ne privent le client consommateur d’aucun des droits que lui reconnaît le code de la consommation, notamment en matière de garanties légales.',
        ),
        p(
          'En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation, après nous avoir adressé une réclamation écrite. Les coordonnées du médiateur figurent dans nos ',
          lien('mentions légales', '/mentions-legales'),
          '.',
        ),
      ],
    },
    {
      titre: 'Droit applicable',
      ancre: 'droit-applicable',
      corps: [
        p(
          'Les présentes conditions sont soumises au droit français. Seule la version française fait foi, toute traduction étant fournie à titre d’information.',
        ),
        p(
          'Seule la version française de ces conditions fait foi. Only the French version of these terms is legally binding.',
        ),
        p(
          'À défaut de résolution amiable, les litiges relèvent de la compétence du tribunal de commerce de Bobigny pour les clients professionnels. Pour les clients consommateurs, les règles légales de compétence s’appliquent.',
        ),
      ],
    },
  ],
};
