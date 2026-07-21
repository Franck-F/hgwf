/**
 * Seed de la page Suivi : uploade les photos de la maquette et crée le
 * document « Page Suivi » FR pré-rempli avec les contenus de Suivi.dc.html.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/seed-page-suivi.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';
import { createReadStream } from 'node:fs';
import path from 'node:path';

const client = getCliClient({ apiVersion: '2024-10-01' });

const PHOTOS_DIR = path.resolve(__dirname, '../../../assets/photos');

type ImageRef = { _type: 'image'; asset: { _type: 'reference'; _ref: string } };

async function uploadImage(filename: string): Promise<ImageRef> {
  const filePath = path.join(PHOTOS_DIR, filename);
  const asset = await client.assets.upload('image', createReadStream(filePath), { filename });
  console.log(`  ✓ ${filename} → ${asset._id}`);
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

async function main() {
  console.log(`Projet : ${client.config().projectId} / dataset : ${client.config().dataset}`);
  console.log('Upload des images…');

  const [suiviTablette, entrepot, cargoPort, livraisonPort, lagonPacifique] = await Promise.all([
    uploadImage('suivi-tablette.png'),
    uploadImage('entrepot.png'),
    uploadImage('cargo-port.png'),
    uploadImage('livraison-port.png'),
    uploadImage('lagon-pacifique.png'),
  ]);

  const doc = {
    _id: 'pageSuivi-fr',
    _type: 'pageSuivi',
    language: 'fr',
    titre: "Suivi d'envoi",
    hero: {
      eyebrow: "Suivi d'envoi en temps réel",
      titre: 'Où est votre',
      titreAccent: 'colis',
      description:
        "Référence dossier ou numéro de conteneur : statut, position, navire et ETA — du quai du Havre jusqu'au lagon.",
      placeholderRecherche: 'HGWF-2026-4815 ou MSKU 907 214 3',
      boutonRecherche: 'Suivre',
      noteDemo: 'DONNÉES DE DÉMONSTRATION',
      image: suiviTablette,
    },
    resultat: {
      libelleLatitude: 'LATITUDE',
      libelleLongitude: 'LONGITUDE',
      libelleSignal: 'SIGNAL',
      cartePosition: 'Position',
      carteNavire: 'Navire',
      carteProgression: 'Progression',
      carteEta: 'ETA',
      noteContact: 'Une question sur cet acheminement ?',
      noteContactLien: "Contactez l'équipe — suivi personnalisé par téléphone ou WhatsApp, à tout moment.",
      positionAvantDepart: "LE HAVRE · QUAI DE L'EURE",
      navireAttente: "EN ATTENTE D'EMBARQUEMENT",
      suffixeDebarque: '(DÉBARQUÉ)',
      libelleVitesse: 'VITESSE',
      libelleCap: 'CAP',
    },
    etapes: [
      {
        _key: 'etape-1',
        jalon: 'Pris en charge',
        statut: 'PRIS EN CHARGE',
        position: 'Au centre logistique — Rosny-sous-Bois',
        chipA: 'EMPOTAGE EN COURS',
        chipB: '10 RUE DIDEROT',
        image: entrepot,
      },
      {
        _key: 'etape-2',
        jalon: 'Au port du Havre',
        statut: 'AU PORT',
        position: 'À quai — Le Havre',
        chipA: 'ATTENTE EMBARQUEMENT',
        chipB: "QUAI DE L'EURE",
        image: cargoPort,
      },
      {
        _key: 'etape-3',
        jalon: 'En mer',
        statut: 'EN MER',
        position: 'Position en direct — en mer',
        // pas d'image : le globe WebGL s'affiche à cette étape
      },
      {
        _key: 'etape-4',
        jalon: "Port d'arrivée",
        statut: 'ARRIVÉ AU PORT',
        position: "À quai — port d'arrivée",
        chipA: 'DÉDOUANEMENT',
        chipB: 'TERMINAL CONTENEURS',
        image: livraisonPort,
      },
      {
        _key: 'etape-5',
        jalon: 'Livré',
        statut: 'LIVRÉ',
        position: 'Livré à destination',
        chipA: 'LIVRÉ LE 11/07',
        chipB: 'SIGNATURE REÇUE',
        image: lagonPacifique,
      },
    ],
    portDepart: 'Le Havre',
    trajetsDemo: [
      {
        _key: 'trajet-1',
        destination: 'Pointe-à-Pitre, Guadeloupe',
        destinationCourt: 'POINTE-À-PITRE',
        navire: 'CMA CGM FORT ROYAL',
        positionMer: "ATLANTIQUE · 32°10'N 045°30'W",
        latMer: 32.17,
        lonMer: -45.5,
        latArrivee: 16.24,
        lonArrivee: -61.53,
        cap: 247,
      },
      {
        _key: 'trajet-2',
        destination: 'Fort-de-France, Martinique',
        destinationCourt: 'FORT-DE-FRANCE',
        navire: "CMA CGM FORT FLEUR D'ÉPÉE",
        positionMer: "ATLANTIQUE · 28°42'N 052°06'W",
        latMer: 28.7,
        lonMer: -52.1,
        latArrivee: 14.6,
        lonArrivee: -61.07,
        cap: 243,
      },
      {
        _key: 'trajet-3',
        destination: 'Nouméa, Nouvelle-Calédonie',
        destinationCourt: 'NOUMÉA',
        navire: 'MARFRET NIOLON',
        positionMer: "PACIFIQUE · 12°08'S 168°44'E",
        latMer: -12.13,
        lonMer: 168.73,
        latArrivee: -22.27,
        lonArrivee: 166.44,
        cap: 192,
      },
      {
        _key: 'trajet-4',
        destination: 'Papeete, Tahiti',
        destinationCourt: 'PAPEETE',
        navire: 'ARANUI 5',
        positionMer: "PACIFIQUE · 08°55'S 140°06'W",
        latMer: -8.92,
        lonMer: -140.1,
        latArrivee: -17.53,
        lonArrivee: -149.57,
        cap: 218,
      },
      {
        _key: 'trajet-5',
        destination: 'Mata-Utu, Wallis-et-Futuna',
        destinationCourt: 'MATA-UTU',
        navire: 'SOUTHERN MOANA',
        positionMer: "PACIFIQUE · 13°17'S 176°11'W",
        latMer: -13.28,
        lonMer: -176.18,
        latArrivee: -13.28,
        lonArrivee: -176.17,
        cap: 205,
      },
      {
        _key: 'trajet-6',
        destination: 'Dégrad des Cannes, Guyane',
        destinationCourt: 'DÉGRAD DES CANNES',
        navire: 'CMA CGM AMAZONE',
        positionMer: "ATLANTIQUE · 10°02'N 048°21'W",
        latMer: 10.03,
        lonMer: -48.35,
        latArrivee: 4.85,
        lonArrivee: -52.3,
        cap: 232,
      },
    ],
    voyage: {
      titre: 'Le voyage de votre',
      titreAccent: 'conteneur',
      etapes: [
        {
          _key: 'voyage-1',
          titre: 'Prise en charge',
          texte: 'Dépôt à Rosny-sous-Bois ou enlèvement à domicile, empotage et dossier douane.',
          image: entrepot,
        },
        {
          _key: 'voyage-2',
          titre: 'En mer',
          texte: 'Embarquement au Havre ou à Fos, traversée suivie position par position.',
          image: cargoPort,
        },
        {
          _key: 'voyage-3',
          titre: 'Livraison',
          texte: 'Débarquement, dédouanement et remise à destination — jusqu’au lagon.',
          image: livraisonPort,
        },
      ],
    },
    cta: {
      titre: 'Un envoi à préparer ?',
      sousTitre: 'DEVIS GRATUIT · RÉPONSE SOUS 24–48 H',
      bouton: 'Demander un devis',
      lien: '/contact',
      image: lagonPacifique,
    },
    seoTitre: "Suivi d'envoi — HGWF Cargo",
    seoDescription:
      "Suivez votre envoi HGWF Cargo : statut, position, navire et date d'arrivée estimée, du départ à la livraison.",
  };

  console.log('Création du document « Page Suivi » (FR)…');
  const created = await client.createOrReplace(doc);
  console.log(`  ✓ ${created._id} créé/mis à jour`);
  console.log('Seed terminé.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
