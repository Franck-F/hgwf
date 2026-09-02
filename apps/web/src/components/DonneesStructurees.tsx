import { SITE_URL } from '@/seo/metadonnees';

// Fiche entreprise en JSON-LD (schema.org), injectée sur toutes les pages.
// Sert le référencement classique (rich results Google) et le référencement
// dans les moteurs IA (GEO) : c'est la source structurée qu'ils citent.
const ORGANISATION = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  '@id': `${SITE_URL}/#organisation`,
  name: 'HGWF Cargo',
  legalName: 'HGWF CARGO',
  url: `${SITE_URL}/fr/`,
  logo: `${SITE_URL}/logos/hgwf-horizontal-couleur.png`,
  image: `${SITE_URL}/photos/conteneurs.jpg`,
  description:
    'Commissionnaire de transport international : maritime, aérien et terrestre vers les Amériques, les Caraïbes et l’Afrique — groupage, conteneur complet, véhicules et déménagement Outre-mer.',
  email: 'contact@hgwf-cargo.fr',
  telephone: '+33 9 62 03 80 13',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Avenue Faidherbe',
    postalCode: '93110',
    addressLocality: 'Rosny-sous-Bois',
    addressCountry: 'FR',
  },
  areaServed: [
    'Martinique',
    'Guadeloupe',
    'Guyane',
    'Saint-Martin',
    'Saint-Barthélemy',
    'Haïti',
    'République Dominicaine',
    'États-Unis',
    'Canada',
    'Amérique du Sud',
    'Afrique',
  ],
  knowsAbout: [
    'Groupage maritime (LCL)',
    'Conteneur complet (FCL)',
    'Transport de véhicules et bateaux',
    'Déménagement Outre-mer',
    'Fret aérien',
    'Vente de conteneurs d’occasion',
  ],
};

export function DonneesStructurees() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION) }}
    />
  );
}
