import { p, lien } from '@/components/legal/portable';
import type { ContenuLegal } from '@/components/legal/PageLegale';

// Identité issue du registre du commerce (SIREN 940048051), à confirmer par la
// dirigeante avant publication. Les valeurs inconnues sont volontairement
// absentes : une mention légale fausse est pire qu'une mention incomplète.
export const MENTIONS_FR: ContenuLegal = {
  eyebrow: 'Informations légales',
  titrePage: 'Mentions légales.',
  chapo:
    'Informations relatives à l’éditeur du site hgwf-cargo.fr et à son hébergeur, conformément à la loi pour la confiance dans l’économie numérique.',
  dateMaj: '2026-07-21',
  sections: [
    {
      titre: 'Éditeur du site',
      ancre: 'editeur',
      corps: [
        p('HGWF CARGO, société par actions simplifiée.'),
        p('Siège social : avenue Faidherbe, 93110 Rosny-sous-Bois, France.'),
        p('Adresse logistique : 10 rue Diderot, 93110 Rosny-sous-Bois.'),
        p(
          'Courriel : ',
          lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'),
          ' — Téléphone : ',
          lien('+33 6 27 05 69 34', 'tel:+33627056934'),
          '.',
        ),
      ],
    },
    {
      titre: 'Immatriculation',
      ancre: 'immatriculation',
      corps: [
        p('Registre du commerce et des sociétés de Bobigny, sous le numéro 940 048 051.'),
        p('Numéro de TVA intracommunautaire : FR18940048051.'),
        p('Code d’activité : 49.41B — transport routier de fret.'),
      ],
    },
    {
      titre: 'Direction de la publication',
      ancre: 'direction',
      corps: [p('Directrice de la publication : Marie Rioltha Bagassien, présidente.')],
    },
    {
      titre: 'Hébergement',
      ancre: 'hebergement',
      corps: [
        p('Le site est hébergé par OVH SAS.'),
        p('2 rue Kellermann, 59100 Roubaix, France.'),
        p('Téléphone : ', lien('+33 9 72 10 10 07', 'tel:+33972101007'), '.'),
      ],
    },
    {
      titre: 'Propriété intellectuelle',
      ancre: 'propriete-intellectuelle',
      corps: [
        p(
          'L’ensemble des contenus de ce site — textes, images, identité visuelle, logos — est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.',
        ),
      ],
    },
    {
      titre: 'Données personnelles',
      ancre: 'donnees-personnelles',
      corps: [
        p(
          'Le traitement des données collectées sur ce site est décrit dans notre ',
          lien('politique de confidentialité', '/confidentialite'),
          '.',
        ),
      ],
    },
  ],
};
