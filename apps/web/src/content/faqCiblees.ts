import type { Locale } from '@hgwf/shared';

// Questions-réponses affichées en bas de certaines pages (composant FaqCiblee).
// Les faits viennent de la FAQ Sanity et des pages du site : ne rien ajouter
// ici qui ne soit pas confirmé par l'équipe (délais, prix, zones).
// Toute question doit exister en français ET en anglais.

export type QuestionReponse = { question: string; reponse: string };
type Bloc = { titre: string; lienFaq: string; items: QuestionReponse[] };
type Page = 'devis' | 'suivi' | 'services' | 'contact' | 'transportMaritime';

export const FAQ_CIBLEES: Record<Page, Record<Locale, Bloc>> = {
  devis: {
    fr: {
      titre: 'Questions fréquentes sur le devis',
      lienFaq: 'Toutes les questions fréquentes sur le transport',
      items: [
        {
          question: 'Le devis est-il gratuit ?',
          reponse:
            'Oui. La demande de devis est gratuite et sans engagement. Vous recevez une réponse personnalisée sous 24 à 48 h, avec le prix et les prochaines dates de départ.',
        },
        {
          question: 'Comment est calculé le prix en groupage (LCL) ?',
          reponse:
            'En groupage, le transport est facturé au volume, en mètres cubes. Additionnez le volume de chaque colis (longueur × largeur × hauteur), mesuré au point le plus large — cartons bombés et palettes compris.',
        },
        {
          question: 'Je ne connais pas le volume exact de mon envoi, que faire ?',
          reponse:
            'Donnez une estimation : le formulaire propose des volumes types pour un déménagement ou quelques cartons. L’équipe affine ensuite le chiffrage avec vous avant tout engagement.',
        },
        {
          question: 'Quels documents faut-il prévoir ?',
          reponse:
            'En général : une pièce d’identité, une facture ou une déclaration de valeur, et un inventaire pour les effets personnels. Nos équipes vous aident à constituer le dossier complet.',
        },
        {
          question: 'Pouvez-vous venir chercher mes affaires à domicile ?',
          reponse:
            'Oui, l’enlèvement à domicile peut être organisé partout en France métropolitaine, sur demande. Précisez-le dans votre demande de devis.',
        },
      ],
    },
    en: {
      titre: 'Frequently asked questions about quotes',
      lienFaq: 'All the frequently asked questions about shipping',
      items: [
        {
          question: 'Is the quote free?',
          reponse:
            'Yes. Requesting a quote is free and without obligation. You get a personalised answer within 24 to 48 hours, with the price and the next departure dates.',
        },
        {
          question: 'How is the groupage (LCL) price calculated?',
          reponse:
            'In groupage, transport is billed by volume, in cubic metres. Add up the volume of each package (length × width × height), measured at the widest point — bulging boxes and pallets included.',
        },
        {
          question: 'I don’t know the exact volume of my shipment. What should I do?',
          reponse:
            'Give an estimate: the form offers typical volumes for a removal or a few boxes. The team then refines the price with you before any commitment.',
        },
        {
          question: 'Which documents do I need?',
          reponse:
            'Usually an ID document, an invoice or a declaration of value, and an inventory for personal effects. Our team helps you put the full file together.',
        },
        {
          question: 'Can you collect my belongings from home?',
          reponse:
            'Yes, home pick-up can be arranged anywhere in mainland France on request. Mention it in your quote request.',
        },
      ],
    },
  },

  suivi: {
    fr: {
      titre: 'Questions fréquentes sur le suivi',
      lienFaq: 'Toutes les questions fréquentes sur le transport',
      items: [
        {
          question: 'Où trouver ma référence de suivi ?',
          reponse:
            'L’équipe HGWF Cargo vous communique la référence de votre envoi lors de sa prise en charge. Saisissez-la dans le champ de recherche de cette page.',
        },
        {
          question: 'Combien de temps dure le trajet ?',
          reponse:
            'Environ 3 à 5 semaines vers les Antilles et la Guyane au départ du Havre ou de Fos/Marseille, environ 4 à 6 semaines vers Haïti et la République Dominicaine. Pour l’Amérique du Nord, l’Amérique du Sud et l’Afrique, le délai dépend des rotations.',
        },
        {
          question: 'Ma référence n’affiche rien, que faire ?',
          reponse:
            'Vérifiez la saisie, tirets compris. Si le problème persiste, contactez l’équipe : un suivi personnalisé est assuré et elle vous donne l’état d’avancement de votre envoi.',
        },
      ],
    },
    en: {
      titre: 'Frequently asked questions about tracking',
      lienFaq: 'All the frequently asked questions about shipping',
      items: [
        {
          question: 'Where do I find my tracking reference?',
          reponse:
            'The HGWF Cargo team gives you your shipment reference when it takes charge of your shipment. Enter it in the search field on this page.',
        },
        {
          question: 'How long does the journey take?',
          reponse:
            'About 3 to 5 weeks to the French Caribbean and French Guiana from Le Havre or Fos/Marseille, about 4 to 6 weeks to Haiti and the Dominican Republic. For North America, South America and Africa, the transit time depends on sailing schedules.',
        },
        {
          question: 'My reference shows nothing. What should I do?',
          reponse:
            'Check what you typed, hyphens included. If the problem persists, contact the team: tracking is personalised and they will tell you where your shipment stands.',
        },
      ],
    },
  },

  services: {
    fr: {
      titre: 'Choisir le bon service',
      lienFaq: 'Toutes les questions fréquentes sur le transport',
      items: [
        {
          question: 'Groupage ou conteneur complet : quelle différence ?',
          reponse:
            'En groupage (LCL), plusieurs clients partagent un même conteneur et vous payez au mètre cube. En conteneur complet (FCL), le conteneur 20 ou 40 pieds est réservé à votre envoi et vous payez le conteneur entier.',
        },
        {
          question: 'Quelles marchandises pouvez-vous expédier ?',
          reponse:
            'Du colis personnel à l’équipement professionnel : effets personnels, cartons, palettes, véhicules, engins et bateaux. Certaines marchandises sont interdites ou réglementées (explosifs, gaz, armes, produits chimiques…) : contactez-nous avant l’expédition.',
        },
        {
          question: 'Peut-on expédier un véhicule ou un bateau ?',
          reponse:
            'Oui : véhicules roulants ou non, engins de chantier et bateaux, en conteneur ou en ro-ro. HGWF Cargo vous conseille sur la procédure et les formalités douanières.',
        },
        {
          question: 'Vers quelles destinations livrez-vous ?',
          reponse:
            'Les Antilles françaises (Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy), la Guyane, Haïti, la République Dominicaine, l’Amérique du Nord, l’Amérique du Sud et de nombreux pays d’Afrique francophone. D’autres destinations sont possibles sur devis.',
        },
      ],
    },
    en: {
      titre: 'Choosing the right service',
      lienFaq: 'All the frequently asked questions about shipping',
      items: [
        {
          question: 'Groupage or full container: what is the difference?',
          reponse:
            'In groupage (LCL), several customers share one container and you pay per cubic metre. With a full container (FCL), the 20 or 40-foot container is reserved for your shipment and you pay for the whole container.',
        },
        {
          question: 'What goods can you ship?',
          reponse:
            'From personal parcels to professional equipment: personal effects, boxes, pallets, vehicles, machinery and boats. Some goods are prohibited or restricted (explosives, gas, weapons, chemicals…): contact us before shipping.',
        },
        {
          question: 'Can I ship a vehicle or a boat?',
          reponse:
            'Yes: running or non-running vehicles, construction machinery and boats, in a container or by ro-ro. HGWF Cargo advises you on the procedure and customs formalities.',
        },
        {
          question: 'Which destinations do you serve?',
          reponse:
            'The French Caribbean (Martinique, Guadeloupe, Saint-Martin, Saint-Barthélemy), French Guiana, Haiti, the Dominican Republic, North America, South America and many French-speaking African countries. Other destinations are possible on request.',
        },
      ],
    },
  },

  contact: {
    fr: {
      titre: 'Avant de nous écrire',
      lienFaq: 'Toutes les questions fréquentes sur le transport',
      items: [
        {
          question: 'Sous quel délai répondez-vous ?',
          reponse: 'L’équipe répond aux demandes sous 24 à 48 h, par e-mail ou par téléphone.',
        },
        {
          question: 'Puis-je déposer mes colis à l’agence ?',
          reponse:
            'Oui, le centre logistique de Rosny-sous-Bois accueille les dépôts de colis, cartons et effets personnels, uniquement sur rendez-vous. Prenez contact avant de vous déplacer.',
        },
        {
          question: 'Faut-il passer par le formulaire de devis ?',
          reponse:
            'Pour un prix, le formulaire de devis est le plus rapide : il réunit en quatre étapes tout ce dont l’équipe a besoin. Le formulaire de contact convient aux autres questions.',
        },
      ],
    },
    en: {
      titre: 'Before you write to us',
      lienFaq: 'All the frequently asked questions about shipping',
      items: [
        {
          question: 'How quickly do you reply?',
          reponse: 'The team answers requests within 24 to 48 hours, by e-mail or phone.',
        },
        {
          question: 'Can I drop my parcels off at the agency?',
          reponse:
            'Yes, the Rosny-sous-Bois logistics centre accepts parcels, boxes and personal effects, by appointment only. Get in touch before you come.',
        },
        {
          question: 'Should I use the quote form?',
          reponse:
            'For a price, the quote form is the fastest: in four steps it gathers everything the team needs. The contact form is fine for any other question.',
        },
      ],
    },
  },

  transportMaritime: {
    fr: {
      titre: 'Questions fréquentes sur le transport maritime',
      lienFaq: 'Toutes les questions fréquentes sur le transport',
      items: [
        {
          question: 'Depuis quels ports partent les envois ?',
          reponse:
            'Les envois maritimes partent du Havre et de Fos/Marseille. Les prochaines dates de départ et de clôture vous sont communiquées avec chaque devis.',
        },
        {
          question: 'Quels sont les délais vers les Antilles et la Guyane ?',
          reponse:
            'Environ 3 à 5 semaines au départ du Havre ou de Fos/Marseille. Comptez environ 4 à 6 semaines vers Haïti et la République Dominicaine.',
        },
        {
          question: 'Groupage ou conteneur complet ?',
          reponse:
            'Le groupage (LCL) convient aux particuliers et aux PME dont le volume ne remplit pas un conteneur : vous payez au mètre cube. Le conteneur complet (FCL), 20 ou 40 pieds, dry ou reefer, est réservé à votre seul envoi.',
        },
        {
          question: 'Comment préparer mes colis ?',
          reponse:
            'Établissez un inventaire des effets personnels, mesurez chaque colis au point le plus large pour calculer le volume, et gardez à portée de main une pièce d’identité et une facture ou déclaration de valeur.',
        },
      ],
    },
    en: {
      titre: 'Frequently asked questions about sea freight',
      lienFaq: 'All the frequently asked questions about shipping',
      items: [
        {
          question: 'Which ports do shipments leave from?',
          reponse:
            'Sea shipments leave from Le Havre and Fos/Marseille. The next departure and cut-off dates are given with every quote.',
        },
        {
          question: 'How long does it take to the French Caribbean and French Guiana?',
          reponse:
            'About 3 to 5 weeks from Le Havre or Fos/Marseille. Allow about 4 to 6 weeks to Haiti and the Dominican Republic.',
        },
        {
          question: 'Groupage or full container?',
          reponse:
            'Groupage (LCL) suits individuals and small businesses whose volume does not fill a container: you pay per cubic metre. A full container (FCL), 20 or 40 feet, dry or reefer, is reserved for your shipment alone.',
        },
        {
          question: 'How should I prepare my parcels?',
          reponse:
            'Draw up an inventory of personal effects, measure each package at its widest point to work out the volume, and keep an ID document and an invoice or declaration of value at hand.',
        },
      ],
    },
  },
};
