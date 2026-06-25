import type { SchemaTypeDefinition } from 'sanity';

import { siteSettings } from './singletons/siteSettings';
import { navigation } from './singletons/navigation';
import { footer } from './singletons/footer';

import { hero } from './objects/hero';
import { blocServices } from './objects/blocServices';
import { blocDestinations } from './objects/blocDestinations';
import { blocConteneurs } from './objects/blocConteneurs';
import { bandeauCTA } from './objects/bandeauCTA';
import { faqSection } from './objects/faqSection';
import { temoignages } from './objects/temoignages';
import { texteRiche } from './objects/texteRiche';

import { page } from './documents/page';
import { service } from './documents/service';
import { destination } from './documents/destination';
import { profil } from './documents/profil';
import { faqItem } from './documents/faqItem';
import { temoignage } from './documents/temoignage';

export const schemaTypes: SchemaTypeDefinition[] = [
  // singletons
  siteSettings,
  navigation,
  footer,
  // objects (blocs)
  hero,
  blocServices,
  blocDestinations,
  blocConteneurs,
  bandeauCTA,
  faqSection,
  temoignages,
  texteRiche,
  // documents
  page,
  service,
  destination,
  profil,
  faqItem,
  temoignage,
];
