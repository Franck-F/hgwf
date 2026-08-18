import { p, titre3, liste, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

export const CONFIDENTIALITE_FR: ContenuLegal = {
  eyebrow: 'Protection des données',
  titrePage: 'Politique de confidentialité.',
  chapo:
    'Cette politique décrit les données personnelles que nous collectons sur ce site, pourquoi nous les traitons, combien de temps nous les conservons et les droits dont vous disposez.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Responsable du traitement',
      ancre: 'responsable',
      corps: [
        p(
          'HGWF CARGO, société par actions simplifiée, siège avenue Faidherbe, 93110 Rosny-sous-Bois, immatriculée au RCS de Bobigny sous le numéro 940 048 051.',
        ),
        p(
          'Pour toute question relative à vos données : ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Données collectées et finalités',
      ancre: 'finalites',
      corps: [
        p('Nous ne collectons que les données que vous nous transmettez volontairement.'),
        titre3('Demande de devis'),
        p(
          'Nom, courriel, téléphone, destination, port de départ, dimensions et nombre de colis, message libre. Ces données servent à établir votre devis et à vous répondre. Base légale : l’exécution de mesures précontractuelles prises à votre demande. Conservation : trois ans à compter du dernier contact.',
        ),
        titre3('Formulaire de contact'),
        p(
          'Nom, courriel, téléphone, objet et message. Ces données servent à traiter votre demande. Base légale : notre intérêt légitime à répondre aux sollicitations qui nous sont adressées. Conservation : trois ans à compter du dernier contact.',
        ),
        titre3('Suivi d’expédition'),
        p(
          'Référence de dossier ou numéro de conteneur, statut, position et coordonnées liées au dossier. Base légale : l’exécution du contrat de transport. Conservation : durée du contrat, puis cinq ans au titre de la prescription commerciale, et dix ans pour les pièces comptables.',
        ),
        titre3('Sécurité du service'),
        p(
          'Votre adresse IP est utilisée pour limiter le nombre de requêtes envoyées à nos formulaires et prévenir les abus. Base légale : notre intérêt légitime à protéger le service. Cette donnée reste en mémoire vive et n’est pas enregistrée.',
        ),
      ],
    },
    {
      titre: 'Destinataires',
      ancre: 'destinataires',
      corps: [
        p('Vos données sont accessibles aux seules personnes qui en ont besoin :'),
        ...liste(
          'le personnel de HGWF Cargo chargé du commerce et de l’exploitation',
          'nos prestataires techniques, qui agissent comme sous-traitants et n’utilisent vos données que sur nos instructions',
          'nos transporteurs, agents portuaires et déclarants en douane, lorsque l’exécution de votre expédition l’exige',
        ),
        p('Vos données ne sont ni vendues, ni louées, ni transmises à des fins publicitaires.'),
      ],
    },
    {
      titre: 'Hébergement et transferts de données',
      ancre: 'transferts',
      corps: [
        p(
          'Les demandes que vous nous adressez sont enregistrées dans notre outil de gestion de contenu Sanity. Les serveurs qui hébergent nos données sont situés dans l’Union européenne (Belgique).',
        ),
        p(
          'Sanity est une société américaine : si un accès à des données depuis un pays tiers s’avérait nécessaire (par exemple pour une opération d’assistance technique), il serait encadré par les garanties prévues au chapitre V du RGPD, décrites dans l’accord de sous-traitance conclu avec ce prestataire. Vous pouvez en obtenir communication en nous écrivant à ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          '.',
        ),
      ],
    },
    {
      titre: 'Vos droits',
      ancre: 'vos-droits',
      corps: [
        p('Vous disposez, sur les données qui vous concernent, des droits suivants :'),
        ...liste(
          'droit d’accès : obtenir une copie des données que nous détenons sur vous',
          'droit de rectification : faire corriger une information inexacte',
          'droit à l’effacement, lorsque la conservation n’est plus justifiée',
          'droit à la limitation du traitement',
          'droit d’opposition, notamment aux traitements fondés sur notre intérêt légitime',
          'droit à la portabilité des données que vous nous avez fournies',
        ),
        p(
          'Pour les exercer, écrivez à ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' en précisant votre demande. Nous répondons dans un délai d’un mois, qui peut être prolongé de deux mois si la demande est complexe ; nous vous en informerions alors.',
        ),
        p(
          'Si notre réponse ne vous satisfait pas, vous pouvez saisir la Commission nationale de l’informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou déposer une plainte sur ',
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
          'Ce site ne dépose aucun cookie et n’utilise aucun traceur : ni mesure d’audience, ni pixel publicitaire, ni bouton de réseau social embarqué. Aucun consentement ne vous est donc demandé, et aucune information n’est stockée dans votre navigateur.',
        ),
        p(
          'Si nous ajoutions un jour un outil de mesure d’audience, un bandeau vous permettrait de l’accepter ou de le refuser avant tout dépôt, et cette page serait mise à jour en conséquence.',
        ),
      ],
    },
    {
      titre: 'Sécurité',
      ancre: 'securite',
      corps: [
        p(
          'Les échanges avec ce site sont chiffrés en transit. Les demandes sont enregistrées dans un espace privé, distinct du contenu public du site, et les accès en écriture sont limités à nos serveurs. Nous ne prenons aucune décision automatisée produisant des effets juridiques à votre égard, et ne réalisons aucun profilage.',
        ),
      ],
    },
  ],
};
