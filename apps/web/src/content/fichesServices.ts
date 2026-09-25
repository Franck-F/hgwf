import type { Locale } from '@hgwf/shared';

// Contenu éditorial des fiches service (/services/[slug]), en complément du
// titre et du résumé tirés de Sanity. Mêmes règles que faqCiblees.ts : faits
// déjà publiés sur le site uniquement, et parité français / anglais.

type Rubrique = { titre: string; texte: string };
export type FicheService = {
  sections: { titre: string; intro?: string; rubriques: Rubrique[] }[];
  appel: { titre: string; texte: string; bouton: string };
};

export const FICHES_SERVICES: Record<string, Record<Locale, FicheService>> = {
  'transport-maritime': {
    fr: {
      sections: [
        {
          titre: 'Deux formules selon votre volume',
          intro:
            'HGWF Cargo organise vos envois maritimes de bout en bout : enlèvement, dépôt au port, formalités et acheminement jusqu’à destination.',
          rubriques: [
            {
              titre: 'Groupage maritime (LCL)',
              texte:
                'Plusieurs clients partagent un même conteneur : vous ne payez que le volume occupé, au mètre cube. La formule idéale pour les particuliers et les PME qui expédient quelques cartons, des palettes ou des effets personnels.',
            },
            {
              titre: 'Conteneur complet (FCL)',
              texte:
                'Un conteneur 20 ou 40 pieds, dry ou reefer, réservé à votre seul envoi. Adapté aux déménagements complets, aux marchandises professionnelles et aux véhicules.',
            },
          ],
        },
        {
          titre: 'Destinations et délais indicatifs',
          intro: 'Départs du Havre et de Fos/Marseille, avec des transporteurs maritimes partenaires.',
          rubriques: [
            {
              titre: 'Antilles et Guyane',
              texte: 'Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy et Guyane : environ 3 à 5 semaines.',
            },
            { titre: 'Caraïbes', texte: 'Haïti et République Dominicaine : environ 4 à 6 semaines.' },
            {
              titre: 'Amériques et Afrique',
              texte:
                'États-Unis, Canada, Amérique du Sud et de nombreux pays d’Afrique francophone : délai selon les rotations, communiqué avec le devis.',
            },
          ],
        },
      ],
      appel: {
        titre: 'Un envoi à préparer ?',
        texte: 'Devis gratuit en quatre étapes, réponse personnalisée sous 24 à 48 h avec les prochaines dates de départ.',
        bouton: 'Demander un devis',
      },
    },
    en: {
      sections: [
        {
          titre: 'Two options depending on your volume',
          intro:
            'HGWF Cargo handles your sea shipments end to end: pick-up, delivery to the port, formalities and carriage to destination.',
          rubriques: [
            {
              titre: 'Sea groupage (LCL)',
              texte:
                'Several customers share one container: you only pay for the space you use, per cubic metre. The ideal option for individuals and small businesses shipping a few boxes, pallets or personal effects.',
            },
            {
              titre: 'Full container (FCL)',
              texte:
                'A 20 or 40-foot container, dry or reefer, reserved for your shipment alone. Suited to full removals, commercial goods and vehicles.',
            },
          ],
        },
        {
          titre: 'Destinations and indicative transit times',
          intro: 'Departures from Le Havre and Fos/Marseille, with partner shipping lines.',
          rubriques: [
            {
              titre: 'French Caribbean and French Guiana',
              texte: 'Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy and French Guiana: about 3 to 5 weeks.',
            },
            { titre: 'Caribbean', texte: 'Haiti and the Dominican Republic: about 4 to 6 weeks.' },
            {
              titre: 'Americas and Africa',
              texte:
                'United States, Canada, South America and many French-speaking African countries: transit time depends on sailing schedules and is given with the quote.',
            },
          ],
        },
      ],
      appel: {
        titre: 'A shipment to prepare?',
        texte: 'Free quote in four steps, with a personalised answer within 24 to 48 hours and the next departure dates.',
        bouton: 'Request a quote',
      },
    },
  },
};
